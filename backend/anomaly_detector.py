"""
Statistical anomaly detection for simulated OHLCV data.
"""
from typing import Dict, List

import pandas as pd


THRESHOLD = 3.0


def _z_scores(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce").replace([float("inf"), float("-inf")], pd.NA)
    valid = numeric.dropna()
    std = valid.std(ddof=0)
    if std == 0 or pd.isna(std):
        return pd.Series([0.0] * len(numeric), index=numeric.index)
    return ((numeric - valid.mean()) / std).fillna(0.0)


def compute_anomaly_details(df: pd.DataFrame) -> List[Dict]:
    """
    Return anomaly objects with row index, z-scores, and flagging reason.
    """
    if df is None or df.empty or "close" not in df or "volume" not in df:
        return []

    work = df.copy()
    close = pd.to_numeric(work["close"], errors="coerce")
    volume = pd.to_numeric(work["volume"], errors="coerce")

    returns = close.pct_change()
    return_z = _z_scores(returns)
    volume_z = _z_scores(volume)

    details = []
    for pos, idx in enumerate(work.index):
        rz = float(return_z.iloc[pos])
        vz = float(volume_z.iloc[pos])
        price_flag = abs(rz) > THRESHOLD
        volume_flag = abs(vz) > THRESHOLD

        if not (price_flag or volume_flag):
            continue

        if price_flag and volume_flag:
            reason = "price and volume spike"
        elif price_flag:
            reason = "price spike"
        else:
            reason = "volume spike"

        details.append({
            "index": int(idx) if isinstance(idx, int) else pos,
            "date": str(work.iloc[pos].get("date", "")),
            "return_z": round(rz, 4),
            "volume_z": round(vz, 4),
            "reason": reason,
        })

    return details


def detect_anomalies(df: pd.DataFrame) -> List[int]:
    """
    Returns list of row indices where anomalies are detected.
    """
    return [item["index"] for item in compute_anomaly_details(df)]
