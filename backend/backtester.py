"""
Backtesting Engine Module
Professional-grade backtesting with slippage, fees, partial fills, and PnL tracking
"""
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class Position:
    """Position state"""
    qty: int = 0
    avg_price: float = 0.0


@dataclass
class Portfolio:
    """Portfolio state"""
    capital: float = 100000.0
    position: Position = None
    realized_pnl: float = 0.0
    
    def __post_init__(self):
        if self.position is None:
            self.position = Position()


def execute_market_order(
    signal: Dict,
    row: Dict,
    slippage_pct: float,
    fee_pct: float,
    portfolio: Portfolio
) -> Optional[Dict]:
    """
    Execute a market order
    
    Args:
        signal: Signal dictionary
        row: OHLCV row
        slippage_pct: Slippage percentage
        fee_pct: Fee percentage
        portfolio: Portfolio state
    
    Returns:
        Trade log entry or None if failed
    """
    action = signal['action']
    qty = signal.get('qty', 1)
    current_price = float(row['close'])
    volume = int(row['volume'])
    
    # Calculate max fillable quantity (10% of daily volume)
    max_fill_qty = max(1, int(volume * 0.1))
    fill_qty = min(qty, max_fill_qty)
    
    if fill_qty <= 0:
        return None
    
    # Calculate execution price with slippage
    if action == "BUY":
        exec_price = current_price * (1 + slippage_pct)
    else:  # SELL
        exec_price = current_price * (1 - slippage_pct)
    
    # Calculate fee
    fee = exec_price * fill_qty * fee_pct
    
    # Execute trade
    if action == "BUY":
        total_cost = exec_price * fill_qty + fee
        
        if portfolio.capital < total_cost:
            # Insufficient capital
            return None
        
        portfolio.capital -= total_cost
        
        # Update position
        if portfolio.position.qty == 0:
            portfolio.position.avg_price = exec_price
        else:
            # Weighted average
            total_qty = portfolio.position.qty + fill_qty
            portfolio.position.avg_price = (
                (portfolio.position.avg_price * portfolio.position.qty) +
                (exec_price * fill_qty)
            ) / total_qty
        
        portfolio.position.qty += fill_qty
    
    else:  # SELL
        if portfolio.position.qty < fill_qty:
            # Insufficient position
            fill_qty = portfolio.position.qty
            if fill_qty <= 0:
                return None
        
        proceeds = exec_price * fill_qty - fee
        portfolio.capital += proceeds
        
        # Calculate realized PnL
        realized = (exec_price - portfolio.position.avg_price) * fill_qty
        portfolio.realized_pnl += realized
        
        portfolio.position.qty -= fill_qty
        if portfolio.position.qty == 0:
            portfolio.position.avg_price = 0.0
    
    # Create trade log entry
    unrealized_pnl = portfolio.position.qty * (current_price - portfolio.position.avg_price)
    total_pnl = portfolio.realized_pnl + unrealized_pnl
    
    return {
        "date": row['date'],
        "type": action,
        "qty": fill_qty,
        "price": round(exec_price, 2),
        "slippage": round(abs(exec_price - current_price), 2),
        "fee": round(fee, 2),
        "capital": round(portfolio.capital, 2),
        "pnl": round(total_pnl, 2)
    }


def execute_limit_order(
    signal: Dict,
    row: Dict,
    slippage_pct: float,
    fee_pct: float,
    portfolio: Portfolio
) -> Optional[Dict]:
    """
    Execute a limit order
    
    Args:
        signal: Signal dictionary
        row: OHLCV row
        slippage_pct: Slippage percentage (not used for limit orders)
        fee_pct: Fee percentage
        portfolio: Portfolio state
    
    Returns:
        Trade log entry or None if order not filled
    """
    action = signal['action']
    limit_price = signal.get('limit_price')
    
    if limit_price is None:
        # Fall back to market order
        return execute_market_order(signal, row, slippage_pct, fee_pct, portfolio)
    
    limit_price = float(limit_price)
    high = float(row['high'])
    low = float(row['low'])
    
    # Check if limit order can be filled
    if action == "BUY":
        if low > limit_price:
            # Limit price too low, order not filled
            return None
        exec_price = limit_price
    else:  # SELL
        if high < limit_price:
            # Limit price too high, order not filled
            return None
        exec_price = limit_price
    
    # Create modified signal for market order execution
    market_signal = signal.copy()
    market_signal['order_type'] = 'market'
    
    # Temporarily override execution price
    original_close = row['close']
    row['close'] = exec_price
    
    result = execute_market_order(market_signal, row, 0.0, fee_pct, portfolio)
    
    # Restore original close
    row['close'] = original_close
    
    if result:
        result['price'] = exec_price
        result['slippage'] = 0.0
    
    return result


