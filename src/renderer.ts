declare const Chart: any;

let chartInstance: any = null; // Przechowuje instancję wykresu do jej niszczenia prz
let peChartInstance: any = null;
let currentNews: any[] = [];

// Typy wierszy dla tabeli
// Typy wierszy dla tabeli
type RowStyle = 'normal' | 'total' | 'sub' | 'header' | 'empty';
type ValueFormat = 'currency' | 'percent' | 'ratio' | 'decimal' | 'missing_price';

interface MetricDef {
    label: string;
    tags: string[];
    style: RowStyle;
    format?: ValueFormat; // Domyślnie 'currency'
}

const METRICS_MAP: Record<string, MetricDef[]> = {
    income: [
        { label: 'Revenue', tags: ['Revenues', 'NetRevenues', 'RevenuesNet', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'TotalRevenuesAndOtherIncome'], style: 'normal' },
        { label: 'Cost of revenue', tags: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'], style: 'normal' },
        { label: 'Gross profit', tags: ['GrossProfit', 'GrossMargin'], style: 'total' },
        { label: 'space1', tags: [], style: 'empty' },
        { label: 'Operating expenses', tags: [], style: 'header' },
        { label: 'Research and development', tags: ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentAndComputerSoftwareExpense'], style: 'sub' },
        { label: 'Sales, general and administrative', tags: ['SellingGeneralAndAdministrativeExpense'], style: 'sub' },
        { label: 'Total operating expenses', tags: ['OperatingExpenses'], style: 'total' },
        { label: 'space2', tags: [], style: 'empty' },
        { label: 'Operating income', tags: ['OperatingIncomeLoss'], style: 'normal' },
        { label: 'Other income, net', tags: ['OtherNonoperatingIncomeExpense'], style: 'normal' },
        { label: 'EBITDA', tags: [], style: 'normal' },
        { label: 'space3', tags: [], style: 'empty' },
        { label: 'Income before income tax', tags: ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'], style: 'normal' },
        { label: 'Income tax expense', tags: ['IncomeTaxExpenseBenefit'], style: 'normal' },
        { label: 'Net income', tags: ['NetIncomeLoss', 'ProfitLoss'], style: 'total' },
        { label: 'space4', tags: [], style: 'empty' },
        { label: 'Net income per share:', tags: [], style: 'header' },
        { label: 'Basic', tags: ['EarningsPerShareBasic', 'EarningsPerShareDiluted'], style: 'sub', format: 'decimal' },
        { label: 'Diluted', tags: ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], style: 'sub', format: 'decimal' }
    ],
    balance: [
        { label: 'Assets', tags: [], style: 'header' },
        { label: 'Cash & Equivalents', tags: ['CashAndCashEquivalentsAtCarryingValue'], style: 'sub' },
        { label: 'Total Current Assets', tags: ['AssetsCurrent'], style: 'total' },
        { label: 'Total Assets', tags: ['Assets'], style: 'total' },
        { label: 'space1', tags: [], style: 'empty' },
        { label: 'Liabilities & Equity', tags: [], style: 'header' },
        { label: 'Total Current Liabilities', tags: ['LiabilitiesCurrent'], style: 'sub' },
        { label: 'Total Liabilities', tags: ['Liabilities'], style: 'total' },
        { label: 'Retained Earnings', tags: ['RetainedEarningsAccumulatedDeficit'], style: 'normal' },
        { label: 'Shareholders Equity', tags: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'], style: 'total' }
    ],
    cashflow: [
        { label: 'Operating Cash Flow', tags: ['NetCashProvidedByUsedInOperatingActivities'], style: 'total' },
        { label: 'Investing Cash Flow', tags: ['NetCashProvidedByUsedInInvestingActivities'], style: 'total' },
        { label: 'Financing Cash Flow', tags: ['NetCashProvidedByUsedInFinancingActivities'], style: 'total' },
        { label: 'space1', tags: [], style: 'empty' },
        { label: 'Capital Expenditures', tags: ['PaymentsToAcquirePropertyPlantAndEquipment'], style: 'normal' }
    ],
    indicators: [
        { label: 'Return on Equity (ROE)', tags: [], style: 'normal', format: 'percent' },
        { label: 'Return on Assets (ROA)', tags: [], style: 'normal', format: 'percent' },
        { label: 'Return on Invested Capital (ROIC)', tags: [], style: 'normal', format: 'percent' },
        { label: 'space1', tags: [], style: 'empty' },
        { label: 'Current Ratio', tags: [], style: 'normal', format: 'ratio' },
        { label: 'Debt Ratio', tags: [], style: 'normal', format: 'percent' },
        { label: 'space2', tags: [], style: 'empty' },
        { label: 'EPS (Basic)', tags: ['EarningsPerShareBasic', 'EarningsPerShareDiluted'], style: 'normal', format: 'decimal' },
        { label: 'P/E Ratio', tags: [], style: 'normal', format: 'missing_price' },
        { label: 'P/BV Ratio', tags: [], style: 'normal', format: 'missing_price' }
    ],
    dividends: [
        { label: 'Dividends Paid (Total)', tags: ['PaymentsOfDividendsCommonStock', 'DividendsCommonStock', 'Dividends'], style: 'normal', format: 'currency' },
        { label: 'Dividend per Share', tags: ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'], style: 'normal', format: 'decimal' },
        { label: 'Payout Ratio', tags: [], style: 'normal', format: 'percent' },
        { label: 'Dividend Yield', tags: [], style: 'normal', format: 'missing_price' }
    ]
};

// Zmienne stanu (State)
let currentMainTab: 'overview' | 'statements' | 'indicators' | 'dividends' | 'macro' = 'overview';
let currentTab: 'income' | 'balance' | 'cashflow' = 'income'; // Podzakładka aktywna tylko w statements
let currentPeriod: 'annual' | 'quarterly' = 'annual';

let rawSecData: any = null;


const currentYear = new Date().getFullYear();
const YEARS_TO_FETCH = 20;

// Podpięcie logiki dla GŁÓWNYCH zakładek
// ZBIORCZA INICJALIZACJA INTERFEJSU (Zastępuje stare, luźne event listenery)
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Główne zakładki (Statements, Indicators, Dividends)
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentMainTab = target.dataset.maintab as 'overview' | 'statements' | 'indicators' | 'dividends' | 'macro';
            
            document.getElementById('sub-tabs-container')!.style.display = currentMainTab === 'statements' ? 'flex' : 'none';
            if (rawSecData) renderData();
        });
    });

    // 2. Podzakładki (Income, Balance, Cashflow)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentTab = target.dataset.tab as 'income' | 'balance' | 'cashflow';
            if (rawSecData) renderData();
        });
    });

    // 3. Okresy (Annual, Quarterly)
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentPeriod = target.dataset.period as 'annual' | 'quarterly';
            if (rawSecData) renderData();
        });
    });

    // 4. Przycisk dodawania do obserwowanych
    document.getElementById('add-to-watchlist-btn')?.addEventListener('click', () => {
        const ticker = (document.getElementById('ticker-input') as HTMLInputElement).value.toUpperCase();
        if (ticker && !watchlist.includes(ticker)) {
            watchlist.push(ticker);
            localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
            renderWatchlist();
        }
    });
    document.getElementById('hide-watchlist-btn')?.addEventListener('click', () => {
    // Przełączamy jedną klasę na głównym rodzicu (np. body lub wrapperze)
    document.body.classList.toggle('sidebar-hidden');
    });

    // 5. Wygenerowanie listy obserwowanych po załadowaniu okna
    renderWatchlist();
});


