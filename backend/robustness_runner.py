"""
Robustness runner for CrashLab v3.

Additive helper that keeps backtester.py and crash_simulator.py untouched.
"""
from __future__ import annotations

import hashlib
import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Tuple
import statistics
import math

from backtester import backtest
from crash_simulator import simulate_crash
from data_loader_extended import load_random_stock_for_period
from perf_analytics import append_performance_analytics
from strategy_runner import execute_strategy_extended, execute_strategy_expert
from database import is_user_trusted
import logging

logger = logging.getLogger(__name__)


def _prepare_ohlcv_for_simulation(ohlcv: List[Dict]) -> List[Dict]:
    prepared = []
    for row in ohlcv:
        prepared.append(
            {
                "date": row.get("date"),
                "open": float(row.get("open", 0.0)),
                "high": float(row.get("high", 0.0)),
                "low": float(row.get("low", 0.0)),
                "close": float(row.get("close", 0.0)),
                "volume": float(row.get("volume", 0.0)),
            }
        )
    return prepared


def _normalize_inputs(years, intensities) -> Tuple[str, List[int]]:
    normalized_years = str(years or "1y")
    ints = [int(v) for v in (intensities or [1, 5, 10])]
    # Ensure 0 is always present as baseline
    if 0 not in ints:
        ints.append(0)
    normalized_intensities = sorted(list(set(ints)))
    return normalized_years, normalized_intensities


def _calculate_scenario_metrics(equity_curve: List[Dict], max_drawdown: float) -> Tuple[float, float, float]:
    """Calculate Sharpe, Sortino and Calmar for a single scenario's equity curve."""
    if len(equity_curve) < 2:
        return 0.0, 0.0, 0.0
    
    returns = []
    for i in range(1, len(equity_curve)):
        prev = equity_curve[i-1]["equity"]
        curr = equity_curve[i]["equity"]
        if prev > 0:
            returns.append((curr - prev) / prev)
        else:
            returns.append(0.0)
            
    if not returns:
        return 0.0, 0.0, 0.0
        
    mean_ret = sum(returns) / len(returns)
    std_ret = statistics.stdev(returns) if len(returns) > 1 else 1e-9
    
    # Sharpe
    sharpe = mean_ret / std_ret if std_ret > 0 else 0.0
    
    # Sortino
    downside_returns = [r for r in returns if r < 0]
    if downside_returns:
        downside_std = (sum(r**2 for r in downside_returns) / len(returns))**0.5
        sortino = mean_ret / downside_std if downside_std > 0 else 0.0
    else:
        sortino = sharpe * 2.0 if sharpe > 0 else sharpe
        
    # Calmar (mean daily return / abs(max_drawdown))
    abs_mdd = abs(max_drawdown)
    calmar = mean_ret / abs_mdd if abs_mdd > 1e-9 else (mean_ret / 0.001) # fallback for zero DD
    
    return sharpe, sortino, calmar


def _run_one_scenario(code: str, period: str, intensity: int, initial_capital: float, base_data: List[Dict], mode: str = 'safe', user_id=None, email='unknown') -> Dict:
    if intensity <= 0:
        manipulated = base_data
    else:
        manipulated = simulate_crash(
            _prepare_ohlcv_for_simulation(base_data),
            True,
            True,
            True,
            int(intensity),
            cumulative_damage=True,
        )

    if mode == 'expert':
        if not user_id or not is_user_trusted(user_id):
            raise ValueError("Forbidden: Expert mode requires trusted user status")
        code_hash = hashlib.md5(code.encode('utf-8')).hexdigest()
        logger.info(f"EXPERT MODE EXECUTION (Robustness): User {email} (ID: {user_id}), Hash: {code_hash}, Intensity: {intensity}")
        strategy_result = execute_strategy_expert(code, manipulated)
    else:
        strategy_result = execute_strategy_extended(code, manipulated)

    if strategy_result.get("error"):
        raise ValueError(strategy_result.get("message", "Strategy execution failed"))

    bt = backtest(manipulated, strategy_result.get("signals", []), initial_capital, 0.001, 0.00025)
    bt = append_performance_analytics(bt)
    metrics = bt.get("metrics", {})
    equity_curve = bt.get("equity_curve", [])
    
    max_dd = float(metrics.get("max_drawdown", 0.0))
    sharpe, sortino, calmar = _calculate_scenario_metrics(equity_curve, max_dd)
    
    return {
        "period": period,
        "intensity": intensity,
        "metrics": {
            "final_capital": float(metrics.get("final_capital", 0.0)),
            "total_pnl": float(metrics.get("total_pnl", 0.0)),
            "max_drawdown": max_dd,
            "win_rate": float(metrics.get("win_rate", 0.0)),
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "calmar_ratio": calmar,
            "num_trades": int(metrics.get("num_trades", 0)),
        },
        "equity_curve": equity_curve,
    }


