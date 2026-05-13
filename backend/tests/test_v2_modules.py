import unittest

import pandas as pd

from anomaly_detector import detect_anomalies
from impact_analyzer import compute_impact
from perf_analytics import (
    compute_drawdown_curve,
    compute_sharpe_ratio,
    compute_trade_pnl_histogram,
)


class V2ModuleTests(unittest.TestCase):
    def test_anomaly_detector_flat_data(self):
        df = pd.DataFrame({
            "date": ["2026-01-01", "2026-01-02", "2026-01-03"],
            "close": [100, 100, 100],
            "volume": [1000, 1000, 1000],
        })
        self.assertEqual(detect_anomalies(df), [])

    def test_anomaly_detector_volume_outlier(self):
        df = pd.DataFrame({
            "date": [f"2026-01-{i+1:02d}" for i in range(30)],
            "close": [100 + i for i in range(30)],
            "volume": [1000] * 30,
        })
        df.loc[15, "volume"] = 100000
        self.assertEqual(detect_anomalies(df), [15])

    def test_impact_constant_prices(self):
        original = pd.DataFrame({"close": [100, 100, 100]})
        crashed = pd.DataFrame({"close": [100, 90, 95]})
        impact = compute_impact(original, crashed)
        self.assertEqual(impact["original_volatility"], 0.0)
        self.assertGreaterEqual(impact["crash_volatility"], 0.0)

    def test_performance_analytics(self):
        equity = [
            {"date": "2026-01-01", "equity": 100},
            {"date": "2026-01-02", "equity": 120},
            {"date": "2026-01-03", "equity": 90},
        ]
        self.assertEqual(compute_drawdown_curve(equity), [0.0, 0.0, -0.25])
        self.assertIsInstance(compute_sharpe_ratio(equity), float)

    def test_trade_histogram(self):
        trades = [
            {"type": "BUY", "pnl": 0},
            {"type": "SELL", "pnl": 100},
            {"type": "BUY", "pnl": 100},
            {"type": "SELL", "pnl": 50},
        ]
        histogram = compute_trade_pnl_histogram(trades, bins=2)
        self.assertEqual(sum(histogram["counts"]), 2)


if __name__ == "__main__":
    unittest.main()