// --- MODUŁ WATCHLISTY ---

// Odczytywanie zapisanych tickerów z localStorage
let watchlist: string[] = JSON.parse(localStorage.getItem('myWatchlist') || '["AAPL", "MSFT", "NVDA"]');

// Inicjalizacja listy po uruchomieniu aplikacji
document.addEventListener('DOMContentLoaded', () => {
    renderWatchlist();
});



// Usuwanie tickera z listy (wywoływane prawym przyciskiem myszy)
function removeFromWatchlist(ticker: string) {
    watchlist = watchlist.filter(t => t !== ticker);
    localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
    renderWatchlist();
}

async function renderWatchlist() {
    const container = document.getElementById('watchlist-container');
    if (!container) return;

    let html = '';

    try {
        // Używamy nowego, hurtowego endpointu zdefiniowanego w main.ts
        const quotes = await (window as any).electronAPI.fetchWatchlistQuotes(watchlist);
        
        for (const quote of quotes) {
            const isPositive = quote.changePercent >= 0;
            const changeClass = isPositive ? 'positive' : 'negative';
            const sign = isPositive ? '+' : '';
            const initial = quote.name.charAt(0).toUpperCase();

            html += `
            <div class="wl-item" data-ticker="${quote.ticker}" oncontextmenu="removeFromWatchlist('${quote.ticker}')" title="Kliknij prawym, aby usunąć">
                <div class="wl-logo">${initial}</div>
                <div class="wl-info">
                    <div class="wl-ticker">${quote.ticker}</div>
                    <div class="wl-name">${quote.name}</div>
                </div>
                <div class="wl-price-container">
                    <div class="wl-price">${quote.price.toFixed(2)}</div>
                    <div class="wl-change ${changeClass}">${sign}${quote.changePercent.toFixed(2)}%</div>
                </div>
            </div>`;
        }
    } catch (error) {
        console.error('Nie udało się pobrać danych dla watchosty:', error);
    }

    container.innerHTML = html;

    // Podpięcie zdarzenia kliknięcia po wygenerowaniu DOM
    document.querySelectorAll('.wl-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const currentTarget = e.currentTarget as HTMLElement;
            const targetTicker = currentTarget.dataset.ticker;
            
            const targetNameElement = currentTarget.querySelector('.wl-name');
            const targetName = targetNameElement?.textContent || targetTicker || '';

            if (targetTicker) {
                loadSecData(targetTicker);
                
                const title = document.getElementById('company-title');
                if (title) {
                    title.textContent = targetName;
                }
            }
        });
    });
}

