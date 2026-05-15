from dotenv import load_dotenv
load_dotenv()

"""
Flask Backend Application
Main API server for Market Crash Simulation & Algorithm Stress Testing Platform
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import csv
import io
import os
import time
import hashlib
import dns.resolver
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from crash_simulator import simulate_crash
from backtester import backtest
from anomaly_detector import compute_anomaly_details, detect_anomalies
from data_loader_extended import VALID_PERIODS, load_random_stock_for_period
from impact_analyzer import compute_impact
from perf_analytics import append_performance_analytics
from strategy_runner import execute_strategy_extended, execute_strategy_expert
from robustness_runner import run_robustness_test, build_robustness_cache_key
import re
from auth import create_token, verify_token, login_required
from database import init_db, create_user, get_user_by_email, get_user_by_id, save_strategy, get_strategies, delete_strategy, check_password, is_user_trusted

from ai_advisor import (
    explain_parameter,
    analyze_simulation_results,
    suggest_strategy,
    explain_chart,
    calculate_severity_score
)

frontend_build_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
app = Flask(__name__, static_folder=frontend_build_dir, static_url_path="/")
CORS(app)  # Enable CORS for React frontend

# Initialize database on startup
with app.app_context():
    init_db()

# In-memory storage for trade logs (in production, use proper session management)
trade_logs_cache = {}
robustness_cache = {}
robustness_rate_limit = {}


def _ohlcv_to_dataframe(ohlcv):
    """Convert API OHLCV payloads to numeric DataFrames for helper modules."""
    df = pd.DataFrame(ohlcv or [])
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    return df.dropna().reset_index(drop=True)


def _prepare_ohlcv_for_simulation(ohlcv):
    """
    Keep core crash_simulator.py untouched while avoiding pandas int64 writes.
    """
    prepared = []
    for row in ohlcv:
        prepared.append({
            "date": row.get("date"),
            "open": float(row.get("open", 0.0)),
            "high": float(row.get("high", 0.0)),
            "low": float(row.get("low", 0.0)),
            "close": float(row.get("close", 0.0)),
            "volume": float(row.get("volume", 0.0)),
        })
    return prepared


def _run_strategy_backtest(strategy, ohlcv, settings, mode='safe', user_id=None, email='unknown'):
    """Run one strategy and return the comparison response shape."""
    strategy_id = strategy.get("id")
    name = strategy.get("name") or f"Strategy {strategy_id}"
    code = strategy.get("code", "")

    if not isinstance(code, str) or not code.strip():
        return {
            "id": strategy_id,
            "name": name,
            "signals": [],
            "backtest": None,
            "error": "Code must be a non-empty string",
        }

    if len(code) > 20000:
        return {
            "id": strategy_id,
            "name": name,
            "signals": [],
            "backtest": None,
            "error": "Code exceeds maximum size (20KB)",
        }

    if mode == 'expert':
        if not user_id or not is_user_trusted(user_id):
            return {
                "id": strategy_id,
                "name": name,
                "signals": [],
                "backtest": None,
                "error": "Forbidden: Expert mode requires trusted user status"
            }
        code_hash = hashlib.md5(code.encode('utf-8')).hexdigest()
        logger.info(f"EXPERT MODE EXECUTION (Compare): User {email} (ID: {user_id}), Hash: {code_hash}")
        strategy_result = execute_strategy_expert(code, ohlcv)
    else:
        strategy_result = execute_strategy_extended(code, ohlcv)
        
    if strategy_result.get("error"):
        return {
            "id": strategy_id,
            "name": name,
            "signals": [],
            "backtest": None,
            "error": strategy_result.get("message", "Strategy execution failed"),
        }

    signals = strategy_result.get("signals", [])
    backtest_result = backtest(
        ohlcv,
        signals,
        settings.get('initial_capital', 100000.0),
        settings.get('slippage_pct', 0.001),
        settings.get('fee_pct', 0.00025)
    )
    backtest_result = append_performance_analytics(backtest_result)

    return {
        "id": strategy_id,
        "name": name,
        "signals": signals,
        "backtest": backtest_result,
        "error": None,
    }


def _cleanup_old_robustness_cache():
    now = time.time()
    stale_keys = [key for key, value in robustness_cache.items() if now - value["created_at"] > 300]
    for key in stale_keys:
        robustness_cache.pop(key, None)


def _check_rate_limit(ip_address):
    now = time.time()
    window_seconds = 60
    limit = 10
    calls = robustness_rate_limit.get(ip_address, [])
    recent_calls = [ts for ts in calls if now - ts < window_seconds]
    if len(recent_calls) >= limit:
        return False
    recent_calls.append(now)
    robustness_rate_limit[ip_address] = recent_calls
    return True

registration_rate_limit = {}

def check_registration_rate_limit(ip_address):
    now = time.time()
    window_seconds = 3600 # 1 hour
    limit = 100 # Adjust as needed
    calls = registration_rate_limit.get(ip_address, [])
    recent_calls = [ts for ts in calls if now - ts < window_seconds]
    if len(recent_calls) >= limit:
        return False
    recent_calls.append(now)
    registration_rate_limit[ip_address] = recent_calls
    return True


@app.route('/api', methods=['GET'])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "name": "Market Crash Simulation & Algorithm Stress Testing Platform API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "GET /health": "Health check endpoint",
            "GET /random_stock": "Fetch random NIFTY 500 stock OHLCV data by period",
            "POST /simulate_crash": "Apply crash simulation to OHLCV data",
            "POST /run_algo": "Execute user-provided Python strategy code",
            "POST /backtest": "Run backtest on strategy signals",
            "POST /compare_strategies": "Run up to 5 strategies on identical OHLCV data",
            "GET /download_trades": "Download trade log as CSV (requires session_id parameter)"
        }
    }), 200


from data_loader_extended import VALID_PERIODS, load_random_stock_for_period, load_ohlcv_for_years
from index_registry import INDICES, get_constituents
import random
from yfinance import Search
from data_loader import prepare_response

# ... (keep existing preparation functions)

@app.route('/indices', methods=['GET'])
def get_indices():
    """Return all index metadata for the frontend dropdown"""
    index_list = []
    for key, meta in INDICES.items():
        index_list.append({
            "key": key,
            "name": meta["name"],
            "country": meta["country"],
            "exchange": meta["exchange"]
        })
    return jsonify(index_list), 200

email_domain_cache = {}

def is_valid_email_domain(email):
    try:
        domain = email.split('@')[1]
        
        if domain in email_domain_cache:
            return email_domain_cache[domain]
            
        whitelist = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']
        if domain in whitelist:
            return True
            
        resolver = dns.resolver.Resolver()
        resolver.timeout = 5.0
        resolver.lifetime = 5.0
        
        answers = resolver.resolve(domain, 'MX')
        is_valid = len(answers) > 0
        email_domain_cache[domain] = is_valid
        return is_valid
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
        if 'domain' in locals():
            email_domain_cache[domain] = False
        return False
    except Exception as e:
        print(f"Error checking MX record for {email}: {e}")
        return False

# Authentication Endpoints
@app.route('/auth/register', methods=['POST'])
def register():
    try:
        ip_address = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        if not check_registration_rate_limit(ip_address):
            return jsonify({'error': True, 'message': 'Too many registration attempts. Please try again later.'}), 429

        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': True, 'message': 'Email and password required'}), 400
        
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({'error': True, 'message': 'Invalid email format'}), 400
        
        if len(password) < 6:
            return jsonify({'error': True, 'message': 'Password must be at least 6 characters'}), 400

        if not is_valid_email_domain(email):
            return jsonify({'error': True, 'message': 'Email domain does not accept mail'}), 400

        user_id = create_user(email, password)
        if not user_id:
            return jsonify({'error': True, 'message': 'Email already registered'}), 409
        
        token = create_token(user_id, email)
        return jsonify({'token': token, 'email': email, 'user_id': user_id}), 201
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': True, 'message': 'An unexpected error occurred during registration.'}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        user = get_user_by_email(email)
        if not user or not check_password(user['password_hash'], password):
            return jsonify({'error': True, 'message': 'Invalid email or password'}), 401
        
        token = create_token(user['id'], email)
        return jsonify({'token': token, 'email': email, 'user_id': user['id']}), 200
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': True, 'message': 'An unexpected error occurred during login.'}), 500

@app.route('/auth/me', methods=['GET'])
@login_required
def get_me():
    user = get_user_by_id(request.user_id)
    if not user:
        return jsonify({'error': True, 'message': 'User not found'}), 404
    trusted = is_user_trusted(request.user_id)
    return jsonify({'email': user['email'], 'user_id': user['id'], 'trusted': trusted}), 200

# Strategy Management Endpoints
@app.route('/strategies/save', methods=['POST'])
@login_required
def save_user_strategy():
    data = request.get_json() or {}
    name = data.get('name', 'Untitled Strategy').strip()
    code = data.get('code', '').strip()

    if not code:
        return jsonify({'error': True, 'message': 'Strategy code is required'}), 400
    
    strat_id = save_strategy(request.user_id, name, code)
    return jsonify({'id': strat_id, 'message': 'Strategy saved successfully'}), 201

@app.route('/strategies/list', methods=['GET'])
@login_required
def list_user_strategies():
    strategies = get_strategies(request.user_id)
    return jsonify(strategies), 200

@app.route('/strategies/delete/<int:strategy_id>', methods=['DELETE'])
@login_required
def delete_user_strategy(strategy_id):
    success = delete_strategy(strategy_id, request.user_id)
    if not success:
        return jsonify({'error': True, 'message': 'Strategy not found or unauthorized'}), 404
    return jsonify({'message': 'Strategy deleted successfully'}), 200

@app.route('/random_stock', methods=['GET'])
def random_stock():
    """Fetch random stock from an index or a specific symbol with configurable period"""
    try:
        years_str = request.args.get('years')
        period = request.args.get('period', '1y')
        index_key = request.args.get('index', 'nifty500')
        specific_symbol = request.args.get('symbol')
        
        years = None
        if years_str == 'max':
            period = 'max'
        elif years_str is not None:
            try:
                years = int(years_str)
                if not (1 <= years <= 20):
                    years = None
            except ValueError:
                pass

        if years is None and period not in VALID_PERIODS:
            return jsonify({
                "error": True,
                "message": "Invalid period. Use one of: 1y, 5y, max, or years=1-20"
            }), 400

        symbol = specific_symbol
        if not symbol:
            constituents = get_constituents(index_key)
            if not constituents:
                return jsonify({
                    "error": True,
                    "message": f"No constituents found for index: {index_key}"
                }), 404
            symbol = random.choice(constituents)

        # Get index/exchange info for the response
        index_meta = INDICES.get(index_key, INDICES['nifty500'])
        
        if specific_symbol:
            # If specific symbol, we might not know its index, but we can try to find it or just use the current index's exchange
            # Better to fetch exchange info if possible, but instructions say "plus index_name and exchange"
            # For specific symbol, we'll use a generic index name or try to match
            index_name = "Search Result"
            exchange = "Various"
            # Try to find if it belongs to any index
            for k, v in INDICES.items():
                if specific_symbol in (v.get("hardcoded_list") or []):
                    index_name = v["name"]
                    exchange = v["exchange"]
                    break
        else:
            index_name = index_meta["name"]
            exchange = index_meta["exchange"]

        if specific_symbol:
            # For specific symbol, we use load_ohlcv_for_years or load_random_stock_for_period logic
            if years is not None:
                df = load_ohlcv_for_years(symbol, years)
            else:
                from data_loader_extended import load_ohlcv_for_period as load_extended_period
                df = load_extended_period(symbol, period)
            
            if df is not None and len(df) >= 30:
                result = prepare_response(df, symbol)
                result["period"] = "custom" if years is not None else period
                result["row_count"] = len(result["data"])
            else:
                return jsonify({
                    "error": True,
                    "message": f"Failed to load data for symbol: {symbol}"
                }), 500
        else:
            result = load_random_stock_for_period(period=period, years=years)
            # load_random_stock_for_period uses get_random_symbol which is hardcoded to Nifty 500
            # We need to override it or use a different path for multi-index
            # Since I can't easily modify data_loader_extended without risk, I'll implement the logic here
            # but wait, load_random_stock_for_period calls get_random_symbol() which is in data_loader.py
            
            # Let's refine the logic to handle random symbol from any index
            max_attempts = 5
            success = False
            for _ in range(max_attempts):
                current_symbol = random.choice(constituents)
                if years is not None:
                    df = load_ohlcv_for_years(current_symbol, years)
                else:
                    from data_loader_extended import load_ohlcv_for_period as load_extended_period
                    df = load_extended_period(current_symbol, period)
                
                if df is not None and len(df) >= 30:
                    result = prepare_response(df, current_symbol)
                    result["period"] = "custom" if years is not None else period
                    result["row_count"] = len(result["data"])
                    symbol = current_symbol
                    success = True
                    break
            
            if not success:
                return jsonify({
                    "error": True,
                    "message": "Failed to load random stock data after multiple attempts."
                }), 500

        result["index_name"] = index_name
        result["exchange"] = exchange
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Failed to load stock data: {str(e)}"
        }), 500

@app.route('/search_stock', methods=['GET'])
def search_stock():
    """Search for stocks using yfinance"""
    try:
        query = request.args.get('q', '')
        max_results = int(request.args.get('max', 10))
        
        if not query:
            return jsonify([]), 200
            
        search = Search(query, max_results=max_results)
        quotes = search.quotes
        
        results = []
        for q in quotes:
            if q.get('quoteType') == 'EQUITY':
                results.append({
                    "symbol": q.get('symbol'),
                    "shortname": q.get('shortname'),
                    "exchange": q.get('exchange'),
                    "exchDisp": q.get('exchDisp'),
                    "typeDisp": q.get('typeDisp')
                })
        
        return jsonify(results), 200
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Search error: {str(e)}"
        }), 500


@app.route('/simulate_crash', methods=['POST'])
def simulate_crash_endpoint():
    """Apply crash simulation to OHLCV data"""
    try:
        data = request.get_json()
        
        if not data or 'ohlcv' not in data:
            return jsonify({
                "error": True,
                "message": "Invalid request: 'ohlcv' field required"
            }), 400
        
        ohlcv = data['ohlcv']
        simulation_ohlcv = _prepare_ohlcv_for_simulation(ohlcv)
        enable_spoofing = data.get('enable_spoofing', False)
        enable_quote_stuffing = data.get('enable_quote_stuffing', False)
        enable_flash_crash = data.get('enable_flash_crash', False)
        intensity = data.get('intensity', 5)
        
        # Validate intensity
        if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
            return jsonify({
                "error": True,
                "message": "Intensity must be an integer between 1 and 10"
            }), 400
        
        # Validate at least one crash type is enabled
        if not (enable_spoofing or enable_quote_stuffing or enable_flash_crash):
            return jsonify({
                "error": True,
                "message": "At least one crash type must be enabled"
            }), 400
        
        # Extract custom parameters (all optional)
        spoofing_params = {
            'spoofing_price_change_pct': data.get('spoofing_price_change_pct'),
            'spoofing_volume_multiplier': data.get('spoofing_volume_multiplier'),
            'spoofing_num_points': data.get('spoofing_num_points'),
        }
        quote_stuffing_params = {
            'quote_stuffing_max_deviation_pct': data.get('quote_stuffing_max_deviation_pct'),
            'quote_stuffing_volume_shock': data.get('quote_stuffing_volume_shock'),
            'quote_stuffing_num_points': data.get('quote_stuffing_num_points'),
        }
        flash_crash_params = {
            'flash_crash_price_drop_pct': data.get('flash_crash_price_drop_pct'),
            'flash_crash_volatility_spike': data.get('flash_crash_volatility_spike'),
            'flash_crash_duration': data.get('flash_crash_duration'),
            'flash_crash_recovery_duration': data.get('flash_crash_recovery_duration'),
        }
        
        # Extract attack sequence if provided
        attack_sequence = data.get('attack_sequence')
        cumulative_damage = data.get('cumulative_damage', True)
        
        # Simulate crash
        manipulated_ohlcv = simulate_crash(
            simulation_ohlcv,
            enable_spoofing,
            enable_quote_stuffing,
            enable_flash_crash,
            intensity,
            attack_sequence=attack_sequence,
            cumulative_damage=cumulative_damage,
            **spoofing_params,
            **quote_stuffing_params,
            **flash_crash_params
        )
        
        if not manipulated_ohlcv:
            return jsonify({
                "error": True,
                "message": "Failed to simulate crash"
            }), 500

        original_df = _ohlcv_to_dataframe(ohlcv)
        manipulated_df = _ohlcv_to_dataframe(manipulated_ohlcv)
        anomalies = detect_anomalies(manipulated_df)
        anomaly_details = compute_anomaly_details(manipulated_df)
        impact = compute_impact(original_df, manipulated_df)
        
        # Generate AI analysis if requested
        ai_analysis = None
        if data.get('include_ai_analysis', False):
            try:
                attack_config = {
                    'enable_spoofing': enable_spoofing,
                    'enable_quote_stuffing': enable_quote_stuffing,
                    'enable_flash_crash': enable_flash_crash
                }
                ai_analysis = analyze_simulation_results(ohlcv, manipulated_ohlcv, attack_config)
            except Exception as e:
                print(f"AI analysis error: {e}")
        
        response = {
            "manipulated_ohlcv": manipulated_ohlcv,
            "anomalies": anomalies,
            "anomaly_details": anomaly_details,
            "impact": impact
        }
        
        if ai_analysis:
            response["ai_analysis"] = ai_analysis
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Crash simulation error: {str(e)}"
        }), 500


@app.route('/run_algo', methods=['POST'])
def run_algo():
    """Execute user-provided Python strategy code"""
    try:
        data = request.get_json()
        
        if not data or 'code' not in data or 'ohlcv' not in data:
            return jsonify({
                "error": True,
                "message": "Invalid request: 'code' and 'ohlcv' fields required"
            }), 400
        
        code = data['code']
        ohlcv = data['ohlcv']
        mode = data.get('mode', 'safe')
        
        if not isinstance(code, str) or len(code) == 0:
            return jsonify({
                "error": True,
                "message": "Code must be a non-empty string"
            }), 400
        
        if len(code) > 20000:  # 20KB limit
            return jsonify({
                "error": True,
                "message": "Code exceeds maximum size (20KB)"
            }), 400
            
        if mode == 'expert':
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': True, 'message': 'Token is missing for expert mode'}), 401
            payload = verify_token(auth_header)
            if not payload:
                return jsonify({'error': True, 'message': 'Token is invalid or expired'}), 401
            
            user_id = payload.get('user_id')
            email = payload.get('email')
            
            if not is_user_trusted(user_id):
                return jsonify({'error': True, 'message': 'Forbidden: Expert mode requires trusted user status'}), 403
                
            code_hash = hashlib.md5(code.encode('utf-8')).hexdigest()
            logger.info(f"EXPERT MODE EXECUTION: User {email} (ID: {user_id}), Hash: {code_hash}, Code snippet: {code[:100]!r}")
            
            result = execute_strategy_expert(code, ohlcv)
            
            if 'error' in result:
                logger.error(f"EXPERT MODE ERROR: User {email}, Error: {result.get('message')}")
                return jsonify(result), 422
            
            logger.info(f"EXPERT MODE SUCCESS: User {email}")
            return jsonify(result), 200
        else:
            # Execute strategy with v2 template context while preserving response shape.
            result = execute_strategy_extended(code, ohlcv)
            if 'error' in result:
                return jsonify(result), 422
            return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Algorithm execution error: {str(e)}"
        }), 500


@app.route('/backtest', methods=['POST'])
def backtest_endpoint():
    """Run backtest on strategy signals"""
    try:
        data = request.get_json()
        
        if not data or 'ohlcv' not in data or 'signals' not in data:
            return jsonify({
                "error": True,
                "message": "Invalid request: 'ohlcv' and 'signals' fields required"
            }), 400
        
        ohlcv = data['ohlcv']
        signals = data['signals']
        settings = data.get('settings', {})
        
        initial_capital = settings.get('initial_capital', 100000.0)
        slippage_pct = settings.get('slippage_pct', 0.001)
        fee_pct = settings.get('fee_pct', 0.00025)
        
        # Validate signal indices
        for signal in signals:
            idx = signal.get('index', -1)
            if idx < 0 or idx >= len(ohlcv):
                return jsonify({
                    "error": True,
                    "message": f"Invalid signal index: {idx}"
                }), 409
        
        # Run backtest
        result = backtest(
            ohlcv,
            signals,
            initial_capital,
            slippage_pct,
            fee_pct
        )
        result = append_performance_analytics(result)
        
        # Store trade log in cache (simple session management)
        import uuid
        session_id = str(uuid.uuid4())
        trade_logs_cache[session_id] = result['trade_log']
        
        result['session_id'] = session_id
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Backtest error: {str(e)}"
        }), 500


@app.route('/compare_strategies', methods=['POST'])
@login_required
def compare_strategies():
    """Run multiple strategies against the same OHLCV data."""
    try:
        data = request.get_json()

        if not data or 'ohlcv' not in data or 'strategies' not in data:
            return jsonify({
                "error": True,
                "message": "Invalid request: 'ohlcv' and 'strategies' fields required"
            }), 400

        ohlcv = data['ohlcv']
        strategies = data['strategies']
        settings = data.get('settings', {})
        mode = data.get('mode', 'safe')

        if not isinstance(strategies, list) or len(strategies) == 0:
            return jsonify({
                "error": True,
                "message": "At least one strategy is required"
            }), 400

        if len(strategies) > 5:
            return jsonify({
                "error": True,
                "message": "A maximum of 5 strategies can be compared"
            }), 400

        user_id = request.user_id
        user = get_user_by_id(user_id)
        email = user['email'] if user else 'unknown'

        with ThreadPoolExecutor(max_workers=min(len(strategies), 5)) as executor:
            results = list(executor.map(
                lambda strategy: _run_strategy_backtest(strategy, ohlcv, settings, mode=mode, user_id=user_id, email=email),
                strategies
            ))

        return jsonify({"results": results}), 200

    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Strategy comparison error: {str(e)}"
        }), 500


@app.route('/robustness_test', methods=['POST'])
@login_required
def robustness_test():
    """Run strategy robustness tests across years and crash intensities."""
    try:
        ip_address = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        if not _check_rate_limit(ip_address):
            return jsonify({
                "error": True,
                "message": "Rate limit exceeded: max 10 robustness tests per minute"
            }), 429

        data = request.get_json() or {}
        code = data.get("code", "")
        strategy_name = data.get("strategy_name", "Untitled Strategy")
        years = data.get("years", 1)
        intensities = data.get("intensities", [1, 3, 5, 7, 10])
        initial_capital = float(data.get("initial_capital", 100000))
        mode = data.get('mode', 'safe')

        if not isinstance(code, str) or not code.strip():
            return jsonify({"error": True, "message": "Code must be a non-empty string"}), 400
        if len(code) > 20000:
            return jsonify({"error": True, "message": "Code exceeds maximum size (20KB)"}), 400
        if not isinstance(intensities, list):
            return jsonify({"error": True, "message": "intensities must be an array"}), 400
        if len(intensities) > 10:
            return jsonify({"error": True, "message": "intensities supports max 10 values"}), 400

        if mode == 'expert' and not is_user_trusted(request.user_id):
            return jsonify({"error": True, "message": "Forbidden: Expert mode requires trusted user status"}), 403

        cache_key = build_robustness_cache_key(code, strategy_name, years, intensities, initial_capital) + f"_{mode}"
        _cleanup_old_robustness_cache()
        cached = robustness_cache.get(cache_key)
        if cached:
            return jsonify(cached["payload"]), 200

        user = get_user_by_id(request.user_id)
        email = user['email'] if user else 'unknown'
        
        result = run_robustness_test(code, strategy_name, years, intensities, initial_capital, mode=mode, user_id=request.user_id, email=email)
        robustness_cache[cache_key] = {
            "payload": result,
            "created_at": time.time(),
            "code_hash": hashlib.md5(code.encode("utf-8")).hexdigest(),
        }
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Robustness test error: {str(e)}"
        }), 500


@app.route('/download_trades', methods=['GET'])
def download_trades():
    """Download trade log as CSV"""
    try:
        session_id = request.args.get('session_id')
        
        if not session_id or session_id not in trade_logs_cache:
            return jsonify({
                "error": True,
                "message": "Session not found"
            }), 404
        
        trade_log = trade_logs_cache[session_id]
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['date', 'type', 'qty', 'price', 'slippage', 'fee', 'capital', 'pnl'])
        
        # Write data
        for trade in trade_log:
            writer.writerow([
                trade['date'],
                trade['type'],
                trade['qty'],
                trade['price'],
                trade['slippage'],
                trade['fee'],
                trade['capital'],
                trade['pnl']
            ])
        
        # Create file-like object
        output.seek(0)
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name='trades.csv'
        )
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"CSV generation error: {str(e)}"
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve React SPA in production while preserving API routes."""
    if path.startswith("api") or path in {
        "random_stock",
        "simulate_crash",
        "run_algo",
        "backtest",
        "compare_strategies",
        "robustness_test",
        "download_trades",
        "health",
    }:
        return jsonify({"error": True, "message": "Route not found"}), 404

    target = os.path.join(app.static_folder, path)
    if path and os.path.exists(target):
        return send_file(target)
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_file(index_path)
    return jsonify({"status": "frontend build not found"}), 404


