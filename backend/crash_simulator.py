"""
Crash Simulator Module
Implements three crash simulation models:
1. Spoofing
2. Quote Stuffing
3. Flash Crash
"""
import random
import pandas as pd
import numpy as np
from typing import List, Dict


def validate_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure OHLCV integrity after manipulation
    
    Args:
        df: DataFrame to validate
    
    Returns:
        Validated DataFrame
    """
    # Ensure low <= min(open, close) and high >= max(open, close)
    df['low'] = df[['low', 'open', 'close']].min(axis=1)
    df['high'] = df[['high', 'open', 'close']].max(axis=1)
    
    # Ensure no negative values
    df['open'] = df['open'].clip(lower=0.01)
    df['high'] = df['high'].clip(lower=df['open'])
    df['low'] = df['low'].clip(lower=0.01, upper=df['open'])
    df['close'] = df['close'].clip(lower=0.01)
    df['volume'] = df['volume'].clip(lower=0)
    
    return df


def simulate_spoofing(
    df: pd.DataFrame, 
    intensity: int = 5,
    price_change_pct: float = None,
    volume_multiplier: float = None,
    num_points: int = None
) -> pd.DataFrame:
    """
    Simulate spoofing manipulation
    
    Creates fake volume walls and slight price drift
    
    Args:
        df: OHLCV DataFrame
        intensity: Crash intensity (1-10)
    
    Returns:
        Manipulated DataFrame
    """
    df = df.copy()
    
    if len(df) < 5:
        return df
    
    # Use custom parameters or calculate from intensity
    vol_mult = volume_multiplier if volume_multiplier is not None else (2.0 + 0.5 * intensity)
    price_drift = price_change_pct if price_change_pct is not None else (0.01 + 0.015 * intensity)
    window_len = num_points if num_points is not None else random.choice([3, 4, 5])
    window_len = min(window_len, len(df))
    
    start = random.randint(0, max(0, len(df) - window_len))
    
    for i in range(start, min(start + window_len, len(df))):
        # Volume manipulation
        df.iloc[i, df.columns.get_loc('volume')] *= vol_mult
        
        # Price drift (±)
        drift = price_drift * random.choice([-1, 1])
        current_close = df.iloc[i, df.columns.get_loc('close')]
        new_close = current_close * (1 + drift)
        df.iloc[i, df.columns.get_loc('close')] = new_close
        
        # Update open to maintain consistency
        current_open = df.iloc[i, df.columns.get_loc('open')]
        df.iloc[i, df.columns.get_loc('open')] = current_open * (1 + drift * 0.7)
        
        # Update high/low to reflect the change
        current_high = df.iloc[i, df.columns.get_loc('high')]
        current_low = df.iloc[i, df.columns.get_loc('low')]
        if drift > 0:
            df.iloc[i, df.columns.get_loc('high')] = max(current_high, new_close * 1.01)
        else:
            df.iloc[i, df.columns.get_loc('low')] = min(current_low, new_close * 0.99)
    
    return validate_ohlcv(df)


def simulate_quote_stuffing(
    df: pd.DataFrame, 
    intensity: int = 5,
    max_deviation_pct: float = None,
    volume_shock_multiplier: float = None,
    num_points: int = None
) -> pd.DataFrame:
    """
    Simulate quote stuffing manipulation
    
    Creates abnormal wicks and volume jitter
    
    Args:
        df: OHLCV DataFrame
        intensity: Crash intensity (1-10)
    
    Returns:
        Manipulated DataFrame
    """
    df = df.copy()
    
    if len(df) < 10:
        return df
    
    # Use custom parameters or calculate from intensity
    deviation = max_deviation_pct if max_deviation_pct is not None else (0.02 + 0.03 * intensity)
    vol_shock = volume_shock_multiplier if volume_shock_multiplier is not None else (2.0 + 0.3 * intensity)
    count = num_points if num_points is not None else random.randint(5, min(10, len(df)))
    count = min(count, len(df))
    
    affected_indices = random.sample(range(len(df)), count)
    
    for idx in affected_indices:
        current_close = df.iloc[idx, df.columns.get_loc('close')]
        
        # Widen high/low range
        high_adjustment = current_close * random.uniform(0.01, deviation)
        low_adjustment = current_close * random.uniform(0.01, deviation)
        
        current_high = df.iloc[idx, df.columns.get_loc('high')]
        current_low = df.iloc[idx, df.columns.get_loc('low')]
        
        df.iloc[idx, df.columns.get_loc('high')] = current_high + high_adjustment
        df.iloc[idx, df.columns.get_loc('low')] = max(0.01, current_low - low_adjustment)
        
        # Volume shock
        volume_jitter = random.uniform(0.5, vol_shock)
        current_volume = df.iloc[idx, df.columns.get_loc('volume')]
        df.iloc[idx, df.columns.get_loc('volume')] = current_volume * volume_jitter
    
    return validate_ohlcv(df)


def simulate_flash_crash(
    df: pd.DataFrame, 
    intensity: int = 5,
    price_drop_pct: float = None,
    volatility_spike: float = None,
    crash_duration: int = None,
    recovery_duration: int = None
) -> pd.DataFrame:
    """
    Simulate flash crash manipulation
    
    Creates sudden price collapse followed by recovery
    
    Args:
        df: OHLCV DataFrame
        intensity: Crash intensity (1-10)
    
    Returns:
        Manipulated DataFrame
    """
    df = df.copy()
    
    if len(df) < 10:
        return df
    
    # Use custom parameters or calculate from intensity
    drop_pct = price_drop_pct if price_drop_pct is not None else random.uniform(0.05 * intensity, 0.15 * intensity)
    vol_spike = volatility_spike if volatility_spike is not None else (2.0 + 0.8 * intensity)
    crash_days = crash_duration if crash_duration is not None else random.randint(1, min(3, len(df) // 3))
    recovery_days = recovery_duration if recovery_duration is not None else random.randint(2, min(7, len(df) // 3))
    
    # Select crash start (between 20% and 80% of data)
    start_idx = random.randint(int(len(df) * 0.2), int(len(df) * 0.8))
    crash_days = min(crash_days, len(df) - start_idx)
    recovery_days = min(recovery_days, len(df) - start_idx - crash_days)
    
    # Crash phase
    for i in range(start_idx, min(start_idx + crash_days, len(df))):
        current_close = df.iloc[i, df.columns.get_loc('close')]
        daily_drop = drop_pct / crash_days
        new_close = current_close * (1 - daily_drop)
        
        df.iloc[i, df.columns.get_loc('close')] = new_close
        df.iloc[i, df.columns.get_loc('open')] = new_close * random.uniform(0.98, 1.0)
        df.iloc[i, df.columns.get_loc('low')] = new_close * random.uniform(0.95, 0.98)
        df.iloc[i, df.columns.get_loc('high')] = new_close * random.uniform(1.0, 1.02)
        
        # Volume spike
        current_volume = df.iloc[i, df.columns.get_loc('volume')]
        df.iloc[i, df.columns.get_loc('volume')] = current_volume * vol_spike
    
    # Recovery phase
    for j in range(1, min(recovery_days + 1, len(df) - start_idx - crash_days)):
        idx = start_idx + crash_days + j
        if idx >= len(df):
            break
        
        recovery_factor = j / (recovery_days + 1)
        recovery_amount = recovery_factor * drop_pct * 0.5  # Partial recovery
        
        current_close = df.iloc[idx, df.columns.get_loc('close')]
        new_close = current_close * (1 + recovery_amount)
        
        df.iloc[idx, df.columns.get_loc('close')] = new_close
        df.iloc[idx, df.columns.get_loc('open')] = new_close * random.uniform(0.99, 1.01)
        df.iloc[idx, df.columns.get_loc('low')] = new_close * random.uniform(0.97, 0.99)
        df.iloc[idx, df.columns.get_loc('high')] = new_close * random.uniform(1.01, 1.03)
    
    return validate_ohlcv(df)


def simulate_crash(
    ohlcv_data: List[Dict],
    enable_spoofing: bool = False,
    enable_quote_stuffing: bool = False,
    enable_flash_crash: bool = False,
    intensity: int = 5,
    # Spoofing parameters
    spoofing_price_change_pct: float = None,
    spoofing_volume_multiplier: float = None,
    spoofing_num_points: int = None,
    # Quote stuffing parameters
    quote_stuffing_max_deviation_pct: float = None,
    quote_stuffing_volume_shock: float = None,
    quote_stuffing_num_points: int = None,
    # Flash crash parameters
    flash_crash_price_drop_pct: float = None,
    flash_crash_volatility_spike: float = None,
    flash_crash_duration: int = None,
    flash_crash_recovery_duration: int = None,
    # Multi-attack chaining
    attack_sequence: List[str] = None,
    cumulative_damage: bool = True
) -> List[Dict]:
    """
    Main crash simulation function
    
    Applies selected crash types to OHLCV data
    
    Args:
        ohlcv_data: List of OHLCV dictionaries
        enable_spoofing: Enable spoofing simulation
        enable_quote_stuffing: Enable quote stuffing simulation
        enable_flash_crash: Enable flash crash simulation
        intensity: Crash intensity (1-10)
    
    Returns:
        List of manipulated OHLCV dictionaries
    """
    if not ohlcv_data:
        return []
    
    # Convert to DataFrame
    df = pd.DataFrame(ohlcv_data)
    
    # Ensure numeric types
    numeric_cols = ['open', 'high', 'low', 'close', 'volume']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    df = df.dropna()
    
    if len(df) == 0:
        return []
    
    # Support multi-attack chaining if specified
    if attack_sequence:
        for attack_type in attack_sequence:
            if attack_type == 'spoofing' and enable_spoofing:
                df = simulate_spoofing(
                    df, 
                    intensity,
                    spoofing_price_change_pct,
                    spoofing_volume_multiplier,
                    spoofing_num_points
                )
            elif attack_type == 'quote_stuffing' and enable_quote_stuffing:
                df = simulate_quote_stuffing(
                    df, 
                    intensity,
                    quote_stuffing_max_deviation_pct,
                    quote_stuffing_volume_shock,
                    quote_stuffing_num_points
                )
            elif attack_type == 'flash_crash' and enable_flash_crash:
                df = simulate_flash_crash(
                    df, 
                    intensity,
                    flash_crash_price_drop_pct,
                    flash_crash_volatility_spike,
                    flash_crash_duration,
                    flash_crash_recovery_duration
                )
    else:
        # Apply crash simulations in order (original behavior)
        if enable_spoofing:
            df = simulate_spoofing(
                df, 
                intensity,
                spoofing_price_change_pct,
                spoofing_volume_multiplier,
                spoofing_num_points
            )
        
        if enable_quote_stuffing:
            df = simulate_quote_stuffing(
                df, 
                intensity,
                quote_stuffing_max_deviation_pct,
                quote_stuffing_volume_shock,
                quote_stuffing_num_points
            )
        
        if enable_flash_crash:
            df = simulate_flash_crash(
                df, 
                intensity,
                flash_crash_price_drop_pct,
                flash_crash_volatility_spike,
                flash_crash_duration,
                flash_crash_recovery_duration
            )
    
    # Final validation
    df = validate_ohlcv(df)
    
    # Convert back to list of dictionaries
    result = []
    for _, row in df.iterrows():
        result.append({
            "date": str(row['date']),
            "open": float(row['open']),
            "high": float(row['high']),
            "low": float(row['low']),
            "close": float(row['close']),
            "volume": int(row['volume'])
        })
    
    return result

