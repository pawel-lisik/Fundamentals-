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
        const summary = await yahooFinance.quoteSummary(ticker, { 
            modules: ['summaryDetail', 'defaultKeyStatistics', 'assetProfile', 'calendarEvents', 'financialData'] 
        }).catch(() => null);
        
        // Szukamy daty wypłaty dywidendy LUB daty odcięcia (ex-dividend) w 4 różnych miejscach API
        const rawDivDate = quote.dividendDate 
            || summary?.calendarEvents?.dividendDate 
            || summary?.calendarEvents?.exDividendDate 
            || summary?.summaryDetail?.exDividendDate 
            || null;
            
        let finalDivDateStr = null;
        if (rawDivDate) {
            const parsedDate = new Date(rawDivDate);
            // Sprawdzamy czy data jest poprawna (zabezpieczenie przed błędami z API)
            if (!isNaN(parsedDate.getTime())) {
                finalDivDateStr = parsedDate.toISOString();
            }
        }

        // Dividend Yield w Yahoo bywa ułamkiem dziesiętnym (np. 0.015 dla 1.5%) lub gotowym procentem
        const rawDivYield = summary?.summaryDetail?.dividendYield ?? quote.trailingAnnualDividendYield ?? null;
        let dividendYield: number | null = null;
        if (rawDivYield !== null && rawDivYield !== undefined) {
            dividendYield = rawDivYield <= 1 ? rawDivYield * 100 : rawDivYield;
        }

        let earningsDateStr = null;
        if (summary?.calendarEvents?.earnings?.earningsDate) {
            const eDates = summary.calendarEvents.earnings.earningsDate;
            if (Array.isArray(eDates) && eDates.length > 0) {
                // Czasami Yahoo zwraca przedział dat, bierzemy pierwszą (początkową)
                earningsDateStr = new Date(eDates[0]).toISOString();
            } else if (eDates) {
                earningsDateStr = new Date(eDates).toISOString();
            }
        } else if (quote.earningsTimestamp) {
            // Awaryjne pobieranie bezpośrednio ze statystyk aktualnego kursu
            earningsDateStr = new Date(quote.earningsTimestamp * 1000).toISOString();
        }

        return {
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            name: quote.longName || quote.shortName || ticker,
            pe: summary?.summaryDetail?.trailingPE || quote.trailingPE || null,
            peg: summary?.defaultKeyStatistics?.pegRatio || null,
            sector: summary?.assetProfile?.sector || 'Inne',
            marketCap: quote.marketCap || null,
            dividendDate: rawDivDate ? new Date(rawDivDate).toISOString() : null,
            targetPrice: summary?.financialData?.targetMeanPrice || summary?.financialData?.targetMedianPrice || null,
            description: summary?.assetProfile?.longBusinessSummary || '',

            // --- NOWE WSKAŹNIKI ---
            beta: summary?.defaultKeyStatistics?.beta ?? summary?.summaryDetail?.beta ?? null,
            dividendYield: dividendYield,
            recommendationKey: summary?.financialData?.recommendationKey ?? null, // np. 'strong_buy', 'buy', 'hold', 'sell'
            recommendationMean: summary?.financialData?.recommendationMean ?? null, // np. 1.8 (w skali 1.0 - 5.0)
            earningsDate: earningsDateStr,
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

ipcMain.handle('get-similar-companies', async (event, ticker: string) => {
    try {
        // 1. Pobieramy polecane/podobne spółki
        const recommendations = await yahooFinance.recommendationsBySymbol(ticker);
        
        // Zabezpieczenie na wypadek braku rekomendacji i bierzemy tylko 4 pierwsze spółki
        if (!recommendations || !recommendations.recommendedSymbols || recommendations.recommendedSymbols.length === 0) {
            return [];
        }
        const symbols = recommendations.recommendedSymbols.slice(0, 4).map((r: any) => r.symbol);
        
        // 2. Hurtowo pobieramy aktualne ceny i wskaźniki (P/E)
        const quotes = await yahooFinance.quote(symbols);
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
        
        const result = [];
        
        // Okienko czasowe do mini-wykresu - ostatni miesiąc
        const dzis = new Date();
        const start = new Date();
        start.setMonth(dzis.getMonth() - 1); 
        
        for (const q of quotesArray) {
            try {
                // 3. Pobieramy wykres z 1 miesiąca dla każdej spółki
                const history = await yahooFinance.chart(q.symbol, {
                    period1: start.toISOString().split('T')[0],
                    period2: dzis.toISOString().split('T')[0],
                    interval: '1d'
                });
                
                const prices = history.quotes
                    .filter((hq: any) => hq.close !== null)
                    .map((hq: any) => hq.close);
                
                result.push({
                    ticker: q.symbol,
                    name: q.shortName || q.longName || q.symbol,
                    pe: q.trailingPE || null, // Pobieramy wskaźnik P/E
                    prices: prices // Tablica notowań do wyrysowania
                });
            } catch(e) {
                console.error(`Błąd historii wykresu dla ${q.symbol}:`, e);
            }
        }
        
        return result;
    } catch (e) {
        console.error("Błąd pobierania podobnych spółek:", e);
        return [];
    }
});