"""
GenAI-Powered Smart Advisor for Resilio
Provides intelligent explanations, recommendations, and insights.
"""
import os
import json
import statistics
from typing import Dict, List, Optional, Any
from google import genai
from google.genai import types

def calculate_severity_score(parameter_name: str, value: float, attack_type: str) -> int:
    """Calculate severity score (0-100) based on parameter value"""
    if "price_change" in parameter_name or "price_drop" in parameter_name:
        return min(100, int(value * 10))
    elif "volume" in parameter_name or "volatility" in parameter_name:
        return min(100, int((value - 1) * 25))
    elif "deviation" in parameter_name:
        return min(100, int(value * 10))
    elif "duration" in parameter_name:
        return min(100, int((value - 1) * 11))
    elif "num_points" in parameter_name:
        return min(100, int((value - 2) * 7.7))
    return 50

# ---------- Gemini client helper ----------
def _gemini_client():
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return None
    try:
        return genai.Client(api_key=key)
    except Exception as e:
        print(f"[AI Advisor] Failed to initialize Gemini client: {e}")
        return None

# ---------- Fallback data ----------
FALLBACK_EXPLANATIONS = {
    "spoofing_price_change": "Price change percentage controls how much the price drifts during spoofing. Higher values create more dramatic price movements.",
    "spoofing_volume_multiplier": "Volume multiplier creates fake volume walls. Higher values make the manipulation more visible and can overwhelm order books.",
    "spoofing_num_points": "Number of points determines how many consecutive data points are affected.",
    "quote_stuffing_max_deviation": "Maximum deviation controls how wide the price wicks become.",
    "quote_stuffing_volume_shock": "Volume shock multiplier creates sudden volume spikes, overwhelming order matching systems.",
    "quote_stuffing_num_points": "Number of affected points determines the spread of quote stuffing.",
    "flash_crash_price_drop": "Price drop percentage determines the severity of the crash, simulating extreme panic selling.",
    "flash_crash_volatility_spike": "Volatility spike multiplier increases volume during crashes, simulating panic-driven volume.",
    "flash_crash_duration": "Crash duration determines how long the price collapse lasts.",
    "flash_crash_recovery_duration": "Recovery duration determines how quickly prices bounce back."
}

# ---------- Core AI analysis (used by simulate_crash) ----------
def analyze_simulation_results(original_data: List[Dict], manipulated_data: List[Dict], attack_config: Dict) -> Dict[str, Any]:
    """
    Analyze simulation results and generate AI insights. Tries Gemini LLM first.
    """
    client = _gemini_client()
    
    # Calculate basic metrics for both paths
    metrics = _calculate_basic_metrics(original_data, manipulated_data)
    
    if client:
        try:
            active_attacks = [k.replace('enable_', '') for k,v in attack_config.items() if v and k.startswith('enable_')]
            prompt = f"""
            Analyze this market manipulation simulation.
            - Max Price Deviation: {metrics['max_price_deviation']:.2f}%
            - Volatility Change: {metrics['volatility_change']:.2f}%
            - Modified Points: {metrics['modified_points']}
            - Attack Types: {', '.join(active_attacks)}

            Return ONLY valid JSON:
            {{"risk_score": 0-100, "risk_label": "Low"/"Medium"/"High"/"Extreme", "analysis": "2-3 sentences", "recommended_strategy": "Mean Reversion"/"Momentum"/"Crash Resilient", "confidence": "Low"/"Medium"/"High"}}
            """
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3, response_mime_type="application/json")
            )
            result = json.loads(response.text)
            print("[AI Advisor] Gemini analysis succeeded")
            
            return {
                "summary": result.get("analysis", "No analysis available."),
                "metrics": metrics,
                "recommendations": [
                    {
                        "type": "suggestion",
                        "title": "LLM Strategy Recommendation",
                        "message": f"Gemini 2.0 recommends: {result.get('recommended_strategy')}",
                        "action": f"Confidence: {result.get('confidence')}"
                    }
                ],
                "risk_score": result.get("risk_score", 50),
                "risk_level": result.get("risk_label", "Medium")
            }
        except Exception as e:
            print(f"[AI Advisor] Gemini call failed: {e}")

    # Fallback logic
    print("[AI Advisor] Using hardcoded fallback analysis")
    summary = f"Simulation analysis complete. Detected {metrics['max_price_deviation']:.2f}% deviation with a {metrics['volatility_change']:.2f}% volatility shift."
    
    recs = []
    if metrics['max_price_deviation'] > 10: 
        recs.append({"type": "warning", "title": "Extreme Deviation", "message": "High movements detected."})
    
    risk_score = min(100, int(metrics['max_price_deviation'] * 2 + abs(metrics['volatility_change']) / 2))
    
    return {
        "summary": summary,
        "metrics": metrics,
        "recommendations": recs,
        "risk_score": risk_score,
        "risk_level": "Low" if risk_score < 30 else "Medium" if risk_score < 70 else "High"
    }

