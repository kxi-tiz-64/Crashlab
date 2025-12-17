"""
GenAI-Powered Smart Advisor for CrashLab
Provides intelligent explanations, recommendations, and insights
"""
import os
import json
from typing import Dict, List, Optional, Any
import statistics

# Try to import OpenAI, but make it optional
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Fallback explanations when AI is not available
FALLBACK_EXPLANATIONS = {
    "spoofing_price_change": "Price change percentage controls how much the price drifts during spoofing. Higher values create more dramatic price movements that can trigger stop-losses or attract momentum traders.",
    "spoofing_volume_multiplier": "Volume multiplier creates fake volume walls. Higher values make the manipulation more visible and can overwhelm order books, making it harder for real traders to execute.",
    "spoofing_num_points": "Number of points determines how many consecutive data points are affected. More points create a longer-lasting manipulation pattern.",
    "quote_stuffing_max_deviation": "Maximum deviation controls how wide the price wicks become. Wider wicks indicate more extreme quote stuffing, creating false signals about market depth.",
    "quote_stuffing_volume_shock": "Volume shock multiplier creates sudden volume spikes. This overwhelms order matching systems and can cause delays in execution.",
    "quote_stuffing_num_points": "Number of affected points determines the spread of quote stuffing. More points create a more widespread manipulation pattern.",
    "flash_crash_price_drop": "Price drop percentage determines the severity of the crash. Higher values simulate more extreme panic selling scenarios.",
    "flash_crash_volatility_spike": "Volatility spike multiplier increases volume during crashes. This simulates panic-driven trading volume.",
    "flash_crash_duration": "Crash duration determines how long the price collapse lasts. Longer durations simulate sustained selling pressure.",
    "flash_crash_recovery_duration": "Recovery duration determines how quickly prices bounce back. Shorter recoveries indicate stronger underlying fundamentals."
}