// Globalne wystawienie funkcji, aby atrybut oncontextmenu (prawy klik) działał poprawnie
(window as any).removeFromWatchlist = removeFromWatchlist;




let rawPriceData: any[] | null = null; // Przechowuje historię notowań
let currentQuoteInfo: any = null; 

async function loadSecData(ticker: string) {
    if (!ticker) return;

    document.getElementById('loading')!.style.display = 'block';
    document.getElementById('table-container')!.innerHTML = '';
    document.getElementById('overview-info')!.style.display = 'none';
    document.getElementById('no-data-msg')!.style.display = 'none';
    
    const chartWrapper = document.getElementById('chart-wrapper');
    if (chartWrapper) chartWrapper.style.display = 'none';

    try {
        // POBIERANIE RÓWNOLEGŁE 4 ŹRÓDEŁ
        const [secRes, priceRes, quoteRes, newsRes] = await Promise.all([
            (window as any).electronAPI.fetchSecData(ticker),
            (window as any).electronAPI.getHistoricalPrices(ticker),
            (window as any).electronAPI.getYahooQuote(ticker), // Pobiera aktualne wskaźniki
            (window as any).electronAPI.getCompanyNews(ticker) // Pobiera wiadomości firmy
        ]);
        
        rawSecData = secRes;
        rawPriceData = priceRes;
        currentQuoteInfo = quoteRes;
        currentNews = newsRes;
        
        renderData();
    } catch (error) {
        alert('Wystąpił błąd podczas pobierania danych. Sprawdź konsolę.');
        console.error(error);
    } finally {
        document.getElementById('loading')!.style.display = 'none';
    }
}

// Formatowanie kapitalizacji
function formatLargeNumber(num: number | null): string {
    if (!num) return 'Brak';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toLocaleString();
}