def _compute_score(results: List[Dict]) -> Tuple[float, Dict]:
    if not results:
        return 0.0, {
            "robustness_score": 0.0,
            "sharpe_component": 0.0,
            "sortino_component": 0.0,
            "calmar_component": 0.0,
            "baseline_sharpe": 0.0,
            "baseline_sortino": 0.0,
            "baseline_calmar": 0.0
        }

    # Find baseline
    baseline = next((r for r in results if r["intensity"] == 0), results[0])
    b_m = baseline["metrics"]
    b_sharpe = b_m["sharpe_ratio"]
    b_sortino = b_m["sortino_ratio"]
    b_calmar = b_m["calmar_ratio"]

    def logistic(x):
        # logistic(x) = 1 / (1 + exp(-3 * x))
        try:
            return 1 / (1 + math.exp(-3 * x))
        except OverflowError:
            return 0.0 if x < 0 else 1.0

    r_s_list = []
    l_sharpes = []
    l_sortinos = []
    l_calmars = []
    
    eps = 1e-9
    for r in results:
        m = r["metrics"]
        rel_s = m["sharpe_ratio"] / (abs(b_sharpe) + eps)
        rel_so = m["sortino_ratio"] / (abs(b_sortino) + eps)
        rel_ca = m["calmar_ratio"] / (abs(b_calmar) + eps)
        
        ls = logistic(rel_s)
        lso = logistic(rel_so)
        lca = logistic(rel_ca)
        
        l_sharpes.append(ls)
        l_sortinos.append(lso)
        l_calmars.append(lca)
        
        rs = (ls * lso * lca)**(1/3)
        r_s_list.append(rs)

    avg_rs = sum(r_s_list) / len(r_s_list)
    
    # Consistency penalty using standard deviation of scenario composite scores
    score_std = statistics.stdev(r_s_list) if len(r_s_list) > 1 else 0.0
    penalty = 1 - min(score_std * 1, 0.3)
    final_score = avg_rs * penalty

    return round(final_score, 4), {
        "sharpe_component": round(sum(l_sharpes) / len(l_sharpes), 4),
        "sortino_component": round(sum(l_sortinos) / len(l_sortinos), 4),
        "calmar_component": round(sum(l_calmars) / len(l_calmars), 4),
        "baseline_sharpe": round(b_sharpe, 4),
        "baseline_sortino": round(b_sortino, 4),
        "baseline_calmar": round(b_calmar, 4),
        "score_std": round(score_std, 4)
    }


def build_robustness_cache_key(code, name, years, intensities, capital):
    raw = json.dumps([code, years, intensities, capital], sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


def run_robustness_test(code, strategy_name, years, intensities, initial_capital, mode='safe', user_id=None, email='unknown') -> dict:
    years_norm, intensities_norm = _normalize_inputs(years, intensities)

    payload = load_random_stock_for_period(years_norm)
    if payload.get("error"):
        raise ValueError(payload.get("message", f"Failed to load stock for period {years_norm}"))
    
    base_data = payload.get("data", [])
    symbol = payload.get("symbol", "UNKNOWN")

    combos = [(years_norm, intensity) for intensity in intensities_norm]

    def worker(combo):
        period, intensity = combo
        return _run_one_scenario(code, period, intensity, float(initial_capital), base_data, mode=mode, user_id=user_id, email=email)

    started = time.time()
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(worker, combos))

    score, components = _compute_score(results)
    return {
        "strategy_name": strategy_name,
        "symbol": symbol,
        "run_id": str(uuid.uuid4()),
        "results": results,
        "robustness_score": round(score, 4),
        "score_components": components,
        "runtime_ms": int((time.time() - started) * 1000),
    }