def get_ai_explanation(prompt: str, context: Dict = None) -> str:
    """
    Get AI-generated explanation. Falls back to rule-based explanations if AI unavailable.
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not OPENAI_AVAILABLE or not api_key:
        # Use fallback explanations
        return get_fallback_explanation(prompt, context)
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial trading expert explaining market manipulation techniques in simple, clear language. Always explain why parameters matter and what risks they represent."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"AI API error: {e}")
        return get_fallback_explanation(prompt, context)

def get_fallback_explanation(prompt: str, context: Dict = None) -> str:
    """Generate rule-based explanation when AI is unavailable"""
    if context and 'parameter' in context:
        param = context['parameter']
        if param in FALLBACK_EXPLANATIONS:
            return FALLBACK_EXPLANATIONS[param]
    
    # Generic fallback
    return "This parameter controls the intensity of the market manipulation. Adjust it to simulate different attack scenarios."

def explain_parameter(parameter_name: str, value: float, attack_type: str) -> Dict[str, Any]:
    """
    Generate explanation for a specific parameter
    """
    prompt = f"Explain the parameter '{parameter_name}' with value {value} for {attack_type} attack. Explain what it does, why traders adjust it, and what risks it represents. Keep it under 100 words."
    
    explanation = get_ai_explanation(prompt, {'parameter': parameter_name})
    
    # Determine severity score (0-100)
    severity = calculate_severity_score(parameter_name, value, attack_type)
    
    # Generate risk assessment
    risk_level = "Low" if severity < 30 else "Medium" if severity < 70 else "High"
    
    return {
        "explanation": explanation,
        "severity_score": severity,
        "risk_level": risk_level,
        "ideal_scenarios": get_ideal_scenarios(parameter_name, attack_type)
    }

def calculate_severity_score(parameter_name: str, value: float, attack_type: str) -> int:
    """Calculate severity score (0-100) based on parameter value"""
    # Normalize different parameter ranges to 0-100
    if "price_change" in parameter_name or "price_drop" in parameter_name:
        # Price changes: 0-10% maps to 0-100
        return min(100, int(value * 10))
    elif "volume" in parameter_name or "volatility" in parameter_name:
        # Volume/volatility: 1-5x maps to 0-100
        return min(100, int((value - 1) * 25))
    elif "deviation" in parameter_name:
        # Deviations: 0-10% maps to 0-100
        return min(100, int(value * 10))
    elif "duration" in parameter_name:
        # Duration: 1-10 days maps to 0-100
        return min(100, int((value - 1) * 11))
    elif "num_points" in parameter_name:
        # Points: 2-15 maps to 0-100
        return min(100, int((value - 2) * 7.7))
    return 50  # Default

def get_ideal_scenarios(parameter_name: str, attack_type: str) -> List[str]:
    """Get ideal scenarios for using this parameter"""
    scenarios = {
        "spoofing": [
            "Testing stop-loss hunting strategies",
            "Simulating high-frequency trading manipulation",
            "Analyzing order book depth resilience"
        ],
        "quote_stuffing": [
            "Testing execution delay handling",
            "Simulating market data feed overload",
            "Analyzing quote processing systems"
        ],
        "flash_crash": [
            "Testing crash recovery strategies",
            "Simulating panic selling scenarios",
            "Analyzing circuit breaker effectiveness"
        ]
    }
    return scenarios.get(attack_type, ["General market stress testing"])

def analyze_simulation_results(
    original_data: List[Dict],
    crash_data: List[Dict],
    attack_config: Dict
) -> Dict[str, Any]:
    """
    Analyze simulation results and generate AI insights
    """
    # Calculate key metrics
    price_changes = []
    volume_changes = []
    volatility_changes = []
    
    for i in range(min(len(original_data), len(crash_data))):
        orig = original_data[i]
        crash = crash_data[i]
        
        price_change = abs(crash['close'] - orig['close']) / orig['close'] * 100
        volume_change = abs(crash['volume'] - orig['volume']) / orig['volume'] * 100 if orig['volume'] > 0 else 0
        
        price_changes.append(price_change)
        volume_changes.append(volume_change)
    
    # Calculate volatility
    orig_vol = calculate_volatility(original_data)
    crash_vol = calculate_volatility(crash_data)
    vol_change = ((crash_vol / orig_vol - 1) * 100) if orig_vol > 0 else 0
    
    max_price_dev = max(price_changes) if price_changes else 0
    avg_volume_change = statistics.mean(volume_changes) if volume_changes else 0
    modified_points = sum(1 for pc in price_changes if pc > 0.01)
    
    # Generate AI summary
    prompt = f"""Analyze this market crash simulation:
- Maximum price deviation: {max_price_dev:.2f}%
- Average volume change: {avg_volume_change:.2f}%
- Volatility change: {vol_change:.2f}%
- Modified data points: {modified_points}/{len(crash_data)}
- Attack types: {', '.join([k for k, v in attack_config.items() if v and k.startswith('enable_')])}