function renderData() {
    if (!rawSecData) {
        document.getElementById('no-data-msg')!.style.display = 'block';
        return;
    }

    const tableContainer = document.getElementById('table-container')!;
    const overviewInfo = document.getElementById('overview-info')!;
    const subTabs = document.getElementById('sub-tabs-container')!;
    const newsContainer = document.getElementById('overview-news-container')!;

    // Jeśli jesteśmy na tabie OVERVIEW
    if (currentMainTab === 'overview') {
        tableContainer.style.display = 'none';
        subTabs.style.display = 'none';
        overviewInfo.style.display = 'flex';
        newsContainer.style.display = 'block';
        


        // Zaktualizuj panele statystyk na dole
        if (currentQuoteInfo) {
            // --- DODANA LINIJKA DLA SEKTORA ---
            document.getElementById('ov-sector')!.textContent = currentQuoteInfo.sector || 'Brak danych';

            document.getElementById('ov-market-cap')!.textContent = formatLargeNumber(currentQuoteInfo.marketCap);
            document.getElementById('ov-pe')!.textContent = currentQuoteInfo.pe ? currentQuoteInfo.pe.toFixed(2) : 'Brak';
            document.getElementById('ov-peg')!.textContent = currentQuoteInfo.peg ? currentQuoteInfo.peg.toFixed(2) : 'Brak';
            
            // --- OBSŁUGA DATY DYWIDENDY ---
            const divElement = document.getElementById('ov-dividend-date')!;
            const divLabel = document.getElementById('ov-dividend-label')!;

            if (currentQuoteInfo.dividendDate) {
                const d = new Date(currentQuoteInfo.dividendDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (d < today) {
                    divLabel.textContent = 'Ostatnia dywidenda';
                } else {
                    divLabel.textContent = 'Następna dywidenda';
                }

                divElement.textContent = d.toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } else {
                divLabel.textContent = 'Dywidenda';
                divElement.textContent = 'Brak';
            }
        }

        // --- RENDEROWANIE WIADOMOŚCI ---

        const newsList = document.getElementById('overview-news-list')!;
        if (currentNews && currentNews.length > 0) {
            let newsHtml = '';
            for (const item of currentNews) {
                // Bezpieczne parsowanie daty z formatu RSS
                const publishTime = new Date(item.pubDate);
                const dateStr = !isNaN(publishTime.getTime()) 
                    ? publishTime.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '';

                // Zajawka - wyciągamy wyczyszczony opis
                const snippetHtml = item.description 
                    ? `<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; text-overflow: ellipsis;">
                           ${item.description}
                       </div>`
                    : '';

                newsHtml += `
                <div style="background: var(--panel-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                    <a href="${item.link}" target="_blank" style="color: var(--text-primary); font-weight: 600; text-decoration: none; font-size: 15px; display: block; margin-bottom: 6px;">
                        ${item.title}
                    </a>
                    ${snippetHtml}
                    <!-- margin-top: auto wypycha datę na sam dół kafelka -->
                    <div style="font-size: 12px; color: #5a5d66; font-weight: 500; margin-top: auto;">
                        Yahoo Finance ${dateStr ? '• ' + dateStr : ''}
                    </div>
                </div>`;
            }
            newsList.innerHTML = newsHtml;
        } else {
            newsList.innerHTML = '<div style="color: var(--text-secondary); font-size: 14px;">Brak najnowszych wiadomości dla tej spółki.</div>';
        }

        // Do wyliczenia historycznego P/E potrzebujemy EPS annual
        const columns = getAnnualColumns();
        const incomeData = processSecData(METRICS_MAP.income, columns);
        renderChart(incomeData, columns);
        return;
    }

    // Dla pozostałych tabów (Statements, Indicators, itp.)
    overviewInfo.style.display = 'none';
    tableContainer.style.display = 'block';
    subTabs.style.display = currentMainTab === 'statements' ? 'flex' : 'none';
    newsContainer.style.display = 'none';

    const columns = currentPeriod === 'annual' ? getAnnualColumns() : getQuarterlyColumns();
    const metricsToUse = currentMainTab === 'statements' ? METRICS_MAP[currentTab] : METRICS_MAP[currentMainTab];
    
    // Zabezpieczenie przed brakiem definicji dla nowych pustych zakładek (macro)
    if (!metricsToUse) return; 

    const tableData = processSecData(metricsToUse, columns);
    renderCleanTable(tableData, columns);

    const incomeData = (currentMainTab === 'statements' && currentTab === 'income') 
        ? tableData 
        : processSecData(METRICS_MAP.income, columns);
        
    renderChart(incomeData, columns);
}

// ZAKTUALIZOWANE OBLICZENIA W processSecData
// ZAKTUALIZOWANE OBLICZENIA W processSecData
// ZAKTUALIZOWANE OBLICZENIA W processSecData
function processSecData(metricsDef: MetricDef[], columns: string[]) {
    const result: any[] = [];
    const rawData = rawSecData;

    // Funkcja do ekstrakcji surowych danych XBRL z obiektu SEC
    const extractValue = (tags: string[], col: string) => {
        const isQuarterlyMode = col.includes('Q');
        const year = parseInt(col.substring(0, 4));
        const quarterStr = isQuarterlyMode ? col.substring(5, 7) : null;

        for (const tag of tags) {
            const unitData = rawData[tag]?.units?.USD || rawData[tag]?.units?.['USD/shares'];
            
            if (unitData) {
                let items = unitData.filter((item: any) => item.fy === year);
                
                if (!isQuarterlyMode) {
                    items = items.filter((item: any) => {
                        if (item.form !== '10-K' && item.fp !== 'FY') return false;
                        if (item.start && item.end) {
                            const daysDiff = (new Date(item.end).getTime() - new Date(item.start).getTime()) / 86400000;
                            if (daysDiff < 300) return false;
                        }
                        return true;
                    });
                } else {
                    items = items.filter((item: any) => {
                        if (quarterStr === 'Q4') {
                            if (currentTab === 'balance' || currentMainTab !== 'statements') return item.form === '10-K' || item.fp === 'FY';
                            return item.fp === 'Q4';
                        }
                        return item.fp === quarterStr;
                    });
                }

                if (items.length > 0) {
                    items.sort((a: any, b: any) => new Date(a.filed).getTime() - new Date(b.filed).getTime());
                    return items[items.length - 1].val;
                }
            }
        }
        return null;
    };

    // --- SYSTEM WYKRYWANIA SPLITÓW ---
    const impliedShares: Record<string, number> = {};
    columns.forEach(col => {
        const year = parseInt(col.substring(0, 4));
        if (!col.includes('Q')) {
            const eps = extractValue(['EarningsPerShareDiluted', 'EarningsPerShareBasic'], col);
            const ni = extractValue(['NetIncomeLoss', 'ProfitLoss'], col);
            if (eps && ni && eps !== 0) {
                impliedShares[year.toString()] = ni / eps;
            }
        }
    });

    const splitFactors: Record<string, number> = {};
    let currentMultiplier = 1.0;
    const years = Object.keys(impliedShares).sort((a, b) => parseInt(b) - parseInt(a));

    for (let i = 0; i < years.length; i++) {
        const yearStr = years[i];
        splitFactors[yearStr] = currentMultiplier;

        if (i < years.length - 1) {
            const prevYearStr = years[i + 1];
            const sharesNow = impliedShares[yearStr];
            const sharesPrev = impliedShares[prevYearStr];

            if (sharesNow && sharesPrev && sharesPrev !== 0) {
                const ratio = sharesNow / sharesPrev;
                if (ratio > 1.35 || ratio < 0.75) {
                    let splitRatio = 1;
                    if (ratio > 1) {
                        splitRatio = Math.round(ratio * 2) / 2;
                    } else {
                        splitRatio = 1 / (Math.round((1 / ratio) * 2) / 2);
                    }
                    currentMultiplier *= splitRatio;
                }
            }
        }
    }

    const getTTMValue = (tags: string[], colIndex: number) => {
        if (currentPeriod === 'annual') return extractValue(tags, columns[colIndex]);
        let ttmSum = 0;
        for (let i = 0; i < 4; i++) {
            if (!columns[colIndex + i]) return null; 
            const val = extractValue(tags, columns[colIndex + i]);
            if (val === null) return null;
            ttmSum += val;
        }
        return ttmSum;
    };

    const getClosestPrice = (year: number, quarterStr: string | null) => {
        if (!rawPriceData || rawPriceData.length === 0) return null;
        let targetMonth = 11, targetDay = 31;
        if (quarterStr === 'Q1') { targetMonth = 2; targetDay = 31; } 
        else if (quarterStr === 'Q2') { targetMonth = 5; targetDay = 30; } 
        else if (quarterStr === 'Q3') { targetMonth = 8; targetDay = 30; } 

        const targetTime = new Date(year, targetMonth, targetDay).getTime();
        for (let i = rawPriceData.length - 1; i >= 0; i--) {
            const quote = rawPriceData[i];
            if (!quote || !quote.date) continue;
            if (new Date(quote.date).getTime() <= targetTime) {
                return quote.close ?? quote.adjClose ?? null;
            }
        }
        return null;
    };

    // --- GŁÓWNA PĘTLA BUDUJĄCA WIERSZE ---
    for (const def of metricsDef) {
        if (def.style === 'empty' || def.style === 'header') {
            result.push({ label: def.label, style: def.style, format: def.format, values: {} });
            continue;
        }

        const values: Record<string, number | null> = {};
        
        columns.forEach((col, i) => {
            const isQuarterlyMode = col.includes('Q');
            const yearStr = col.substring(0, 4);
            const quarterStr = isQuarterlyMode ? col.substring(5, 7) : null;
            
            const splitFactor = splitFactors[yearStr] || 1.0;
            const prevCol = columns[i + 1]; 

            // 1. Złożone wskaźniki (Wymagające krzyżowych wyliczeń)
            if (def.label === 'P/E Ratio' || def.label === 'P/BV Ratio' || def.label === 'Dividend Yield' || def.label.includes('RO') || def.label === 'Current Ratio' || def.label === 'Debt Ratio' || def.label === 'Payout Ratio') {
                const calc = {
                    netIncome: extractValue(['NetIncomeLoss', 'ProfitLoss'], col),
                    ttmNetIncome: getTTMValue(['NetIncomeLoss', 'ProfitLoss'], i),
                    equity: extractValue(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'], col),
                    prevEquity: prevCol ? extractValue(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'], prevCol) : null,
                    assets: extractValue(['Assets'], col),
                    prevAssets: prevCol ? extractValue(['Assets'], prevCol) : null,
                    liab: extractValue(['Liabilities'], col),
                    currAssets: extractValue(['AssetsCurrent'], col),
                    currLiab: extractValue(['LiabilitiesCurrent'], col),
                    prevCurrLiab: prevCol ? extractValue(['LiabilitiesCurrent'], prevCol) : null,
                    opIncome: extractValue(['OperatingIncomeLoss'], col),
                    ttmOpIncome: getTTMValue(['OperatingIncomeLoss'], i),
                    divPaid: extractValue(['PaymentsOfDividendsCommonStock', 'DividendsCommonStock', 'Dividends'], col),
                    eps: extractValue(['EarningsPerShareDiluted', 'EarningsPerShareBasic'], col), 
                    dps: extractValue(['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'], col),
                    price: getClosestPrice(parseInt(yearStr), quarterStr) 
                };

                // Aplikowanie mnożnika splitów do wartości per-share przed wyliczeniami!
                if (calc.eps !== null) calc.eps /= splitFactor;
                if (calc.dps !== null) calc.dps /= splitFactor;

                if (def.label === 'P/E Ratio') {
                    values[col] = (calc.price && calc.eps) ? calc.price / calc.eps : null;
                } else if (def.label === 'P/BV Ratio') {
                    if (calc.price && calc.equity && calc.netIncome && calc.eps && calc.eps !== 0) {
                        const sharesOutstanding = calc.netIncome / calc.eps;
                        values[col] = sharesOutstanding !== 0 ? calc.price / (calc.equity / sharesOutstanding) : null;
                    } else values[col] = null;
                } else if (def.label === 'Dividend Yield') {
                    values[col] = (calc.price && calc.dps) ? (calc.dps / calc.price) * 100 : null;
                } else if (def.label.includes('ROE')) {
                    const averageEquity = calc.prevEquity ? (calc.equity! + calc.prevEquity) / 2 : calc.equity;
                    values[col] = (calc.ttmNetIncome && averageEquity) ? (calc.ttmNetIncome / averageEquity) * 100 : null;
                } else if (def.label.includes('ROA')) {
                    const averageAssets = calc.prevAssets ? (calc.assets! + calc.prevAssets) / 2 : calc.assets;
                    values[col] = (calc.ttmNetIncome && averageAssets) ? (calc.ttmNetIncome / averageAssets) * 100 : null;
                } else if (def.label.includes('ROIC')) {
                    const currentIC = (calc.assets && calc.currLiab) ? calc.assets - calc.currLiab : null;
                    const prevIC = (calc.prevAssets && calc.prevCurrLiab) ? calc.prevAssets - calc.prevCurrLiab : null;
                    const averageIC = prevIC ? (currentIC! + prevIC) / 2 : currentIC;
                    values[col] = (calc.ttmOpIncome && averageIC) ? (calc.ttmOpIncome / averageIC) * 100 : null;
                } else if (def.label === 'Current Ratio') {
                    values[col] = (calc.currAssets && calc.currLiab) ? calc.currAssets / calc.currLiab : null;
                } else if (def.label === 'Debt Ratio') {
                    values[col] = (calc.liab && calc.assets) ? (calc.liab / calc.assets) * 100 : null;
                } else if (def.label === 'Payout Ratio') {
                    values[col] = (calc.divPaid && calc.netIncome) ? (Math.abs(calc.divPaid) / Math.abs(calc.netIncome)) * 100 : null;
                }
            } 
            // 2. Proste metryki "Na Akcję" (Zawsze korygowane o splity)
            else if (def.label === 'EPS (Basic)' || def.label === 'Basic' || def.label === 'Diluted' || def.label === 'Dividend per Share') {
                const rawVal = extractValue(def.tags, col);
                values[col] = rawVal !== null ? rawVal / splitFactor : null;
            } 
            // 3. Ręczne wyliczenie EBITDA
            else if (def.label === 'EBITDA') {
                const netIncome = extractValue(['NetIncomeLoss', 'ProfitLoss'], col);
                if (netIncome !== null) {
                    const taxes = extractValue(['IncomeTaxExpenseBenefit'], col) || 0;
                    const interest = extractValue(['InterestExpense'], col) || 0;
                    const da = extractValue(['DepreciationAndAmortization'], col) || 0;
                    values[col] = netIncome + taxes + interest + da;
                } else values[col] = null;
            } 
            // 4. Standardowe zyski i przychody bazowe (Nie korygujemy o splity)
            else {
                values[col] = extractValue(def.tags, col);
            }
        });
        
        const finalFormat = def.format === 'missing_price' ? (def.label === 'Dividend Yield' ? 'percent' : 'ratio') : (def.format || 'currency');
        result.push({ label: def.label, style: def.style, format: finalFormat, values });
    }

    return result;
}

// FORMATOWANIE W ZALEŻNOŚCI OD TYPU DANYCH
function renderCleanTable(data: any[], columns: string[]) {
    const container = document.getElementById('table-container');
    if (!container) return;

    let html = `<table class="tv-table">
        <thead>
            <tr>
                <th class="sticky-col"></th>
                ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
        </thead>
        <tbody>`;

    for (const row of data) {
        if (row.style === 'empty') {
            html += `<tr class="row-empty"><td colspan="${columns.length + 1}"></td></tr>`;
            continue;
        }

        let trClass = row.style === 'total' ? 'row-total' : '';
        let tdClass = 'sticky-col';
        if (row.style === 'sub') tdClass += ' row-sub';
        if (row.style === 'header') tdClass += ' row-header-text';

        html += `<tr class="${trClass}"><td class="${tdClass}">${row.label}</td>`;
        
        columns.forEach(col => {
            if (row.style === 'header') {
                html += `<td></td>`;
            } else {
                const val = row.values[col];
                let displayVal = '';
                
                if (row.format === 'missing_price') displayVal = '<span style="color: #aaa; font-size: 11px;">Wymaga ceny</span>';
                else if (val !== null && val !== undefined) displayVal = formatTypedValue(val, row.format);
                else displayVal = '—';
                
                html += `<td>${displayVal}</td>`;
            }
        });
        
        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function formatTypedValue(value: number, format: ValueFormat): string {
    if (value === 0) return '0';
    if (format === 'decimal') return value.toFixed(2);
    if (format === 'percent') return value.toFixed(2) + '%';
    if (format === 'ratio') return value.toFixed(2);

    // format: currency
    const isNegative = value < 0;
    const absVal = Math.abs(value);
    let formatted = '';
    
    if (absVal >= 1.0e9) {
        formatted = (absVal / 1.0e6).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    
    return isNegative ? `(${formatted})` : formatted;
}

function renderChart(tableData: any[], columns: string[]) {
    const ctx = document.getElementById('financial-chart') as HTMLCanvasElement;
    if (!ctx) return;

    document.getElementById('chart-wrapper')!.style.display = 'block';

    if (chartInstance) {
        chartInstance.destroy();
    }

    // ============================================================
    // 1. OVERVIEW
    // ============================================================
    if (currentMainTab === 'overview') {
        const prices: number[] = [];
        const volumes: number[] = [];
        const pes: (number | null)[] = [];
        const labels: string[] = [];

        const epsRow = tableData.find(r => r.label === 'EPS (Basic)') ?? tableData.find(r => r.label === 'Basic');
        const epsDict: Record<string, number> = {};

        if (epsRow) {
            columns.forEach(col => {
                const year = col.substring(0, 4);
                if (!col.includes('Q') && epsRow.values[col] != null) {
                    epsDict[year] = Number(epsRow.values[col]);
                }
            });
        }

        if (rawPriceData && rawPriceData.length > 0) {
            for (const quote of rawPriceData) {
                if (!quote.date) continue;

                const dateObj = new Date(quote.date);
                const yearStr = dateObj.getFullYear().toString();
                const price = quote.close ?? quote.adjClose;
                const volume = quote.volume ?? 0;

                if (price == null || !Number.isFinite(Number(price))) continue;

                const numericPrice = Number(price);
                const numericVolume = Number(volume) || 0;

                labels.push(dateObj.toISOString().split('T')[0]);
                prices.push(numericPrice);
                volumes.push(numericVolume);

                const currentEps = epsDict[yearStr];
                if (currentEps != null && Number.isFinite(currentEps) && currentEps > 0) {
                    const dailyPE = numericPrice / currentEps;
                    if (Number.isFinite(dailyPE) && dailyPE > 0 && dailyPE < 300) {
                        pes.push(dailyPE);
                    } else {
                        pes.push(null);
                    }
                } else {
                    pes.push(null);
                }
            }
        }

        // ========================================================
        // NORMALIZACJA WOLUMENU (Wolumen zajmuje do 66% obszaru Ceny)
        // ========================================================
        const maxVolume = Math.max(...volumes, 1);
        const maxPrice = Math.max(...prices, 1);
        
        // ZMIEŃ TUTAJ JEŚLI CHCESZ INNĄ WYSOKOŚĆ (0.66 = 2/3 wysokości)
        const volumeHeight = maxPrice * 0.66; 

        const normalizedVolumes = volumes.map(volume => {
            return (volume / maxVolume) * volumeHeight;
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Price ($)',
                        data: prices,
                        borderColor: '#3CD859',
                        // --- NOWY BACKGROUND COLOR (GRADIENT) ---
                        backgroundColor: (context: any) => {
                            const chart = context.chart;
                            // Wyciągamy też skale (scales) z obiektu chart
                            const { ctx, chartArea, scales } = chart;
                            
                            // Zabezpieczenie: upewniamy się, że obszar i oś yPrice już istnieją
                            if (!chartArea || !scales['yPrice']) return null; 
                            
                            const yAxis = scales['yPrice'];
                            
                            // Tworzymy gradient od góry osi yPrice do dołu osi yPrice!
                            const gradient = ctx.createLinearGradient(0, yAxis.top, 0, yAxis.bottom);
                            
                            // 0 to góra wykresu Ceny, 1 to dół wykresu Ceny
                            gradient.addColorStop(0, 'rgba(60, 216, 89, 0.4)');  // Góra (możesz dać np. 0.4 żeby był mocniejszy)
                            gradient.addColorStop(1, 'rgba(60, 216, 89, 0)');    // Dół (0 = w pełni przezroczysty)
                            
                            return gradient;
                        },
                        // ----------------------------------------
                        yAxisID: 'yPrice',
                        pointRadius: 0,
                        borderWidth: 2,
                        fill: true,
                        order: 1,
                        tension: 0.2,             
                        borderJoinStyle: 'round'  
                    },
                    {
                        type: 'bar',
                        label: 'Volume',
                        data: normalizedVolumes,
                        yAxisID: 'yPrice',
                        backgroundColor: 'rgba(150, 150, 150, 0.25)',
                        borderWidth: 0,
                        barPercentage: 1.0,
                        categoryPercentage: 1.0,
                        order: 2,
                    },
                    {
                        type: 'line',
                        label: 'P/E Ratio',
                        data: pes,
                        borderColor: 'rgba(39, 186, 245, 1)',
                        backgroundColor: 'rgba(41, 98, 255, 0.0)',
                        yAxisID: 'yPE',
                        pointRadius: 0,
                        borderWidth: 1.5,
                        spanGaps: true,
                        fill: true,
                        order: 3,
                        tension: 0.2,             // Wygładza linię (wartości od 0 do 1)
                        borderJoinStyle: 'round'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        position: 'nearest',
                        callbacks: {
                            label: function(context: any) {
                                const datasetLabel = context.dataset.label;

                                if (datasetLabel === 'Volume') {
                                    const index = context.dataIndex;
                                    const originalVolume = volumes[index] ?? 0;
                                    return 'Volume: ' + originalVolume.toLocaleString('en-US');
                                }
                                if (datasetLabel === 'Price ($)') {
                                    return 'Price: $' + Number(context.parsed.y).toFixed(2);
                                }
                                if (datasetLabel === 'P/E Ratio') {
                                    if (context.parsed.y == null) return 'P/E: brak danych';
                                    return 'P/E: ' + Number(context.parsed.y).toFixed(2);
                                }
                                return datasetLabel + ': ' + context.parsed.y;
                            }
                        }
                    },
                    legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'rectRounded' } }
                },
                scales: {
                    x: { ticks: { maxTicksLimit: 10 } },
                    yPE: {
                        type: 'linear',
                        position: 'left',
                        stack: 'mainStack',
                        stackWeight: 1,
                        title: { display: true, text: 'P/E Ratio' },
                        grid: { color: 'rgba(150, 150, 150, 0.2)' }
                    },
                    yPrice: {
                        type: 'linear',
                        position: 'left',
                        stack: 'mainStack',
                        stackWeight: 2,
                        title: { display: true, text: 'Price ($)' },
                        grid: { color: 'rgba(150, 150, 150, 0.2)' }
                    }
                }
            }
        });
    }

    // ============================================================
    // 2. INDICATORS
    // ============================================================
    else if (currentMainTab === 'indicators') {
        const peDataPoints: number[] = [];
        const dateLabels: string[] = [];
        
        const epsRow = tableData.find(r => r.label === 'EPS (Basic)') ?? tableData.find(r => r.label === 'Basic');
        const epsDict: Record<string, number> = {};

        if (epsRow) {
            columns.forEach(col => {
                const year = col.substring(0, 4);
                if (!col.includes('Q')) {
                    if (epsRow.values[col] !== null && epsRow.values[col] !== undefined) {
                        epsDict[year] = Number(epsRow.values[col]);
                    }
                } else {
                    if (epsRow.values[col] !== null && epsRow.values[col] !== undefined) {
                        epsDict[year] = (epsDict[year] || 0) + Number(epsRow.values[col]);
                    }
                }
            });
        }

        if (rawPriceData && rawPriceData.length > 0) {
            for (const quote of rawPriceData) {
                if (!quote.date) continue;
                const dateObj = new Date(quote.date);
                const yearStr = dateObj.getFullYear().toString();
                const currentEps = epsDict[yearStr];
                const price = quote.close ?? quote.adjClose;

                if (currentEps && currentEps > 0 && price) {
                    const dailyPE = Number(price) / currentEps;
                    if (dailyPE > 0 && dailyPE < 300) {
                        dateLabels.push(dateObj.toISOString().split('T')[0]);
                        peDataPoints.push(dailyPE);
                    }
                }
            }
        }

        // --- NOWE: OBLICZANIE ŚREDNIEJ P/E ---
        let averagePE = 0;
        if (peDataPoints.length > 0) {
            const sumPE = peDataPoints.reduce((acc, val) => acc + val, 0);
            averagePE = sumPE / peDataPoints.length;
        }
        
        // Generujemy tablicę dla linii średniej (każdy punkt ma tę samą wartość)
        const averageDataPoints = peDataPoints.map(() => averagePE);

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'P/E Ratio (Daily)',
                    data: peDataPoints,
                    borderColor: 'rgba(41, 98, 255, 1)',
                    backgroundColor: 'rgba(41, 98, 255, 0.1)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: true
                },

                // --- NOWY ZBIÓR DANYCH: ŚREDNIA P/E ---
                {
                    label: `Średnie P/E (${averagePE.toFixed(2)})`, // Wyświetli np. "Średnie P/E (15.40)"
                    data: averageDataPoints,
                    borderColor: 'rgba(255, 82, 82, 0.8)', // Czerwony kolor by się odcinał
                    borderWidth: 2,
                    borderDash: [5, 5], // Przerywana linia
                    pointRadius: 0,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { ticks: { maxTicksLimit: 10 } },
                    y: { grid: { color: '#f0f0f0' } }
                }
            }
        });
    }

    // ============================================================
    // 3. STATEMENTS
    // ============================================================
    else {
        const chartLabels = [...columns].reverse();
        const revRow = tableData.find(r => r.label === 'Revenue');
        const incRow = tableData.find(r => r.label === 'Net income');
        
        const revValues = chartLabels.map(col => revRow?.values[col] || 0);
        const incValues = chartLabels.map(col => incRow?.values[col] || 0);

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Revenue', data: revValues, backgroundColor: 'rgba(41, 98, 255, 0.8)', borderRadius: 2 },
                    { label: 'Net Income', data: incValues, backgroundColor: 'rgba(0, 200, 83, 0.8)', borderRadius: 2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context: any) {
                                return context.dataset.label + ': ' + formatTypedValue(context.parsed.y, 'currency');
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        ticks: {
                            callback: function(value: any) {
                                if (value >= 1.0e9 || value <= -1.0e9) return ((value / 1.0e9).toFixed(1) + 'B');
                                if (value >= 1.0e6 || value <= -1.0e6) return ((value / 1.0e6).toFixed(1) + 'M');
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

function getAnnualColumns(): string[] {
    return Array.from({ length: YEARS_TO_FETCH }, (_, i) => (currentYear - 1 - i).toString());
}

function getQuarterlyColumns(): string[] {
    const cols: string[] = [];
    for (let i = 0; i < YEARS_TO_FETCH; i++) {
        const y = currentYear - 1 - i;
        cols.push(`${y} Q4`, `${y} Q3`, `${y} Q2`, `${y} Q1`);
    }
    return cols;
}


function formatCurrency(value: number, isEps: boolean = false): string {
    if (value === 0) return '0';
    if (isEps) return value.toFixed(2);

    const isNegative = value < 0;
    const absVal = Math.abs(value);
    
    let formatted = '';
    // Formatowanie z przecinkami dla czytelności (jak w raporcie)
    if (absVal >= 1.0e9) {
        formatted = (absVal / 1.0e6).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    
    return isNegative ? `(${formatted})` : formatted; // W raportach ujemne liczby często są w nawiasach, ale zostawiam standardowo lub z nawiasami
}