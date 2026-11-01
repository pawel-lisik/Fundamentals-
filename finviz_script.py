# finviz_script.py
import sys
import json
from finvizfinance.quote import finvizfinance

def get_finviz_data(ticker):
    try:
        stock = finvizfinance(ticker)
        fundamenty = stock.ticker_fundament()
        
        # Zwracamy jako czysty JSON, żeby Electron łatwo to sparsował
        result = {
            "PEG": fundamenty.get('PEG'),
            "EPS next 5Y": fundamenty.get('EPS next 5Y'),
            "EPS past 5Y": fundamenty.get('EPS past 5Y'),
            "EPS this Y": fundamenty.get('EPS this Y')
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    # Ticker przekazywany jako argument (domyślnie AMZN dla testów)
    ticker = sys.argv[1] if len(sys.argv) > 1 else 'AMZN'
    get_finviz_data(ticker)