import time
import yfinance as yf
import pandas as pd
import logging
from data_loader import NIFTY_500_SYMBOLS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INDICES = {
    "nifty500": {
        "name": "NIFTY 500",
        "country": "India",
        "exchange": "NSE",
        "yahoo_ticker": "^CNX500",
        "source": "hardcoded",
        "hardcoded_list": NIFTY_500_SYMBOLS
    },
    "sp500": {
        "name": "S&P 500",
        "country": "USA",
        "exchange": "NYSE/NASDAQ",
        "yahoo_ticker": "^GSPC",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
        "table_index": 0,
        "col_name": "Symbol",
        "suffix": "",
        "hardcoded_list": [
            "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "GOOG", "META", "TSLA", "BRK.B", "UNH",
            "JPM", "XOM", "LLY", "AVGO", "V", "PG", "MA", "COST", "HD", "ADBE",
            "CVX", "MRK", "ABBV", "PEP", "CRM", "KO", "ORCL", "BAC", "AMD", "ACN",
            "TMO", "CSCO", "MCD", "ABT", "LIN", "WMT", "DIS", "DHR", "INTC", "INTU"
        ]
    },
    "nasdaq100": {
        "name": "NASDAQ 100",
        "country": "USA",
        "exchange": "NASDAQ",
        "yahoo_ticker": "^NDX",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/Nasdaq-100",
        "table_index": 4,
        "col_name": "Ticker",
        "suffix": "",
        "hardcoded_list": [
            "AAPL", "MSFT", "AMZN", "NVDA", "META", "GOOGL", "GOOG", "TSLA", "AVGO", "PEP",
            "COST", "ADBE", "CSCO", "INTC", "CMCSA", "NFLX", "AMD", "TMUS", "TXN", "AMGN",
            "INTU", "HON", "AMAT", "QCOM", "BKNG", "SBUX", "ISRG", "MDLZ", "VRTX", "ADI",
            "GILD", "LRCX", "REGN", "ADP", "PANW", "MELI", "VRSK", "SNPS", "CDNS", "MU"
        ]
    },
    "dow30": {
        "name": "Dow Jones 30",
        "country": "USA",
        "exchange": "NYSE/NASDAQ",
        "yahoo_ticker": "^DJI",
        "source": "hardcoded",
        "hardcoded_list": [
            "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "GS",
            "HD", "HON", "IBM", "INTC", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
            "MSFT", "NKE", "PG", "TRV", "UNH", "V", "VZ", "WBA", "WMT", "DOW"
        ]
    },
    "ftse100": {
        "name": "FTSE 100",
        "country": "UK",
        "exchange": "LSE",
        "yahoo_ticker": "^FTSE",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/FTSE_100_Index",
        "table_index": 4,
        "col_name": "EPIC",
        "suffix": ".L",
        "hardcoded_list": [
            "AAL.L", "ABF.L", "ADM.L", "AHT.L", "ANTO.L", "AV.L", "AZN.L", "BA.L", "BARC.L", "BAT.L",
            "BDEV.L", "BEZ.L", "BKIR.L", "BLND.L", "BME.L", "BNZL.L", "BP.L", "BRBY.L", "BT-A.L", "CCH.L",
            "CPG.L", "CTEC.L", "DCC.L", "DGE.L", "ENT.L", "EXPN.L", "FCIT.L", "FLTR.L", "FRAS.L", "GSK.L",
            "HLN.L", "HSBA.L", "IAG.L", "IHG.L", "III.L", "IMB.L", "INF.L", "ITRK.L", "JD.L", "KGF.L"
        ]
    },
    "dax40": {
        "name": "DAX 40",
        "country": "Germany",
        "exchange": "XETRA",
        "yahoo_ticker": "^GDAXI",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/DAX",
        "table_index": 4,
        "col_name": "Ticker symbol",
        "suffix": ".DE",
        "hardcoded_list": [
            "ADS.DE", "AIR.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE", "BMW.DE", "BNR.DE", "CBK.DE", "CON.DE",
            "1COV.DE", "DTG.DE", "DB1.DE", "DBK.DE", "DWG.DE", "DPW.DE", "DTE.DE", "EON.DE", "FRE.DE", "FME.DE",
            "HEI.DE", "HLD.DE", "IFX.DE", "IFX.DE", "LIN.DE", "MBG.DE", "MRK.DE", "MTX.DE", "MUV2.DE", "P911.DE",
            "PAH3.DE", "QIA.DE", "RWE.DE", "SAP.DE", "SRT3.DE", "SIE.DE", "SY1.DE", "TKA.DE", "VOW3.DE", "ZAL.DE"
        ]
    },
    "nikkei225": {
        "name": "Nikkei 225 (Top 30)",
        "country": "Japan",
        "exchange": "TSE",
        "yahoo_ticker": "^N225",
        "source": "hardcoded",
        "hardcoded_list": [
            "7203.T", "6758.T", "9984.T", "8035.T", "6098.T", "7974.T", "4063.T", "6861.T", "4502.T", "8306.T",
            "6501.T", "9432.T", "8001.T", "8058.T", "9433.T", "4519.T", "6367.T", "6723.T", "4901.T", "7267.T",
            "6954.T", "4568.T", "6981.T", "8031.T", "7741.T", "8411.T", "6273.T", "9022.T", "8801.T", "2914.T"
        ]
    },
    "hang_seng": {
        "name": "Hang Seng",
        "country": "Hong Kong",
        "exchange": "HKEX",
        "yahoo_ticker": "^HSI",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/Hang_Seng_Index",
        "table_index": 6,
        "col_name": "Ticker",
        "suffix": ".HK",
        "hardcoded_list": [
            "0001.HK", "0002.HK", "0003.HK", "0005.HK", "0006.HK", "0011.HK", "0012.HK", "0016.HK", "0017.HK", "0027.HK",
            "0066.HK", "0101.HK", "0175.HK", "0267.HK", "0288.HK", "0354.HK", "0386.HK", "0388.HK", "0669.HK", "0688.HK",
            "0700.HK", "0762.HK", "0823.HK", "0857.HK", "0868.HK", "0883.HK", "0939.HK", "0941.HK", "0960.HK", "0968.HK"
        ]
    },
    "asx200": {
        "name": "ASX 200",
        "country": "Australia",
        "exchange": "ASX",
        "yahoo_ticker": "^AXJO",
        "source": "wikipedia",
        "url": "https://en.wikipedia.org/wiki/S%26P/ASX_200",
        "table_index": 1,
        "col_name": "Ticker",
        "suffix": ".AX",
        "hardcoded_list": [
            "BHP.AX", "CBA.AX", "CSL.AX", "NAB.AX", "WBC.AX", "ANZ.AX", "MQG.AX", "WES.AX", "FMG.AX", "TLS.AX",
            "WOW.AX", "RIO.AX", "GMG.AX", "WDS.AX", "TCL.AX", "STO.AX", "ALL.AX", "CSL.AX", "REA.AX", "SUN.AX",
            "QAN.AX", "COH.AX", "APA.AX", "XRO.AX", "BXB.AX", "JHX.AX", "COL.AX", "SCG.AX", "MIN.AX", "IAG.AX"
        ]
    },
    "cac40": {
        "name": "CAC 40",
        "country": "France",
        "exchange": "Euronext Paris",
        "yahoo_ticker": "^FCHI",
        "source": "hardcoded",
        "hardcoded_list": [
            "MC.PA", "OR.PA", "RMS.PA", "TTE.PA", "SAN.PA", "AIR.PA", "BNP.PA", "AI.PA", "EL.PA", "KER.PA",
            "VIV.PA", "SU.PA", "DG.PA", "SAF.PA", "CS.PA", "ACA.PA", "CA.PA", "GLE.PA", "BN.PA", "DSY.PA",
            "STLAP.PA", "PUB.PA", "ML.PA", "HO.PA", "RI.PA", "LR.PA", "VIE.PA", "SGO.PA", "SW.PA", "ENGI.PA",
            "CAP.PA", "STMPA.PA", "EDV.PA", "URW.PA", "WLN.PA", "GFC.PA", "TELE.PA", "ALO.PA", "ATO.PA", "ORA.PA"
        ]
    },
    "shanghai": {
        "name": "SSE 50",
        "country": "China",
        "exchange": "SSE",
        "yahoo_ticker": "000016.SS",
        "source": "hardcoded",
        "hardcoded_list": [
            "600519.SS", "601398.SS", "601318.SS", "600036.SS", "601288.SS", "601939.SS", "601857.SS", "600900.SS", "601628.SS", "600030.SS",
            "601088.SS", "601668.SS", "600028.SS", "601818.SS", "601166.SS", "601328.SS", "600104.SS", "601998.SS", "601390.SS", "601111.SS",
            "600887.SS", "601800.SS", "601601.SS", "600019.SS", "601186.SS", "600585.SS", "601766.SS", "600309.SS", "601319.SS", "600276.SS",
            "601211.SS", "600048.SS", "601633.SS", "600009.SS", "600741.SS", "600690.SS", "603288.SS", "601888.SS", "600438.SS", "601012.SS",
            "601919.SS", "603501.SS", "600809.SS", "601138.SS", "601066.SS", "600406.SS", "603986.SS", "600547.SS", "601899.SS", "600111.SS"
        ]
    }
}

