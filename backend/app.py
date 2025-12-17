"""
Flask Backend Application
Main API server for Market Crash Simulation & Algorithm Stress Testing Platform
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import csv
import io
import os
from data_loader import load_random_stock
from crash_simulator import simulate_crash
from algo_sandbox import execute_strategy
from backtester import backtest
from ai_advisor import (
    explain_parameter,
    analyze_simulation_results,
    suggest_strategy,
    explain_chart,
    calculate_severity_score
)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# In-memory storage for trade logs (in production, use proper session management)
trade_logs_cache = {}


@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "name": "Market Crash Simulation & Algorithm Stress Testing Platform API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "GET /health": "Health check endpoint",
            "GET /random_stock": "Fetch random NIFTY 500 stock with 300 days of OHLCV data",
            "POST /simulate_crash": "Apply crash simulation to OHLCV data",
            "POST /run_algo": "Execute user-provided Python strategy code",
            "POST /backtest": "Run backtest on strategy signals",
            "GET /download_trades": "Download trade log as CSV (requires session_id parameter)"
        }
    }), 200


@app.route('/random_stock', methods=['GET'])
def random_stock():
    """Fetch random NIFTY 500 stock with 300 days of OHLCV data"""
    try:
        result = load_random_stock()
        if 'error' in result:
            return jsonify(result), 500
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "error": True,
            "message": f"Failed to load stock data: {str(e)}"
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
            ohlcv,
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
            "manipulated_ohlcv": manipulated_ohlcv
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
        
        # Execute strategy
        result = execute_strategy(code, ohlcv)
        
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
    app.run(host='0.0.0.0', port=port, debug=True)

