# Quick Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn package manager
- (Optional) OpenAI API key for AI-powered explanations and recommendations

## Step-by-Step Setup

### 1. Backend Setup

cd "D:\LY PROJECT - Copy\Crashlab\backend"
.\venv\Scripts\activate
python app.py


```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set OpenAI API key for AI features
# On Windows PowerShell:
# $env:OPENAI_API_KEY="your-api-key-here"
# On macOS/Linux:
# export OPENAI_API_KEY="your-api-key-here"
# 
# Note: AI features will work with fallback explanations if API key is not set

# Start the Flask server
python app.py
```

The backend should now be running on `http://localhost:5000`

### 2. Frontend Setup

cd "D:\LY PROJECT - Copy\Crashlab\frontend"
npm.cmd start


Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

The frontend should now be running on `http://localhost:3000`

### 3. Verify Installation

1. Open your browser and go to `http://localhost:3000`
2. You should see the Market Crash Simulation Platform homepage
3. Click "Load Random Stock" to test the connection

## Troubleshooting

### Backend Issues

**Problem: ModuleNotFoundError**
- Solution: Ensure virtual environment is activated and all dependencies are installed

**Problem: Port 5000 already in use**
- Solution: Change the port in `app.py` or set `PORT` environment variable

**Problem: yfinance connection errors**
- Solution: Check your internet connection. Yahoo Finance API may be temporarily unavailable

### Frontend Issues

**Problem: npm install fails**
- Solution: Try clearing npm cache: `npm cache clean --force`
- Or use yarn: `yarn install`

**Problem: Cannot connect to backend**
- Solution: Check that backend is running on port 5000
- Verify `REACT_APP_API_URL` in `.env` file (if using custom URL)

**Problem: Chart not rendering**
- Solution: Ensure Chart.js dependencies are installed correctly

## Development Tips

1. **Backend Debug Mode**: The Flask server runs in debug mode by default. Check terminal for error messages.

2. **Frontend Hot Reload**: React development server supports hot reload. Changes will appear automatically.

3. **API Testing**: You can test API endpoints directly using:
   - Postman
   - curl commands
   - Browser (for GET requests)

4. **Browser Console**: Check browser console (F12) for frontend errors and API responses.

## Next Steps

Once setup is complete:
1. Load a random stock
2. Experiment with crash simulations
3. Write your first trading algorithm
4. Analyze backtest results

Refer to the main README.md for detailed usage instructions.