_constituent_cache = {}

def get_constituents(index_key):
    """
    Get list of tickers for a given index key.
    Attempts Wikipedia scraping if source is 'wikipedia', with hardcoded fallback.
    Caches results in-memory for 1 hour.
    """
    now = time.time()
    cache_duration = 3600  # 1 hour cache since I'm the only user

    if index_key in _constituent_cache:
        cached_data, timestamp = _constituent_cache[index_key]
        if now - timestamp < cache_duration:
            return cached_data

    if index_key not in INDICES:
        return []

    index_info = INDICES[index_key]
    constituents = []

    if index_info["source"] == "hardcoded":
        constituents = index_info["hardcoded_list"]
    elif index_info["source"] == "wikipedia":
        try:
            # Attempt Wikipedia scraping
            tables = pd.read_html(index_info["url"])
            df = tables[index_info["table_index"]]
            col = index_info["col_name"]
            
            # Find the correct column if the exact name isn't found (case-insensitive or partial)
            actual_col = next((c for c in df.columns if col.lower() in str(c).lower()), None)
            
            if actual_col:
                tickers = df[actual_col].astype(str).tolist()
                suffix = index_info["suffix"]
                
                # Special handling for Hang Seng numbers
                if index_key == "hang_seng":
                    constituents = [f"{t.zfill(4)}{suffix}" for t in tickers if t.isdigit()]
                else:
                    constituents = [f"{t.replace('.', '-')}{suffix}" if '.' in t and suffix == "" else f"{t}{suffix}" for t in tickers]
                
                # Filter out garbage
                constituents = [c for c in constituents if len(c) > 0 and not c.startswith('^')]
            
            if not constituents:
                raise ValueError("No constituents extracted from Wikipedia table")
                
        except Exception as e:
            logger.warning(f"Wikipedia scraping failed for {index_key}: {e}. Falling back to hardcoded list.")
            constituents = index_info["hardcoded_list"]

    _constituent_cache[index_key] = (constituents, now)
    return constituents
