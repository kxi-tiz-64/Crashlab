# Market Crash Simulation & Algorithm Stress Testing Platform

A professional-grade web platform for testing trading algorithms against synthetic market crash scenarios. This platform allows traders, quants, and researchers to:

- Generate realistic synthetic stock market crashes (Spoofing, Quote Stuffing, Flash Crash)
- Write custom Python trading strategies in a secure sandbox
- Run professional-grade backtests with slippage, fees, and partial fills
- Analyze algorithm performance under extreme market conditions

## Features

### Core Capabilities

1. **Random Stock Data Loading**
   - Fetches 300 days of OHLCV data from Yahoo Finance
   - Random selection from NIFTY 500 stocks
   - Automatic data validation and cleaning

2. **Crash Simulation Engine**
   - **Spoofing**: Fake volume walls and price drift
   - **Quote Stuffing**: Abnormal wicks and volume jitter
   - **Flash Crash**: Sudden price collapse with recovery
   - Configurable intensity (1-10)

3. **Algorithm Sandbox**
   - Secure Python execution using RestrictedPython
   - Row-by-row strategy execution
   - Exposed API: `buy()`, `sell()`, `position`, `row`, `current_price`
   - Timeout protection and security hardening

4. **Professional Backtesting**
   - Market and limit orders
   - Realistic slippage modeling
   - Fee calculation
   - Partial fill logic (10% of daily volume)
   - Capital and PnL tracking
   - Equity curve generation

5. **Visualization & Analysis**
   - OHLCV price charts
   - Buy/sell signal markers
   - Equity curve visualization
   - Performance metrics dashboard
   - Trade log table
   - CSV export

## Project Structure

```
.
├── backend/
│   ├── app.py                 # Flask API server
│   ├── data_loader.py          # Stock data fetching
│   ├── crash_simulator.py     # Crash simulation models
│   ├── algo_sandbox.py         # Secure code execution
│   ├── backtester.py           # Backtesting engine
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # React pages
│   │   │   ├── LoadStockPage.js
│   │   │   ├── CrashSimulatorPage.js
│   │   │   ├── AlgoEditorPage.js
│   │   │   └── BacktestResultsPage.js
│   │   ├── components/        # React components
│   │   │   ├── OhlcvChart.js
│   │   │   └── EquityCurveChart.js
│   │   ├── api/               # API client
│   │   │   └── apiClient.js
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will start on `http://localhost:3000`

### Environment Variables

**Backend:**
- `PORT` - Flask server port (default: 5000)

**Frontend:**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)

## Usage Guide

### 1. Load Stock Data

- Click "Load Random Stock" to fetch 300 days of OHLCV data
- View the price chart
- Proceed to crash simulation

### 2. Simulate Crash

- Select one or more crash types:
  - **Spoofing**: Creates fake volume pressure
  - **Quote Stuffing**: Generates abnormal volatility
  - **Flash Crash**: Simulates sudden collapse
- Adjust intensity slider (1-10)
- Click "Run Crash Simulation"
- Compare original vs simulated data

### 3. Write Algorithm

- Use the Monaco code editor to write Python strategy
- Available functions:
  - `buy(qty=1)` - Place buy order
  - `sell(qty=1)` - Place sell order
  - `position` - Current position (qty, avg_price)
  - `row` - Current OHLCV row dictionary
  - `current_price` - Current close price
  - `index` - Current row index

**Example Strategy:**
```python
# Buy on red days, sell on green days
if row['close'] < row['open']:
    buy()
elif row['close'] > row['open'] * 1.02:
    sell()
```

- Click "Run Strategy Logic"
- View buy/sell signals on chart
- Backtest runs automatically

### 4. Analyze Results

- View performance metrics:
  - Final Capital
  - Total PnL
  - Win Rate
  - Max Drawdown
  - Average Win/Loss
- Examine equity curve
- Review trade log
- Download CSV export

## API Endpoints

### `GET /random_stock`
Fetch random NIFTY 500 stock with OHLCV data

**Response:**
```json
{
  "symbol": "TATAMOTORS.NS",
  "data": [
    {
      "date": "2024-01-01",
      "open": 100.0,
      "high": 110.0,
      "low": 95.0,
      "close": 105.0,
      "volume": 1500000
    }
  ]
}
```

### `POST /simulate_crash`
Apply crash simulation to OHLCV data

**Request:**
```json
{
  "ohlcv": [...],
  "enable_spoofing": true,
  "enable_quote_stuffing": false,
  "enable_flash_crash": true,
  "intensity": 7
}
```

### `POST /run_algo`
Execute user strategy code

**Request:**
```json
{
  "code": "if row['close'] < row['open']: buy()",
  "ohlcv": [...]
}
```

### `POST /backtest`
Run backtest on signals

**Request:**
```json
{
  "ohlcv": [...],
  "signals": [...],
  "settings": {
    "initial_capital": 100000,
    "slippage_pct": 0.001,
    "fee_pct": 0.00025
  }
}
```

### `GET /download_trades?session_id=<uuid>`
Download trade log as CSV

## Security Features

- **RestrictedPython Sandbox**: Prevents unsafe code execution
- **Timeout Protection**: 1s total, 200ms per row
- **Input Validation**: All API inputs validated
- **No File System Access**: Sandbox cannot access files
- **No Network Access**: Sandbox cannot make network calls
- **No OS Access**: System commands blocked

## Performance Targets

- Stock data load: < 1.5s
- Crash simulation: < 500ms
- Algorithm execution: < 1.0s
- Backtest execution: < 400ms

## Technology Stack

**Backend:**
- Flask (Python web framework)
- pandas, numpy (Data processing)
- yfinance (Market data)
- RestrictedPython (Code sandbox)

**Frontend:**
- React 18
- Chart.js (Visualization)
- Monaco Editor (Code editor)
- Axios (HTTP client)

## Limitations & Future Enhancements

**Current Limitations:**
- MVP supports 300 rows of OHLCV data
- Single-asset backtesting only
- No user authentication
- In-memory session storage

**Future Enhancements:**
- Tick-level data simulation
- Multi-asset portfolio backtesting
- Strategy optimization engine
- User accounts and strategy library
- PDF report generation
- Additional crash models

## License

This project is for educational and research purposes. Yahoo Finance data usage must comply with their terms of service.

## Contributing

This is a prototype implementation. For production use, consider:
- Adding comprehensive unit tests
- Implementing proper session management
- Adding rate limiting
- Setting up CI/CD pipeline
- Adding monitoring and logging

## Support

For issues or questions, please refer to the PRD document for detailed specifications.

