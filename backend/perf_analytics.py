"""
Performance analytics extensions for backtest results.
"""
from math import sqrt
from typing import Dict, List


def compute_drawdown_curve(equity_curve: List[Dict]) -> List[float]:
    """
    Compute drawdown[i] = (equity[i] - running_peak) / running_peak.
    """
    drawdowns = []
    peak = None

    for point in equity_curve or []:
        equity = float(point.get("equity", 0.0))
        peak = equity if peak is None else max(peak, equity)
        drawdown = (equity - peak) / peak if peak and peak > 0 else 0.0
        drawdowns.append(round(drawdown, 6))

    return drawdowns


def compute_sharpe_ratio(equity_curve: List[Dict]) -> float:
    """
    Compute daily Sharpe ratio without annualization.
    """
    if not equity_curve or len(equity_curve) < 2:
        return 0.0

    returns = []
    for i in range(1, len(equity_curve)):
        prev = float(equity_curve[i - 1].get("equity", 0.0))
        curr = float(equity_curve[i].get("equity", 0.0))
        if prev > 0:
            returns.append((curr - prev) / prev)

    if not returns:
        return 0.0

    mean_return = sum(returns) / len(returns)
    variance = sum((value - mean_return) ** 2 for value in returns) / len(returns)
    std_return = sqrt(variance)
    return round(mean_return / (std_return + 1e-9), 4)


def _trade_pnl_values(trade_log: List[Dict]) -> List[float]:
    values = []
    previous_pnl = 0.0

    for trade in trade_log or []:
        current_pnl = float(trade.get("pnl", previous_pnl))
        pnl_delta = current_pnl - previous_pnl
        if trade.get("type") == "SELL":
            values.append(round(pnl_delta, 2))
        previous_pnl = current_pnl

    return values


def compute_trade_pnl_histogram(trade_log: List[Dict], bins: int = 10) -> Dict:
    """
    Build a fixed-bin histogram from closed-trade PnL values.
    """
    values = _trade_pnl_values(trade_log)
    if not values:
        return {"bins": [], "counts": []}

    bin_count = max(1, int(bins))
    low = min(values)
    high = max(values)

    if low == high:
        return {"bins": [round(low, 2)], "counts": [len(values)]}

    width = (high - low) / bin_count
    counts = [0] * bin_count

    for value in values:
        idx = int((value - low) / width)
        if idx == bin_count:
            idx -= 1
        counts[idx] += 1

    centers = [low + (i + 0.5) * width for i in range(bin_count)]
    return {
        "bins": [round(center, 2) for center in centers],
        "counts": counts,
    }

def append_performance_analytics(result: Dict) -> Dict:
    """
    Add PRD v2 analytics to a backtest result without mutating backtester.py.
    """
    enriched = dict(result)
    equity_curve = enriched.get("equity_curve", [])
    trade_log = enriched.get("trade_log", [])

    metrics = dict(enriched.get("metrics", {}))
    metrics["sharpe_ratio"] = compute_sharpe_ratio(equity_curve)

    enriched["metrics"] = metrics
    enriched["drawdown_curve"] = compute_drawdown_curve(equity_curve)
    enriched["trade_pnl_distribution"] = compute_trade_pnl_histogram(trade_log, bins=10)
    return enriched