def backtest(
    ohlcv_data: List[Dict],
    signals: List[Dict],
    initial_capital: float = 100000.0,
    slippage_pct: float = 0.001,
    fee_pct: float = 0.00025
) -> Dict:
    """
    Run full backtest
    
    Args:
        ohlcv_data: OHLCV data list
        signals: List of trading signals
        initial_capital: Starting capital
        slippage_pct: Slippage percentage
        fee_pct: Fee percentage
    
    Returns:
        Dictionary with metrics, equity curve, and trade log
    """
    portfolio = Portfolio(capital=initial_capital)
    trade_log = []
    equity_curve = []
    
    # Group signals by index
    signals_by_index = {}
    for signal in signals:
        idx = signal.get('index', 0)
        if idx < 0 or idx >= len(ohlcv_data):
            continue
        if idx not in signals_by_index:
            signals_by_index[idx] = []
        signals_by_index[idx].append(signal)
    
    # Process each day
    for day_idx, row in enumerate(ohlcv_data):
        # Execute signals for this day
        if day_idx in signals_by_index:
            for signal in signals_by_index[day_idx]:
                order_type = signal.get('order_type', 'market')
                
                if order_type == 'limit':
                    trade_entry = execute_limit_order(signal, row, slippage_pct, fee_pct, portfolio)
                else:
                    trade_entry = execute_market_order(signal, row, slippage_pct, fee_pct, portfolio)
                
                if trade_entry:
                    trade_log.append(trade_entry)
        
        # Calculate equity for this day
        current_price = float(row['close'])
        unrealized_pnl = portfolio.position.qty * (current_price - portfolio.position.avg_price)
        equity = portfolio.capital + unrealized_pnl
        
        equity_curve.append({
            "date": row['date'],
            "equity": round(equity, 2)
        })
    
    # Calculate metrics
    metrics = calculate_metrics(equity_curve, trade_log, initial_capital)
    
    return {
        "metrics": metrics,
        "equity_curve": equity_curve,
        "trade_log": trade_log
    }


def calculate_metrics(
    equity_curve: List[Dict],
    trade_log: List[Dict],
    initial_capital: float
) -> Dict:
    """
    Calculate performance metrics
    
    Args:
        equity_curve: Equity curve data
        trade_log: Trade log entries
        initial_capital: Starting capital
    
    Returns:
        Dictionary of metrics
    """
    if not equity_curve:
        return {
            "final_capital": initial_capital,
            "total_pnl": 0.0,
            "win_rate": 0.0,
            "num_trades": 0,
            "max_drawdown": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0
        }
    
    final_capital = equity_curve[-1]['equity']
    total_pnl = final_capital - initial_capital
    
    # Calculate win rate from trade log
    num_trades = len(trade_log)
    wins = 0
    losses = 0
    win_amounts = []
    loss_amounts = []
    
    if num_trades > 0:
        prev_pnl = 0.0
        for trade in trade_log:
            current_pnl = trade['pnl']
            pnl_change = current_pnl - prev_pnl
            
            if pnl_change > 0:
                wins += 1
                win_amounts.append(pnl_change)
            elif pnl_change < 0:
                losses += 1
                loss_amounts.append(abs(pnl_change))
            
            prev_pnl = current_pnl
    
    win_rate = wins / num_trades if num_trades > 0 else 0.0
    avg_win = sum(win_amounts) / len(win_amounts) if win_amounts else 0.0
    avg_loss = sum(loss_amounts) / len(loss_amounts) if loss_amounts else 0.0
    
    # Calculate max drawdown
    peak_equity = initial_capital
    max_drawdown = 0.0
    
    for point in equity_curve:
        equity = point['equity']
        if equity > peak_equity:
            peak_equity = equity
        
        drawdown = (equity - peak_equity) / peak_equity if peak_equity > 0 else 0.0
        if drawdown < max_drawdown:
            max_drawdown = drawdown
    
    return {
        "final_capital": round(final_capital, 2),
        "total_pnl": round(total_pnl, 2),
        "win_rate": round(win_rate, 4),
        "num_trades": num_trades,
        "max_drawdown": round(max_drawdown, 4),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2)
    }

