from finvizfinance.quote import finvizfinance

stock = finvizfinance('AMZN')
fundamenty = stock.ticker_fundament()

# Finviz zwraca gotowy słownik ze wszystkimi polami z tabeli:
print("PEG:", fundamenty.get('PEG'))
print("EPS next 5Y:", fundamenty.get('EPS next 5Y'))
print("EPS past 5Y:", fundamenty.get('EPS past 5Y'))
print("EPS this Y:", fundamenty.get('EPS this Y'))