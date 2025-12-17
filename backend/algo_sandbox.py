"""
Algorithm Sandbox Module
Safely executes user-provided Python trading strategies using RestrictedPython
"""
import time
from RestrictedPython import compile_restricted, safe_globals, RestrictingNodeTransformer
from RestrictedPython.Guards import safe_builtins, guarded_iter_unpack_sequence
from typing import List, Dict, Optional, Any


class Position:
    """Position state object exposed to user code"""
    def __init__(self):
        self.qty = 0
        self.avg_price = 0.0
    
    def __repr__(self):
        return f"Position(qty={self.qty}, avg_price={self.avg_price})"


class SandboxError(Exception):
    """Custom exception for sandbox errors"""
    pass


def create_safe_globals():
    """Create safe globals dictionary for RestrictedPython"""
    safe_globals_dict = safe_globals.copy()
    safe_globals_dict['__builtins__'] = safe_builtins.copy()
    safe_globals_dict['_iter_unpack'] = guarded_iter_unpack_sequence
    safe_globals_dict['_getiter_'] = lambda it: it
    safe_globals_dict['_getitem_'] = lambda obj, key: obj[key]
    return safe_globals_dict


def execute_strategy(
    code: str,
    ohlcv_data: List[Dict],
    max_execution_time: float = 1.0,
    max_per_row_time: float = 0.2
) -> Dict:
    """
    Execute user strategy code row-by-row
    
    Args:
        code: User-provided Python code
        ohlcv_data: OHLCV data list
        max_execution_time: Maximum total execution time (seconds)
        max_per_row_time: Maximum time per row (seconds)
    
    Returns:
        Dictionary with signals or error
    """
    signals = []
    position = Position()
    
    # Compile code with RestrictedPython
    try:
        byte_code = compile_restricted(code, '<inline>', 'exec')
    except SyntaxError as e:
        return {
            "error": True,
            "message": f"SyntaxError: {str(e)}"
        }
    except Exception as e:
        return {
            "error": True,
            "message": f"Compilation error: {str(e)}"
        }
    
    # Create safe execution environment
    safe_globals_dict = create_safe_globals()
    
    start_time = time.time()
    
    # Execute for each row
    for index, row in enumerate(ohlcv_data):
        row_start_time = time.time()
        
        # Check total execution time
        if time.time() - start_time > max_execution_time:
            return {
                "error": True,
                "message": f"Execution timeout: exceeded {max_execution_time}s"
            }
        
        # Create row-specific environment with proper closures
        def make_buy_func(idx):
            def buy_func(qty=1, order_type="market", limit_price=None):
                _buy(signals, idx, qty, order_type, limit_price)
            return buy_func
        
        def make_sell_func(idx):
            def sell_func(qty=1, order_type="market", limit_price=None):
                _sell(signals, idx, qty, order_type, limit_price, position)
            return sell_func
        
        local_env = {
            'row': row,
            'index': index,
            'current_price': float(row['close']),
            'position': position,
            'buy': make_buy_func(index),
            'sell': make_sell_func(index)
        }
        
        # Merge with safe globals
        exec_env = {**safe_globals_dict, **local_env}
        
        try:
            # Execute user code
            exec(byte_code, exec_env, local_env)
        except Exception as e:
            return {
                "error": True,
                "message": f"Execution error at row {index}: {str(e)}"
            }
        
        # Check per-row execution time
        row_time = time.time() - row_start_time
        if row_time > max_per_row_time:
            return {
                "error": True,
                "message": f"Row execution timeout: exceeded {max_per_row_time}s at row {index}"
            }
    
    return {
        "signals": signals
    }


def _buy(signals: List, index: int, qty: int, order_type: str, limit_price: Optional[float]):
    """Internal buy function called from sandbox"""
    if qty <= 0:
        return
    signals.append({
        "index": index,
        "action": "BUY",
        "qty": int(qty),
        "order_type": order_type or "market",
        "limit_price": limit_price
    })


def _sell(signals: List, index: int, qty: int, order_type: str, limit_price: Optional[float], position: Position):
    """Internal sell function called from sandbox"""
    if qty <= 0:
        return
    signals.append({
        "index": index,
        "action": "SELL",
        "qty": int(qty),
        "order_type": order_type or "market",
        "limit_price": limit_price
    })

