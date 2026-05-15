"""
Additive strategy execution wrapper for v2 templates.

The original algo_sandbox.py remains unchanged; this module mirrors its sandbox
settings while exposing the full OHLCV list required by the PRD templates.
"""
import time
import multiprocessing
import traceback
from typing import Dict, List, Optional

from RestrictedPython import compile_restricted, safe_globals
from RestrictedPython.Guards import guarded_iter_unpack_sequence, safe_builtins


class PositionView:
    """Position object that supports both position.qty and position['qty']."""

    def __init__(self):
        self.qty = 0
        self.avg_price = 0.0

    def __getitem__(self, key):
        if key == "qty":
            return self.qty
        if key == "avg_price":
            return self.avg_price
        raise KeyError(key)

    def __repr__(self):
        return f"Position(qty={self.qty}, avg_price={self.avg_price})"


def create_extended_safe_globals():
    """Create safe globals compatible with the existing sandbox plus templates."""
    safe_globals_dict = safe_globals.copy()
    builtins = safe_builtins.copy()
    builtins.update({
        "abs": abs,
        "float": float,
        "int": int,
        "len": len,
        "max": max,
        "min": min,
        "range": range,
        "round": round,
        "sum": sum,
    })
    safe_globals_dict["__builtins__"] = builtins
    safe_globals_dict["_iter_unpack"] = guarded_iter_unpack_sequence
    safe_globals_dict["_getiter_"] = lambda it: it
    safe_globals_dict["_getitem_"] = lambda obj, key: obj[key]
    return safe_globals_dict


def _buy(
    signals: List,
    index: int,
    qty: int,
    order_type: str,
    limit_price: Optional[float],
    position: PositionView,
    row: Dict,
):
    if qty <= 0:
        return
    fill_qty = int(qty)
    signals.append({
        "index": index,
        "action": "BUY",
        "qty": fill_qty,
        "order_type": order_type or "market",
        "limit_price": limit_price,
    })
    price = float(row["close"])
    total_qty = position.qty + fill_qty
    if total_qty > 0:
        position.avg_price = (
            (position.avg_price * position.qty) + (price * fill_qty)
        ) / total_qty
    position.qty = total_qty


def _sell(
    signals: List,
    index: int,
    qty: int,
    order_type: str,
    limit_price: Optional[float],
    position: PositionView,
):
    if qty <= 0 or position.qty <= 0:
        return
    fill_qty = min(int(qty), position.qty)
    signals.append({
        "index": index,
        "action": "SELL",
        "qty": fill_qty,
        "order_type": order_type or "market",
        "limit_price": limit_price,
    })
    position.qty -= fill_qty
    if position.qty == 0:
        position.avg_price = 0.0


def execute_strategy_extended(
    code: str,
    ohlcv_data: List[Dict],
    max_execution_time: float = 1.0,
    max_per_row_time: float = 0.2,
) -> Dict:
    """
    Execute user strategy code row-by-row with access to ohlcv history.
    """
    signals = []
    position = PositionView()

    try:
        byte_code = compile_restricted(code, "<inline>", "exec")
    except SyntaxError as exc:
        return {"error": True, "message": f"SyntaxError: {str(exc)}"}
    except Exception as exc:
        return {"error": True, "message": f"Compilation error: {str(exc)}"}

    safe_globals_dict = create_extended_safe_globals()
    start_time = time.time()

    for index, row in enumerate(ohlcv_data):
        row_start_time = time.time()

        if time.time() - start_time > max_execution_time:
            return {
                "error": True,
                "message": f"Execution timeout: exceeded {max_execution_time}s",
            }

        def make_buy_func(idx, current_row):
            def buy_func(qty=1, order_type="market", limit_price=None):
                _buy(signals, idx, qty, order_type, limit_price, position, current_row)
            return buy_func

        def make_sell_func(idx):
            def sell_func(qty=1, order_type="market", limit_price=None):
                _sell(signals, idx, qty, order_type, limit_price, position)
            return sell_func

        local_env = {
            "row": row,
            "index": index,
            "ohlcv": ohlcv_data,
            "current_price": float(row["close"]),
            "position": position,
            "buy": make_buy_func(index, row),
            "sell": make_sell_func(index),
        }
        exec_env = {**safe_globals_dict, **local_env}

        try:
            exec(byte_code, exec_env, local_env)
        except Exception as exc:
            return {
                "error": True,
                "message": f"Execution error at row {index}: {str(exc)}",
            }

        if time.time() - row_start_time > max_per_row_time:
            return {
                "error": True,
                "message": f"Row execution timeout: exceeded {max_per_row_time}s at row {index}",
            }

    return {"signals": signals}


def _expert_worker(code: str, ohlcv_data: List[Dict], queue: multiprocessing.Queue):
    """Worker function for executing expert mode python code in isolation."""
    signals = []
    position = PositionView()
    
    try:
        byte_code = compile(code, "<inline>", "exec")
    except SyntaxError as exc:
        queue.put({"error": True, "message": f"SyntaxError: {str(exc)}"})
        return
    except Exception as exc:
        queue.put({"error": True, "message": f"Compilation error: {str(exc)}"})
        return
        
    global_env = {"__builtins__": __builtins__}
    
    for index, row in enumerate(ohlcv_data):
        def make_buy_func(idx, current_row):
            def buy_func(qty=1, order_type="market", limit_price=None):
                _buy(signals, idx, qty, order_type, limit_price, position, current_row)
            return buy_func

        def make_sell_func(idx):
            def sell_func(qty=1, order_type="market", limit_price=None):
                _sell(signals, idx, qty, order_type, limit_price, position)
            return sell_func

        local_env = {
            "row": row,
            "index": index,
            "ohlcv": ohlcv_data,
            "current_price": float(row["close"]),
            "position": position,
            "buy": make_buy_func(index, row),
            "sell": make_sell_func(index),
        }
        
        exec_env = {**global_env, **local_env}
        
        try:
            exec(byte_code, exec_env, local_env)
        except Exception as exc:
            queue.put({
                "error": True,
                "message": f"Execution error at row {index}: {str(exc)}\n{traceback.format_exc()}"
            })
            return
            
    queue.put({"signals": signals})

def execute_strategy_expert(code: str, ohlcv_data: List[Dict], timeout_seconds: float = 5.0) -> Dict:
    """Execute strategy using full Python execution via multiprocessing."""
    q = multiprocessing.Queue()
    p = multiprocessing.Process(target=_expert_worker, args=(code, ohlcv_data, q))
    p.start()
    p.join(timeout_seconds)
    
    if p.is_alive():
        p.terminate()
        p.join()
        return {"error": True, "message": f"Expert execution timeout: exceeded {timeout_seconds}s"}
    
    try:
        return q.get_nowait()
    except Exception:
        if p.exitcode != 0:
            return {"error": True, "message": f"Process crashed with exit code {p.exitcode}"}
        return {"error": True, "message": "No result returned from expert process"}