def _calculate_basic_metrics(original_data, crash_data):
    price_changes, volume_changes = [], []
    for i in range(min(len(original_data), len(crash_data))):
        orig, crash = original_data[i], crash_data[i]
        price_changes.append(abs(crash['close'] - orig['close']) / orig['close'] * 100)
        volume_changes.append(abs(crash['volume'] - orig['volume']) / (orig['volume'] + 1e-9) * 100)
    
    def calc_vol(data):
        if len(data) < 2: return 0.0
        rets = [(data[i]['close'] - data[i-1]['close']) / data[i-1]['close'] for i in range(1, len(data))]
        if not rets: return 0.0
        mean = sum(rets) / len(rets)
        var = sum((r - mean)**2 for r in rets) / len(rets)
        return (var ** 0.5) * 100

    orig_vol = calc_vol(original_data)
    crash_vol = calc_vol(crash_data)
    vol_change = ((crash_vol / orig_vol - 1) * 100) if orig_vol > 0 else 0
    
    return {
        "max_price_deviation": max(price_changes) if price_changes else 0,
        "avg_volume_change": statistics.mean(volume_changes) if volume_changes else 0,
        "volatility_change": vol_change,
        "modified_points": sum(1 for pc in price_changes if pc > 0.01),
        "total_points": len(crash_data)
    }

# ---------- Parameter explanation ----------
def explain_parameter(parameter_name: str, value: float, attack_type: str) -> Dict[str, Any]:
    """
    Generate explanation for a specific parameter. Tries Gemini LLM first.
    """
    client = _gemini_client()
    explanation = None
    
    if client:
        try:
            prompt = f"Explain the parameter '{parameter_name}' with value {value} for {attack_type} attack in under 60 words, in simple terms."
            resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            explanation = resp.text.strip()
            print(f"[AI Advisor] Gemini parameter explanation succeeded for {parameter_name}")
        except Exception:
            pass

    if not explanation:
        explanation = FALLBACK_EXPLANATIONS.get(parameter_name, f"Controls the {parameter_name} intensity.")

    severity = min(100, int(value * 10)) if "price" in parameter_name else 50
    
    return {
        "explanation": explanation,
        "severity_score": severity,
        "risk_level": "Low" if severity < 30 else "Medium" if severity < 70 else "High",
        "ideal_scenarios": ["Stress testing current logic"]
    }

# ---------- Strategy & Chart Helpers ----------
def suggest_strategy(attack_config: Dict, metrics: Dict) -> Dict[str, Any]:
    suggestions = []
    if attack_config.get('enable_flash_crash'):
        suggestions.append({"strategy": "crash_resilient", "reason": "Designed for rapid recoveries", "confidence": "High"})
    else:
        suggestions.append({"strategy": "mean_reversion", "reason": "Effective for price stabilization", "confidence": "Medium"})
    return {"suggestions": suggestions, "primary": suggestions[0] if suggestions else None}

chart_explanation_cache = {}

def explain_chart(chart_type: str, data_summary: Dict) -> str:
    cache_key = f"{chart_type}_{json.dumps(data_summary, sort_keys=True)}"
    if cache_key in chart_explanation_cache:
        return chart_explanation_cache[cache_key]

    client = _gemini_client()
    if client:
        try:
            prompt = f"Explain what a {chart_type} chart shows for financial data: {json.dumps(data_summary)}. Keep it very brief and data-driven."
            resp = client.models.generate_content(
                model="gemini-2.0-flash", 
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3)
            )
            explanation = resp.text.strip()
            chart_explanation_cache[cache_key] = explanation
            return explanation
        except Exception as e:
            print(f"[AI Advisor] Gemini explain_chart failed: {e}")

    # Data-driven fallback logic
    if chart_type == "price_comparison":
        dev = data_summary.get("max_price_deviation", 0)
        vol = data_summary.get("volatility_change_pct", 0)
        anom = data_summary.get("anomaly_count", 0)
        fallback = f"Price deviation reached {dev:.2f}%, and volatility shifted by {vol:.2f}%. A total of {anom} anomalies were detected."
    elif chart_type == "volatility_map":
        orig_vol = data_summary.get("original_volatility", 0)
        crash_vol = data_summary.get("crash_volatility", 0)
        change = ((crash_vol - orig_vol) / orig_vol * 100) if orig_vol else 0
        fallback = f"Original volatility was {orig_vol:.2f}%, which shifted to {crash_vol:.2f}% during the manipulation (a {change:.2f}% change)."
    elif chart_type == "anomaly_timeline":
        anom = data_summary.get("anomaly_count", 0)
        dates = data_summary.get("dates", [])
        if dates and isinstance(dates, list) and len(dates) > 0:
            fallback = f"The timeline tracks {anom} anomalies, with notable occurrences around {dates[0]} to {dates[-1]}."
        else:
            fallback = f"The timeline tracks a total of {anom} anomalies detected across the simulation period."
    elif chart_type == "drawdown_curve":
        max_dd = data_summary.get("max_drawdown", 0)
        dd_date = data_summary.get("drawdown_date", "an unknown date")
        fallback = f"The worst drawdown was {max_dd:.2f}%, which occurred around {dd_date}."
    else:
        fallback = f"This {chart_type} chart visualizes key trends based on the simulation data, highlighting deviations from baseline behavior."

    chart_explanation_cache[cache_key] = fallback
    return fallback
