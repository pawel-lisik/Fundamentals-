import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

// --- INICJALIZACJA YAHOO FINANCE 2 (POPRAWIONA) ---
const yfModule = require('yahoo-finance2');
const YahooFinanceClass = yfModule.default || yfModule;
const yahooFinance = new YahooFinanceClass();


function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
}

async function fetchHistoricalData(ticker: string) {
    const cleanTicker = ticker.toUpperCase();
    if (priceHistoryCache[cleanTicker]) return priceHistoryCache[cleanTicker];

    try {
        const dzis = new Date();
        const start = new Date();
        start.setFullYear(dzis.getFullYear() - 20);

        const response = await yahooFinance.chart(cleanTicker, {
            period1: start.toISOString().split('T')[0],
            period2: dzis.toISOString().split('T')[0],
            interval: '1d'
        });

        const quotes = response?.quotes || [];
        const sanitizedQuotes = quotes
            .filter((q: any) => q.close !== null && q.close !== undefined)
            .map((q: any) => ({
                date: q.date,
                close: q.close,
                adjClose: q.adjclose ?? q.close,
                volume: q.volume || 0
            }));

        priceHistoryCache[cleanTicker] = sanitizedQuotes;
        return sanitizedQuotes;
    } catch (e: any) {
        console.error(`Błąd pobierania historii wykresu dla "${cleanTicker}":`, e.message || e);
        return [];
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Obsługa zapytań do SEC API
ipcMain.handle('fetch-sec-data', async (event, ticker: string) => {
    try {
        const headers = {
            // SEC bezwzględnie wymaga poprawnego User-Agenta z nazwą aplikacji i mailem
            'User-Agent': 'PortfolioTrackerApp/1.0 (twoj.email@example.com)' 
        };

        // 1. Pobranie mapowania Ticker -> CIK
        const tickersResponse = await fetch('https://www.sec.gov/files/company_tickers.json', { headers });
        const tickersData: Record<string, any> = await tickersResponse.json();
        
        let cik = '';
        for (const key in tickersData) {
            if (tickersData[key].ticker.toUpperCase() === ticker.toUpperCase()) {
                // CIK w API SEC musi być dopełniony zerami do 10 znaków
                cik = tickersData[key].cik_str.toString().padStart(10, '0');
                break;
            }
        }

        if (!cik) throw new Error('Nie znaleziono spółki o podanym tickerze.');

        // 2. Pobranie wszystkich faktów XBRL dla spółki (Company Facts)
        const factsResponse = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers });
        const factsData = await factsResponse.json();

        return factsData.facts['us-gaap'];
    } catch (error) {
        console.error('Błąd pobierania danych SEC:', error);
        throw error;
    }
});

// Pobieranie aktualnego kursu i nazwy spółki z Yahoo Finance
// Handler 1: Podstawowe pobieranie kursu (jeśli go używasz)
// Pamięć podręczna na historię cen (ticker -> tablica notowań)
const SECTOR_ETF_MAP: Record<string, string> = {
    "technology": "XLK",
    "healthcare": "XLV",
    "financial services": "XLF",
    "consumer cyclical": "XLY",
    "consumer defensive": "XLP",
    "industrials": "XLI",
    "energy": "XLE",
    "utilities": "XLU",
    "basic materials": "XLB",
    "real estate": "XLRE",
    "communication services": "XLC"
};

const priceHistoryCache: Record<string, any[]> = {};

// 1. HURTOWE POBIERANIE DLA WATCHLISTY (Zamiast N zapytań w pętli -> tylko 1 zapytanie)
ipcMain.handle('fetch-watchlist-quotes', async (event, tickers: string[]) => {
    if (!tickers || tickers.length === 0) return [];
    try {
        // Yahoo Finance potrafi przyjąć tablicę tickerów w jednym strzale HTTP
        const results = await yahooFinance.quote(tickers);
        const quotesArray = Array.isArray(results) ? results : [results];

        return quotesArray.map((quote: any) => ({
            ticker: quote.symbol,
            name: quote.shortName || quote.longName || quote.symbol,
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent || 0
        }));
    } catch (error: any) {
        console.error('Błąd hurtowego pobierania Watchlisty:', error.message || error);
        return [];
    }
});

