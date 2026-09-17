import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    fetchSecData: (ticker: string) => ipcRenderer.invoke('fetch-sec-data', ticker),
    fetchWatchlistQuotes: (tickers: string[]) => ipcRenderer.invoke('fetch-watchlist-quotes', tickers),
    getHistoricalPrices: (ticker: string) => ipcRenderer.invoke('get-historical-prices', ticker),
    getYahooQuote: (ticker: string) => ipcRenderer.invoke('get-yahoo-quote', ticker), 
    getCompanyNews: (ticker: string) => ipcRenderer.invoke('get-company-news', ticker),
    getSectorHistoricalPrices: (sector: string) => ipcRenderer.invoke('get-sector-historical-prices', sector),
    // W pliku preload (w kontekście exposeInMainWorld):
    getSimilarCompanies: (ticker:string) => ipcRenderer.invoke('get-similar-companies', ticker),
    getMacroData: (countryCode: string) => ipcRenderer.invoke('get-macro-data', countryCode),
    getEarningsData: (ticker:string) => ipcRenderer.invoke('get-earnings-data', ticker),
});