@app.route('/ai/explain_parameter', methods=['POST'])
def explain_parameter_endpoint():
    """Get AI explanation for a parameter"""
    try:
        data = request.get_json()
        parameter_name = data.get('parameter_name')
        value = data.get('value')
        attack_type = data.get('attack_type')
        
        if not all([parameter_name, value is not None, attack_type]):
            return jsonify({
                "error": True,
                "message": "Missing required fields: parameter_name, value, attack_type"
            }), 400
        
        result = explain_parameter(parameter_name, float(value), attack_type)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Error generating explanation: {str(e)}"
        }), 500


@app.route('/ai/analyze_simulation', methods=['POST'])
def analyze_simulation_endpoint():
    """Analyze simulation results and generate AI insights"""
    try:
        data = request.get_json()
        original_data = data.get('original_data')
        crash_data = data.get('crash_data')
        attack_config = data.get('attack_config', {})
        
        if not original_data or not crash_data:
            return jsonify({
                "error": True,
                "message": "Missing required fields: original_data, crash_data"
            }), 400
        
        result = analyze_simulation_results(original_data, crash_data, attack_config)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Error analyzing simulation: {str(e)}"
        }), 500


@app.route('/ai/suggest_strategy', methods=['POST'])
def suggest_strategy_endpoint():
    """Suggest trading strategies based on simulation"""
    try:
        data = request.get_json()
        attack_config = data.get('attack_config', {})
        metrics = data.get('metrics', {})
        
        result = suggest_strategy(attack_config, metrics)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Error suggesting strategy: {str(e)}"
        }), 500


@app.route('/ai/explain_chart', methods=['POST'])
def explain_chart_endpoint():
    """Get AI explanation for a chart"""
    try:
        data = request.get_json()
        chart_type = data.get('chart_type')
        data_summary = data.get('data_summary', {})
        
        if not chart_type:
            return jsonify({
                "error": True,
                "message": "Missing required field: chart_type"
            }), 400
        
        explanation = explain_chart(chart_type, data_summary)
        return jsonify({"explanation": explanation}), 200
        
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Error explaining chart: {str(e)}"
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get("FLASK_ENV", "development") != "production"
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