// 2. POBIERANIE HISTORII Z CACHE'EM RAM
ipcMain.handle('get-historical-prices', async (event, ticker: string) => {
    const cleanTicker = ticker.toUpperCase();

    if (priceHistoryCache[cleanTicker]) {
        return priceHistoryCache[cleanTicker];
    }

    try {
        const dzis = new Date();
        const start = new Date();
        start.setFullYear(dzis.getFullYear() - 20);

        // chart() pobiera te same dane bez rygorystycznej walidacji nulli
        const response = await yahooFinance.chart(cleanTicker, {
            period1: start.toISOString().split('T')[0],
            period2: dzis.toISOString().split('T')[0],
            interval: '1d'
        });

        const quotes = response?.quotes || [];

        // Odrzucamy dni z trwającą sesją lub pustymi wartościami close
        const sanitizedQuotes = quotes
            .filter((q: any) => q.close !== null && q.close !== undefined)
            .map((q: any) => ({
                date: q.date,
                close: q.close,
                adjClose: q.adjclose ?? q.close,
                volume: q.volume || 0
            }));

        priceHistoryCache[cleanTicker] = sanitizedQuotes;
        return sanitizedQuotes;

    } catch (e: any) {
        console.error(`Błąd pobierania historii wykresu dla "${cleanTicker}":`, e.message || e);
        return [];
    }
});

ipcMain.handle('get-yahoo-quote', async (event, ticker: string) => {
    try {
        const quote = await yahooFinance.quote(ticker);
        // Dodajemy 'calendarEvents', żeby upewnić się, że pobierzemy datę dywidendy
        const summary = await yahooFinance.quoteSummary(ticker, { 
            modules: ['summaryDetail', 'defaultKeyStatistics', 'assetProfile', 'calendarEvents', 'financialData'] 
        }).catch(() => null);
        
        // Data często zwracana jest jako obiekt Date, bezpiecznie rzutujemy ją na string dla frontendu
        const rawDivDate = quote.dividendDate || summary?.calendarEvents?.dividendDate || null;
        
        return {
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            name: quote.longName || quote.shortName || ticker,
            pe: summary?.summaryDetail?.trailingPE || quote.trailingPE || null,
            peg: summary?.defaultKeyStatistics?.pegRatio || null,
            sector: summary?.assetProfile?.sector || 'Inne',
            marketCap: quote.marketCap || null,
            dividendDate: rawDivDate ? new Date(rawDivDate).toISOString() : null, // NOWE: Przekazujemy jako tekst ISO
            targetPrice: summary?.financialData?.targetMeanPrice || summary?.financialData?.targetMedianPrice || null,
            description: summary?.assetProfile?.longBusinessSummary || '',
        };
    } catch (e) {
        console.error("Błąd pobierania danych z Yahoo dla:", ticker, e);
        return null;
    }
});

ipcMain.handle('get-company-news', async (event, ticker: string) => {
    try {
        // Bezpośrednie odpytanie RSS Yahoo daje gwarancję istnienia opisu (zajawki)
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
        const response = await fetch(url);
        const xmlText = await response.text();

        const items: any[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        // Pobieramy max 6 najnowszych newsów
        while ((match = itemRegex.exec(xmlText)) !== null && items.length < 6) {
            const itemXml = match[1];

            // Funkcja pomocnicza do wyciągania tagów
            const getTag = (tag: string) => {
                const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's');
                const res = itemXml.match(regex);
                if (!res) return '';
                let text = res[1].trim();
                
                // Usuwamy ewentualne otoczki CDATA oraz znaczniki HTML
                text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                text = text.replace(/<[^>]+>/g, ''); 
                return text.trim();
            };

            items.push({
                title: getTag('title'),
                link: getTag('link'),
                description: getTag('description'), // Mamy gwarantowany tekst!
                pubDate: getTag('pubDate')
            });
        }
        return items;
    } catch (e) {
        console.error("Błąd pobierania RSS dla:", ticker, e);
        return [];
    }
});

ipcMain.handle('get-sector-historical-prices', async (event, sectorName: string) => {
    if (!sectorName) return [];
    const normalized = sectorName.toLowerCase().trim();
    const etfTicker = SECTOR_ETF_MAP[normalized];
    
    // Jeśli nie rozpoznamy sektora, zwracamy pustą tablicę
    if (!etfTicker) return []; 
    return fetchHistoricalData(etfTicker);
});