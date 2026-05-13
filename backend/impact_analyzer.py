"""
Attack impact metrics for original vs. simulated OHLCV data.
"""
from typing import Dict

import pandas as pd


def _daily_returns(df: pd.DataFrame) -> pd.Series:
    if df is None or df.empty or "close" not in df:
        return pd.Series(dtype=float)
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    returns = close.pct_change().dropna()
    return returns.replace([float("inf"), float("-inf")], 0.0)


def _pct_change(original: float, crashed: float) -> float:
    if abs(original) < 1e-12:
        return 0.0
    return ((crashed - original) / original) * 100.0


def compute_impact(original_df: pd.DataFrame, crashed_df: pd.DataFrame) -> Dict:
    """
    Compute volatility and average-return deltas between original and crashed data.
    """
    original_returns = _daily_returns(original_df)
    crash_returns = _daily_returns(crashed_df)

    original_volatility = float(original_returns.std(ddof=0)) if len(original_returns) else 0.0
    crash_volatility = float(crash_returns.std(ddof=0)) if len(crash_returns) else 0.0
    original_avg_return = float(original_returns.mean()) if len(original_returns) else 0.0
    crash_avg_return = float(crash_returns.mean()) if len(crash_returns) else 0.0

    return {
        "original_volatility": round(original_volatility, 6),
        "crash_volatility": round(crash_volatility, 6),
        "volatility_change_pct": round(_pct_change(original_volatility, crash_volatility), 4),
        "original_avg_return": round(original_avg_return, 6),
        "crash_avg_return": round(crash_avg_return, 6),
        "return_change_pct": round(_pct_change(original_avg_return, crash_avg_return), 4),
    }
