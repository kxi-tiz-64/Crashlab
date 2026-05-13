"""
Extended stock data loading helpers for CrashLab v2.

This module keeps multi-year period support outside the original data_loader.py.
"""
from typing import Dict, Optional

import pandas as pd
import yfinance as yf

from data_loader import NIFTY_500_SYMBOLS, get_random_symbol, prepare_response


VALID_PERIODS = {"1y", "5y", "max"}
MAX_FRONTEND_ROWS = 1000


def _flatten_download_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize yfinance's optional MultiIndex column shape."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
    return df


def _limit_rows(df: pd.DataFrame, period: str) -> pd.DataFrame:
    """Keep frontend chart payloads within the 1000-row performance cap."""
    if len(df) <= MAX_FRONTEND_ROWS:
        return df.reset_index(drop=True)

    if period == "max" and len(df) > 2000:
        positions = [
            round(i * (len(df) - 1) / (MAX_FRONTEND_ROWS - 1))
            for i in range(MAX_FRONTEND_ROWS)
        ]
        return df.iloc[positions].reset_index(drop=True)

    return df.tail(MAX_FRONTEND_ROWS).reset_index(drop=True)


def load_ohlcv_for_period(
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    """
    Fetch OHLCV data using yfinance.download for the selected period.
    """
    safe_period = period if period in VALID_PERIODS else "1y"

    try:
        df = yf.download(
            symbol,
            period=safe_period,
            interval=interval,
            progress=False,
            threads=False,
            auto_adjust=False,
        )
    except Exception as exc:
        print(f"Failed to download {symbol} for {safe_period}: {exc}")
        return None

    if df is None or df.empty:
        return None

    df = _flatten_download_columns(df).dropna()

    required = ["Open", "High", "Low", "Close", "Volume"]
    if not all(col in df.columns for col in required):
        return None

    df = df[required]
    df.columns = ["open", "high", "low", "close", "volume"]
    df["date"] = df.index.strftime("%Y-%m-%d")
    df = df.reset_index(drop=True)

    if len(df) < 30:
        return None

    return _limit_rows(df[["date", "open", "high", "low", "close", "volume"]], safe_period)


def load_ohlcv_for_years(
    symbol: str,
    years: int,
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    """
    Fetch OHLCV data for a specific number of years.
    """
    if years in [1, 2, 5, 10]:
        period_str = f"{years}y"
        return load_ohlcv_for_period(symbol, period_str, interval)
    
    try:
        df = yf.download(
            symbol,
            period="max",
            interval=interval,
            progress=False,
            threads=False,
            auto_adjust=False,
        )
    except Exception as exc:
        print(f"Failed to download {symbol} for max: {exc}")
        return None

    if df is None or df.empty:
        return None

    df = _flatten_download_columns(df).dropna()

    required = ["Open", "High", "Low", "Close", "Volume"]
    if not all(col in df.columns for col in required):
        return None

    df = df[required]
    df.columns = ["open", "high", "low", "close", "volume"]
    
    # Trim to requested years
    cutoff_date = pd.Timestamp.now() - pd.Timedelta(days=years*365)
    df = df[df.index >= cutoff_date]
    
    df["date"] = df.index.strftime("%Y-%m-%d")
    df = df.reset_index(drop=True)

    if len(df) < 30:
        return None

    return _limit_rows(df[["date", "open", "high", "low", "close", "volume"]], "max")


def load_random_stock_for_period(period: str = "1y", years: Optional[int] = None) -> Dict:
    """
    Load a random NIFTY stock for 1y/5y/max periods or custom years with retry and row caps.
    """
    safe_period = period if period in VALID_PERIODS else "1y"
    max_symbol_attempts = min(8, len(NIFTY_500_SYMBOLS))

    for _ in range(max_symbol_attempts):
        symbol = get_random_symbol()
        
        if years is not None:
            df = load_ohlcv_for_years(symbol, years)
        else:
            df = load_ohlcv_for_period(symbol, safe_period)

        if df is not None and len(df) >= 30:
            response = prepare_response(df, symbol)
            response["period"] = "custom" if years is not None else safe_period
            response["row_count"] = len(response["data"])
            return response

    return {
        "error": True,
        "message": "Failed to load stock data from Yahoo Finance after multiple attempts.",
    }
