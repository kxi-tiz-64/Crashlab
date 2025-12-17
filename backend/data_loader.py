"""
Data Loader Module
Fetches random NIFTY 500 stock data from Yahoo Finance
"""
import random
import yfinance as yf
import pandas as pd
from typing import Dict, List, Optional


# NIFTY 500 stock symbols (sample list - in production, use full list)
NIFTY_500_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS",
    "ICICIBANK.NS", "BHARTIARTL.NS", "SBIN.NS", "BAJFINANCE.NS", "LICI.NS",
    "ITC.NS", "KOTAKBANK.NS", "LT.NS", "HCLTECH.NS", "AXISBANK.NS",
    "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS", "ULTRACEMCO.NS", "SUNPHARMA.NS",
    "NESTLEIND.NS", "WIPRO.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS",
    "M&M.NS", "TATAMOTORS.NS", "ADANIENT.NS", "JSWSTEEL.NS", "TATASTEEL.NS",
    "HINDALCO.NS", "COALINDIA.NS", "GRASIM.NS", "DIVISLAB.NS", "BAJAJFINSV.NS",
    "TECHM.NS", "CIPLA.NS", "HEROMOTOCO.NS", "DRREDDY.NS", "EICHERMOT.NS",
    "BPCL.NS", "INDUSINDBK.NS", "ADANIPORTS.NS", "TATACONSUM.NS", "SBILIFE.NS",
    "APOLLOHOSP.NS", "BRITANNIA.NS", "VEDL.NS", "GODREJCP.NS", "DABUR.NS"
]


def get_random_symbol() -> str:
    """Select a random symbol from NIFTY 500 list"""
    return random.choice(NIFTY_500_SYMBOLS)


def load_ohlcv(symbol: str, period: str = "300d", interval: str = "1d") -> Optional[pd.DataFrame]:
    """
    Fetch OHLCV data from Yahoo Finance
    
    Args:
        symbol: Stock ticker symbol
        period: Time period (default: 300d)
        interval: Data interval (default: 1d)
    
    Returns:
        DataFrame with OHLCV data or None if failed
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                continue
            
            # Clean and format data
            df = df.dropna()
            df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
            df.columns = ['open', 'high', 'low', 'close', 'volume']
            df['date'] = df.index.strftime('%Y-%m-%d')
            df = df.reset_index(drop=True)
            
            # Ensure we have enough data
            if len(df) < 30:
                continue
            
            # Select last 300 rows if more than 300
            if len(df) > 300:
                df = df.tail(300).reset_index(drop=True)
            
            return df[['date', 'open', 'high', 'low', 'close', 'volume']]
            
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed to load {symbol} after {max_retries} attempts: {e}")
                return None
            continue
    
    return None


def prepare_response(df: pd.DataFrame, symbol: str) -> Dict:
    """
    Convert DataFrame to API response format
    
    Args:
        df: OHLCV DataFrame
        symbol: Stock symbol
    
    Returns:
        Dictionary with symbol and data array
    """
    data = []
    for _, row in df.iterrows():
        data.append({
            "date": str(row['date']),
            "open": float(row['open']),
            "high": float(row['high']),
            "low": float(row['low']),
            "close": float(row['close']),
            "volume": int(row['volume'])
        })
    
    return {
        "symbol": symbol,
        "data": data
    }


def load_random_stock() -> Dict:
    """
    Load random stock data with retry logic
    
    Returns:
        Dictionary with symbol and OHLCV data
    """
    max_symbol_attempts = 3
    
    for _ in range(max_symbol_attempts):
        symbol = get_random_symbol()
        df = load_ohlcv(symbol)
        
        if df is not None and len(df) >= 30:
            return prepare_response(df, symbol)
    
    # If all attempts fail, return error structure
    return {
        "error": True,
        "message": "Failed to load stock data from Yahoo Finance after multiple attempts."
    }