Provide a brief summary (under 150 words) explaining:
1. What happened in this simulation
2. Why it's realistic or concerning
3. What traders should understand from it
4. Key risks and opportunities"""
    
    summary = get_ai_explanation(prompt)
    
    # Generate recommendations
    recommendations = generate_recommendations(
        max_price_dev, avg_volume_change, vol_change, attack_config
    )
    
    # Risk assessment
    risk_score = calculate_overall_risk(max_price_dev, vol_change, avg_volume_change)
    
    return {
        "summary": summary,
        "metrics": {
            "max_price_deviation": max_price_dev,
            "avg_volume_change": avg_volume_change,
            "volatility_change": vol_change,
            "modified_points": modified_points,
            "total_points": len(crash_data)
        },
        "recommendations": recommendations,
        "risk_score": risk_score,
        "risk_level": "Low" if risk_score < 30 else "Medium" if risk_score < 70 else "High"
    }

def calculate_volatility(data: List[Dict]) -> float:
    """Calculate volatility from price data"""
    if len(data) < 2:
        return 0.0
    
    returns = []
    for i in range(1, len(data)):
        ret = (data[i]['close'] - data[i-1]['close']) / data[i-1]['close']
        returns.append(ret)
    
    if not returns:
        return 0.0
    
    mean = statistics.mean(returns)
    variance = statistics.mean([(r - mean) ** 2 for r in returns])
    return (variance ** 0.5) * 100

def generate_recommendations(
    max_price_dev: float,
    volume_change: float,
    vol_change: float,
    attack_config: Dict
) -> List[Dict[str, str]]:
    """Generate trading recommendations based on simulation results"""
    recommendations = []
    
    if max_price_dev > 10:
        recommendations.append({
            "type": "warning",
            "title": "Extreme Price Deviation",
            "message": "This simulation shows extreme price movements. Real traders would likely exit positions or widen stop-losses.",
            "action": "Consider testing crash-resilient strategies"
        })
    
    if vol_change > 50:
        recommendations.append({
            "type": "warning",
            "title": "High Volatility Spike",
            "message": "Volatility has increased significantly. This indicates unsustainable liquidity conditions.",
            "action": "Avoid trading during high volatility periods"
        })
    
    if volume_change > 100:
        recommendations.append({
            "type": "info",
            "title": "Volume Manipulation Detected",
            "message": "Large volume changes suggest quote stuffing or spoofing activity.",
            "action": "Test strategies that filter out volume anomalies"
        })
    
    # Strategy recommendations
    if attack_config.get('enable_flash_crash'):
        recommendations.append({
            "type": "suggestion",
            "title": "Strategy Recommendation",
            "message": "Flash crash detected. Try crash-resilient or mean reversion strategies.",
            "action": "Load crash-resilient template"
        })
    elif attack_config.get('enable_spoofing'):
        recommendations.append({
            "type": "suggestion",
            "title": "Strategy Recommendation",
            "message": "Spoofing detected. Try momentum or breakout strategies that can ride the manipulation.",
            "action": "Load momentum template"
        })
    
    return recommendations

def calculate_overall_risk(price_dev: float, vol_change: float, volume_change: float) -> int:
    """Calculate overall risk score (0-100)"""
    risk = 0
    risk += min(50, price_dev * 2)  # Price deviation contributes up to 50
    risk += min(30, abs(vol_change) / 2)  # Volatility change contributes up to 30
    risk += min(20, volume_change / 5)  # Volume change contributes up to 20
    return min(100, int(risk))

def suggest_strategy(attack_config: Dict, metrics: Dict) -> Dict[str, Any]:
    """
    Suggest which trading strategy to use based on attack configuration and metrics
    """
    suggestions = []
    
    if attack_config.get('enable_flash_crash') or metrics.get('volatility_change', 0) > 30:
        suggestions.append({
            "strategy": "crash_resilient",
            "reason": "High volatility and crash scenarios require defensive strategies",
            "confidence": "High"
        })
        suggestions.append({
            "strategy": "mean_reversion",
            "reason": "Mean reversion works well after extreme moves",
            "confidence": "Medium"
        })
    
    if attack_config.get('enable_spoofing') or metrics.get('volume_change', 0) > 50:
        suggestions.append({
            "strategy": "momentum",
            "reason": "Volume manipulation creates momentum opportunities",
            "confidence": "High"
        })
        suggestions.append({
            "strategy": "breakout",
            "reason": "Spoofing can trigger breakouts",
            "confidence": "Medium"
        })
    
    if not suggestions:
        suggestions.append({
            "strategy": "mean_reversion",
            "reason": "General purpose strategy for most market conditions",
            "confidence": "Medium"
        })
    
    return {
        "suggestions": suggestions,
        "primary": suggestions[0] if suggestions else None
    }

def explain_chart(chart_type: str, data_summary: Dict) -> str:
    """
    Generate explanation for a chart visualization
    """
    prompt = f"""Explain what this {chart_type} chart shows:
- {data_summary.get('description', 'Financial data visualization')}
- Key patterns: {data_summary.get('patterns', 'Price movements')}

Explain in simple terms what a trader should understand from this chart."""
    
    return get_ai_explanation(prompt)

