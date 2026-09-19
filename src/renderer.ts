declare const Chart: any;
let sectorPriceData: any[] | null = null;

let chartInstance: any = null; // Przechowuje instancję wykresu do jej niszczenia prz
let peChartInstance: any = null;
let currentNews: any[] = [];
let similarCompaniesData: any[] = [];
let currentLoadedTicker: string | null = null;

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
        { label: 'Revenue', tags: ['Revenues', 'NetRevenues', 'RevenuesNet', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'TotalRevenuesAndOtherIncome', 'SalesRevenueGoodsNet', 'SalesRevenueServicesNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'RevenuesNetOfInterestExpense', 'TotalRevenues', 'OperatingRevenues', 'FinancialServicesRevenue', 'InterestAndFeeIncome'], style: 'normal' },
        { label: 'Cost of revenue', tags: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'], style: 'normal' },
        { label: 'Gross profit', tags: ['GrossProfit', 'GrossMargin'], style: 'total' }, // Mastercard tego nie raportuje
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
        { 
            label: 'Income before income tax', 
            tags: [
                'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
                'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments', // Stary tag używany przez lata
                'IncomeBeforeIncomeTaxes', // Standardowy, krótszy tag
                'IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomesticAndForeign', // Zapasowy tag dla korporacji międzynarodowych
                'IncomeLossFromContinuingOperationsBeforeIncomeTaxes',
            ], 
            style: 'normal' 
        },
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
        { 
            label: 'Operating Cash Flow', 
            tags: [
                'NetCashProvidedByUsedInOperatingActivities', 
                'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations' // <-- Alternatywny tag Apple
            ], 
            style: 'total' 
        },
        { 
            label: 'Investing Cash Flow', 
            tags: [
                'NetCashProvidedByUsedInInvestingActivities', 
                'NetCashProvidedByUsedInInvestingActivitiesContinuingOperations' // <-- Alternatywny tag Apple
            ], 
            style: 'total' 
        },
        { 
            label: 'Financing Cash Flow', 
            tags: [
                'NetCashProvidedByUsedInFinancingActivities', 
                'NetCashProvidedByUsedInFinancingActivitiesContinuingOperations' // <-- Alternatywny tag Apple
            ], 
            style: 'total' 
        },
        { label: 'space1', tags: [], style: 'empty' },
        { 
            label: 'Capital Expenditures', 
            tags: [
                'PaymentsToAcquirePropertyPlantAndEquipment', 
                'PaymentsToAcquireProductiveAssets' // <-- Specyficzny tag CapEx używany długo przez Apple
            ], 
            style: 'normal' 
        }
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
let currentMainTab: 'overview' | 'statements' | 'indicators' | 'dividends' | 'macro' | 'earnings' = 'overview';
let currentTab: 'income' | 'balance' | 'cashflow' = 'income'; // Podzakładka aktywna tylko w statements
let currentPeriod: 'annual' | 'quarterly' = 'annual';

let currentEarningsData: any = null;
let annualEarningsChartInstance: any = null;
let quarterlyEarningsChartInstance: any = null;
let earningsChartInstance: any = null;

let rawSecData: any = null;


const currentYear = new Date().getFullYear();
const YEARS_TO_FETCH = 20;

// Funkcja aktualizująca stan przycisku dodawania do obserwowanych
function updateWatchlistButtonState() {
    const btn = document.getElementById('add-to-watchlist-btn');
    if (!btn) return;

    if (!currentLoadedTicker) {
        btn.style.display = 'none';
        return;
    }

    // Pokaż przycisk, skoro jakaś spółka jest załadowana
    btn.style.display = 'block'; 

    if (watchlist.includes(currentLoadedTicker)) {
        btn.innerHTML = '<i class="fa-solid fa-minus"></i>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
}

// Podpięcie logiki dla GŁÓWNYCH zakładek
// ZBIORCZA INICJALIZACJA INTERFEJSU (Zastępuje stare, luźne event listenery)
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Główne zakładki (Statements, Indicators, Dividends)

    // 1. Główne zakładki (Statements, Indicators, Dividends, Macro, Earnings)
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentMainTab = target.dataset.maintab as 'overview' | 'statements' | 'indicators' | 'dividends' | 'macro' | 'earnings';
            
            // KONTROLA WIDOCZNOŚCI

            const macroContainer = document.getElementById('macro-container');
            const earningsContainer = document.getElementById('earnings-container'); // <-- NOWE
            const subTabsContainer = document.getElementById('sub-tabs-container');
            const periodToggle = document.getElementById('period-toggle');
            const otherContainers = [
                document.getElementById('overview-info-container'),
                document.getElementById('table-container'),
                document.getElementById('chart-wrapper'),
                document.getElementById('sub-tabs-container'),
                document.getElementById('no-data-msg'),
                earningsContainer,
                macroContainer
            ];


            // Ukrywamy wszystko
            otherContainers.forEach(el => { if(el) el.style.display = 'none'; });
            if (subTabsContainer) subTabsContainer.style.display = 'none';
            if (periodToggle) periodToggle.style.display = 'none';

            if (currentMainTab === 'macro') {
                if (macroContainer) macroContainer.style.display = 'block';
                loadMacroTab(); 
            } else if (currentMainTab === 'earnings') {
                // --- LOGIKA ZAKŁADKI EARNINGS ---
                if (earningsContainer) earningsContainer.style.display = 'block';
                renderEarnings(); 
            } else {
                // Wracamy do widoku spółki
                if (currentMainTab === 'indicators' || currentMainTab === 'statements') {
                    if (periodToggle) periodToggle.style.display = 'block';
                }
                if (subTabsContainer) {
                    subTabsContainer.style.display = currentMainTab === 'statements' ? 'flex' : 'none';
                }
                if (rawSecData) renderData(); 
            }
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

// 4. Wyszukiwarka i przycisk obserwowanych
    const tickerInput = document.getElementById('ticker-input') as HTMLInputElement;
    const searchBtn = document.getElementById('search-btn');
    const watchlistBtn = document.getElementById('add-to-watchlist-btn');

    // Wspólna funkcja wyszukująca
    const performSearch = () => {
        if (!tickerInput) return;
        const ticker = tickerInput.value.trim().toUpperCase();
        if (ticker) {
            tickerInput.value = ''; // Czyszczenie po wyszukaniu
            tickerInput.blur();     // Odznaczenie pola
            loadSecData(ticker);
        }
    };

    // Wyszukiwanie po wciśnięciu ENTER
    tickerInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // NOWE: Wyszukiwanie po kliknięciu w LUPĘ
    searchBtn?.addEventListener('click', () => {
        performSearch();
    });

    // Przycisk Dodaj/Usuń dla OBECNIE załadowanej spółki
    watchlistBtn?.addEventListener('click', () => {
        if (!currentLoadedTicker) return;

        if (watchlist.includes(currentLoadedTicker)) {
            // Usuwamy
            removeFromWatchlist(currentLoadedTicker);
        } else {
            // Dodajemy
            watchlist.push(currentLoadedTicker);
            localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
            renderWatchlist();
            updateWatchlistButtonState();
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
    updateWatchlistButtonState(); // DODANE: aktualizacja przycisku!
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
            <div style="border-bottom: 1px solid var(--border-color); border-radius: 0px" class="wl-item" data-ticker="${quote.ticker}" oncontextmenu="removeFromWatchlist('${quote.ticker}')" title="Kliknij prawym, aby usunąć">
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

    currentLoadedTicker = ticker.toUpperCase();
    updateWatchlistButtonState();

    document.getElementById('loading')!.style.display = 'block';
    document.getElementById('table-container')!.innerHTML = '';
    document.getElementById('no-data-msg')!.style.display = 'none';
    
    const chartWrapper = document.getElementById('chart-wrapper');
    if (chartWrapper) chartWrapper.style.display = 'none';

    try {
        // POBIERANIE RÓWNOLEGŁE 4 ŹRÓDEŁ
        const [secRes, priceRes, quoteRes, newsRes, similarRes, earningsRes] = await Promise.all([
            (window as any).electronAPI.fetchSecData(ticker),
            (window as any).electronAPI.getHistoricalPrices(ticker),
            (window as any).electronAPI.getYahooQuote(ticker), // Pobiera aktualne wskaźniki
            (window as any).electronAPI.getCompanyNews(ticker), // Pobiera wiadomości firmy
            (window as any).electronAPI.getSimilarCompanies(ticker),
            (window as any).electronAPI.getEarningsData(ticker)
        ]);
        
        rawSecData = secRes;
        rawPriceData = priceRes;
        currentQuoteInfo = quoteRes;
        currentNews = newsRes;
        similarCompaniesData = similarRes;
        currentEarningsData = earningsRes;

        // --- NOWE: POBIERANIE HISTORII SEKTORA (ETF) ---
        if (currentQuoteInfo && currentQuoteInfo.sector) {
            sectorPriceData = await (window as any).electronAPI.getSectorHistoricalPrices(currentQuoteInfo.sector);
        } else {
            sectorPriceData = null;
        }
        
        renderData();
        updateWatchlistButtonState(); // Zostaje samo odświeżenie przycisku
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


function formatRecommendation(key: string | null): { text: string; color: string } {
    if (!key) return { text: 'Brak', color: 'var(--text-secondary)' };

    switch (key.toLowerCase()) {
        case 'strong_buy':
            return { text: 'Strong Buy', color: '#00E676' };
        case 'buy':
            return { text: 'Buy', color: '#3CD859' };
        case 'hold':
            return { text: 'Hold', color: '#FFB300' };
        case 'underperform':
            return { text: 'Underperform', color: '#FF7043' };
        case 'sell':
            return { text: 'Sell', color: '#FF5252' };
        default:
            return { text: key.toUpperCase().replace('_', ' '), color: 'var(--text-primary)' };
    }
}


function renderData() {
    if (!rawSecData) {
        document.getElementById('no-data-msg')!.style.display = 'block';
        return;
    }

    const tableContainer = document.getElementById('table-container')!;
    const subTabs = document.getElementById('sub-tabs-container')!;
    const overviewContainer = document.getElementById('overview-info-container')!;
    const periodToggle = document.getElementById('period-toggle')!;

    // Jeśli jesteśmy na tabie OVERVIEW
    if (currentMainTab === 'overview') {
        tableContainer.style.display = 'none';
        subTabs.style.display = 'none';
        overviewContainer.style.display = 'block';
        periodToggle.style.display = 'none';


        // Zaktualizuj panele statystyk na dole
        if (currentQuoteInfo) {


            const titleEl = document.getElementById('company-title');
            if (titleEl && currentQuoteInfo.name) {
                titleEl.innerHTML = `${currentLoadedTicker} &nbsp;&nbsp;&nbsp;<span style="color: var(--text-secondary); font-size: 16px; font-weight: normal;">${currentQuoteInfo.name}</span>`;
            }

            document.getElementById('ov-sector')!.textContent = currentQuoteInfo.sector || 'Brak danych';
            document.getElementById('ov-market-cap')!.textContent = formatLargeNumber(currentQuoteInfo.marketCap);
            document.getElementById('ov-pe')!.textContent = currentQuoteInfo.pe ? currentQuoteInfo.pe.toFixed(2) : 'Brak';
            document.getElementById('ov-peg')!.textContent = currentQuoteInfo.peg ? currentQuoteInfo.peg.toFixed(2) : 'Brak';
            
            // 1. DATA DYWIDENDY (Przywrócona brakująca logika!)
            const divElement = document.getElementById('ov-dividend-date');
            const divLabel = document.getElementById('ov-dividend-label');
            if (divElement && divLabel) {
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
                    divLabel.textContent = 'Dividend Date';
                    divElement.textContent = 'Brak';
                }
            }

            // 2. BETA
            const betaEl = document.getElementById('ov-beta');
            if (betaEl) {
                betaEl.textContent = currentQuoteInfo.beta != null ? currentQuoteInfo.beta.toFixed(2) : 'Brak';
            }

            // 3. STOPA DYWIDENDY (Yield)
            const yieldEl = document.getElementById('ov-dividend-yield');
            if (yieldEl) {
                yieldEl.textContent = currentQuoteInfo.dividendYield != null 
                    ? `${currentQuoteInfo.dividendYield.toFixed(2)}%` 
                    : 'Brak';
            }

            // 4. DATA RAPORTU (Earnings Date) - Przeniesione do bezpiecznego bloku
            const earnEl = document.getElementById('ov-earnings-date');
            if (earnEl) {
                if (currentQuoteInfo.earningsDate) {
                    const eDate = new Date(currentQuoteInfo.earningsDate);
                    earnEl.textContent = eDate.toLocaleDateString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                } else {
                    earnEl.textContent = 'Brak';
                }
            }

            // 5. CENA DOCELOWA Z PROCENTAMI - Przeniesione do bezpiecznego bloku
            const targetPriceEl = document.getElementById('ov-target-price');
            if (targetPriceEl) {
                if (currentQuoteInfo.targetPrice && currentQuoteInfo.price) {
                    const target = currentQuoteInfo.targetPrice;
                    const current = currentQuoteInfo.price;
                    const diffPercent = ((target - current) / current) * 100;
                    
                    const sign = diffPercent >= 0 ? '+' : '';
                    const color = diffPercent >= 0 ? '#3CD859' : '#FF5252'; 
                    
                    targetPriceEl.innerHTML = `$${target.toFixed(2)} <span style="color: ${color}; font-size: 13px; font-weight: 500; margin-left: 6px;">(${sign}${diffPercent.toFixed(2)}%)</span>`;
                } else if (currentQuoteInfo.targetPrice) {
                    targetPriceEl.textContent = `$${currentQuoteInfo.targetPrice.toFixed(2)}`;
                } else {
                    targetPriceEl.textContent = 'Brak';
                }
            }

            // 6. REKOMENDACJA ANALITYKÓW (Wizualna skala)
            const recWrapper = document.getElementById('ov-recommendation-wrapper');
            const recMeanEl = document.getElementById('rec-mean-value');
            const recMarker = document.getElementById('rec-marker');

            if (recWrapper && recMeanEl && recMarker) {
                const mean = currentQuoteInfo.recommendationMean; 
                const key = currentQuoteInfo.recommendationKey;

                if (mean != null) {
                    recWrapper.style.display = 'block';
                    
                    let percent = ((mean - 1.0) / 4.0) * 100;
                    if (percent < 0) percent = 0;
                    if (percent > 100) percent = 100;

                    recMarker.style.left = `${percent}%`;

                    const recFormatted = formatRecommendation(key);
                    recMeanEl.textContent = `${recFormatted.text} (${mean.toFixed(2)})`;
                    recMeanEl.style.color = recFormatted.color;
                } else {
                    recWrapper.style.display = 'none';
                }
            }
        }

        // --- NOWE: STOPY ZWROTU Z OSTATNICH LAT ---
        if (rawPriceData && rawPriceData.length > 0) {
            // Używamy 'adjClose', żeby splity i dywidendy nie zaburzały wyniku z 10 lat
            const latestQuote = rawPriceData[rawPriceData.length - 1];
            const latestPrice = latestQuote.adjClose || latestQuote.close;
            const latestDate = new Date(latestQuote.date);

            // --- STOPY ZWROTU (SPÓŁKA VS SEKTOR) ---
            const calculateReturn = (yearsAgo: number, dataArray: any[]) => {
                if (!dataArray || dataArray.length === 0) return null;

                const latestQuote = dataArray[dataArray.length - 1];
                const latestPrice = latestQuote.adjClose || latestQuote.close;
                const targetDate = new Date(latestQuote.date);

                targetDate.setMonth(targetDate.getMonth() - Math.round(yearsAgo * 12));

                const targetTime = targetDate.getTime();

                let historicalPrice = null;
                // Szukamy najbliższej ceny wstecz
                for (let i = dataArray.length - 1; i >= 0; i--) {
                    const quote = dataArray[i];
                    if (new Date(quote.date).getTime() <= targetTime) {
                        historicalPrice = quote.adjClose || quote.close;
                        break;
                    }
                }

                if (historicalPrice && latestPrice) {
                    return ((latestPrice - historicalPrice) / historicalPrice) * 100;
                }
                return null;
            };

            const updateReturnUI = (id: string, val: number | null) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (val === null) {
                    el.textContent = 'Brak';
                    el.style.color = 'var(--text-secondary)';
                } else {
                    const sign = val >= 0 ? '+' : '';
                    el.textContent = `${sign}${val.toFixed(2)}%`;
                    el.style.color = val >= 0 ? '#3CD859' : '#FF5252';
                }
            };

            // Obliczanie dla spółki
            updateReturnUI('ov-return-6m', calculateReturn(0.5, rawPriceData || []));
            updateReturnUI('ov-return-1y', calculateReturn(1, rawPriceData || []));
            updateReturnUI('ov-return-3y', calculateReturn(3, rawPriceData || []));
            updateReturnUI('ov-return-5y', calculateReturn(5, rawPriceData || []));
            updateReturnUI('ov-return-10y', calculateReturn(10, rawPriceData || []));

            // Obliczanie dla sektora
            updateReturnUI('ov-sec-return-6m', calculateReturn(0.5, sectorPriceData || []));
            updateReturnUI('ov-sec-return-1y', calculateReturn(1, sectorPriceData || []));
            updateReturnUI('ov-sec-return-3y', calculateReturn(3, sectorPriceData || []));
            updateReturnUI('ov-sec-return-5y', calculateReturn(5, sectorPriceData || []));
            updateReturnUI('ov-sec-return-10y', calculateReturn(10, sectorPriceData || []));
        }

        let description = document.getElementById('ov-description');
        if (description) {            
            // Aktualizujemy tekst, jeśli mamy dane z Yahoo
            if (currentQuoteInfo && currentQuoteInfo.description) {
                description.textContent = currentQuoteInfo.description;
                description.style.display = 'block';
            } else if (description) {
                description.style.display = 'none'; // Ukryj box, jeśli dla tej spółki brakuje opisu
            }
        }



        // ==========================================
        // --- NOWE: RENDEROWANIE PODOBNYCH SPÓŁEK ---
        // ==========================================
        let similarStocks = document.getElementById('ov-similar-companies');
        if (similarStocks) {
            if (similarCompaniesData && similarCompaniesData.length > 0) {
                
                let html = `<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">`;
                
                for (let i = 0; i < similarCompaniesData.length; i++) {
                    const comp = similarCompaniesData[i];
                    
                    // DODANO: class="similar-comp-card", data-ticker, data-name oraz style="cursor: pointer; transition: 0.2s;"
                    html += `
                    <div class="similar-comp-card" data-ticker="${comp.ticker}" data-name="${comp.name}" 
                         style="cursor: pointer; flex: 1; min-width: 100px; background: var(--bg-secondary, rgba(150, 150, 150, 0.05)); border: 1px solid var(--border-color, rgba(150, 150, 150, 0.2)); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; transition: background-color 0.2s;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${comp.ticker}</div>
                                <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;" title="${comp.name}">${comp.name}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 11px; color: var(--text-secondary);">P/E</div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">${comp.pe ? comp.pe.toFixed(2) : 'Brak'}</div>
                            </div>
                        </div>
                        
                        <!-- Kontener dla mini-wykresu (Chart.js dostosuje się do rozmiaru rodzica) -->
                        <div style="height: 40px; width: 100%; position: relative; margin-top: auto;">
                            <canvas id="sparkline-${i}"></canvas>
                        </div>
                    </div>`;
                }
                html += `</div>`;
                similarStocks.innerHTML = html;
                similarStocks.style.display = 'block';

                // 1. Odpalamy instancje Chart.js
                for (let i = 0; i < similarCompaniesData.length; i++) {
                    const comp = similarCompaniesData[i];
                    const canvas = document.getElementById(`sparkline-${i}`) as HTMLCanvasElement;
                    
                    if (canvas && comp.prices && comp.prices.length > 0) {
                        const isPositive = comp.prices[comp.prices.length - 1] >= comp.prices[0];
                        const sparkColor = isPositive ? '#3CD859' : '#FF5252';
                        
                        new Chart(canvas, {
                            type: 'line',
                            data: {
                                labels: comp.prices.map((_: any, idx: number) => idx.toString()),
                                datasets: [{
                                    data: comp.prices,
                                    borderColor: sparkColor,
                                    borderWidth: 1.5,
                                    pointRadius: 0,
                                    tension: 0.1,
                                    fill: false
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                animation: false,
                                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                scales: { x: { display: false }, y: { display: false } },
                                layout: { padding: 0 }
                            }
                        });
                    }
                }

                // ==========================================================
                // 2. DODANO: Obsługa kliknięcia w kafelki podobnych spółek
                // ==========================================================
                document.querySelectorAll('.similar-comp-card').forEach(card => {
                    // Opcjonalnie: efekt najechania myszką
                    card.addEventListener('mouseenter', (e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover, rgba(150, 150, 150, 0.15))';
                    });
                    card.addEventListener('mouseleave', (e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary, rgba(150, 150, 150, 0.05))';
                    });

                    // Faktyczne kliknięcie
                    card.addEventListener('click', (e) => {
                        const currentTarget = e.currentTarget as HTMLElement;
                        const targetTicker = currentTarget.dataset.ticker;
                        const targetName = currentTarget.dataset.name;

                        if (targetTicker) {
                            // Ładujemy dane dla klikniętej spółki
                            loadSecData(targetTicker);
                            
                            // Aktualizujemy tytuł u góry
                            const title = document.getElementById('company-title');
                            if (title && targetName) {
                                title.textContent = targetName;
                            }

                            // Opcjonalnie: wpisujemy kliknięty ticker do inputa wyszukiwarki (jeśli istnieje)
                            const tickerInput = document.getElementById('ticker-input') as HTMLInputElement;
                            if (tickerInput) {
                                tickerInput.value = targetTicker;
                            }
                            

                            const scrollContainer = document.getElementById('main-content');
                            if (scrollContainer) {
                                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }
                    });
                });
                // ==========================================================

            } else if (similarStocks) {
                similarStocks.style.display = 'none';
            }
        }
        // ==========================================


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
                <div style="background: none; padding: 16px; border-radius: 8px; border: none; display: flex; flex-direction: column;">
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
    
    if (currentMainTab === 'indicators' || currentMainTab === 'statements') {
        periodToggle.style.display = 'block';
    } else {
        periodToggle.style.display = 'none';
    }
    // Dla pozostałych tabów (Statements, Indicators, itp.)
    overviewContainer.style.display = 'none';
    tableContainer.style.display = 'block';
    subTabs.style.display = currentMainTab === 'statements' ? 'flex' : 'none';

const columns = currentPeriod === 'annual' ? getAnnualColumns() : getQuarterlyColumns();
    const metricsToUse = currentMainTab === 'statements' ? METRICS_MAP[currentTab] : METRICS_MAP[currentMainTab];
    
    // Zabezpieczenie przed brakiem definicji dla nowych pustych zakładek (macro)
    if (!metricsToUse) return; 

    // Wewnętrzne wyliczenia zachowujemy na oryginalnych kolumnach (dla bezpieczeństwa wskaźników)
    const tableData = processSecData(metricsToUse, columns);
    
    // =========================================================================
    // NOWE: Filtrujemy lata przed 2009 i odwracamy oś czasu (od lewej do prawej)
    // =========================================================================
    const displayColumns = columns
        .filter(col => parseInt(col.substring(0, 4)) >= 2009)
        .reverse();

    // Do wyrysowania tabeli i wykresu używamy już nowych, obciętych i odwróconych kolumn
    renderCleanTable(tableData, displayColumns);

    const chartData = currentMainTab === 'statements' 
        ? tableData 
        : processSecData(METRICS_MAP.income, columns);
        
    renderChart(chartData, displayColumns);

    // =========================================================================
    // NOWE: Automatyczne przewinięcie paska tabeli na sam koniec (do najnowszych lat)
    // =========================================================================
    setTimeout(() => {
        const tableContainerEl = document.getElementById('table-container');
        if (tableContainerEl) {
            tableContainerEl.scrollLeft = tableContainerEl.scrollWidth;
        }
        const chartScrollEl = document.getElementById('chart-scroll-area');
        if (chartScrollEl && currentMainTab === 'statements') {
            chartScrollEl.scrollLeft = chartScrollEl.scrollWidth;
        }
    }, 50);
}

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
            else if (def.label === 'Gross profit') {
                const reportedGross = extractValue(def.tags, col);
                if (reportedGross !== null) {
                    values[col] = reportedGross; // Spółka podała wynik na tacy (np. Apple)
                } else {
                    // Wyliczamy ręcznie: Przychody - Koszty
                    const revTags = METRICS_MAP.income.find(m => m.label === 'Revenue')?.tags || [];
                    const costTags = METRICS_MAP.income.find(m => m.label === 'Cost of revenue')?.tags || [];
                    
                    const rev = extractValue(revTags, col);
                    const cost = extractValue(costTags, col);
                    
                    // Jeśli mamy obie wartości, liczymy. W przypadku Mastercard 'cost' będzie null, 
                    // więc poprawnie zwróci null (bo Mastercard nie ma COGS).
                    if (rev !== null && cost !== null) {
                        values[col] = rev - cost;
                    } else {
                        values[col] = null;
                    }
                }
            }
            // =================================================================
            // 5. NOWE: Ręczne wyliczanie "Zysku operacyjnego" dla firm typu Single-Step
            // =================================================================
            else if (def.label === 'Operating income') {
                const reportedOpInc = extractValue(def.tags, col);
                if (reportedOpInc !== null) {
                    values[col] = reportedOpInc;
                } else {
                    // Skoro nie podali Zysku Operacyjnego, szacujemy zysk wyliczając EBIT
                    // (Zysk przed opodatkowaniem + zapłacone odsetki od długu)
                    const ebtTags = METRICS_MAP.income.find(m => m.label === 'Income before income tax')?.tags || [];
                    const ebt = extractValue(ebtTags, col);
                    const interest = extractValue(['InterestExpense', 'InterestExpenseDebt', 'InterestExpenseNet'], col) || 0;
                    
                    if (ebt !== null) {
                        values[col] = ebt + interest;
                    } else {
                        values[col] = null;
                    }
                }
            }
            else if (def.label === 'Revenue') {
                const reportedRev = extractValue(def.tags, col);
                
                if (reportedRev !== null) {
                    values[col] = reportedRev; // Mamy standardowy tag (np. Apple, Microsoft)
                } else {
                    // Instytucje finansowe często ukrywają sumę pod niestandardowym tagiem.
                    // Składamy sumę z klocków US-GAAP: Przychody pozaodsetkowe + Odsetki netto
                    const nonInterest = extractValue(['NoninterestIncome', 'FeesAndCommissions'], col) || 0;
                    const netInterest = extractValue(['InterestIncomeExpenseNet', 'NetInterestIncome'], col) || 0;
                    
                    const totalCalculated = nonInterest + netInterest;
                    
                    // Jeśli znaleźliśmy jakiekolwiek dane bankowe, wstawiamy wynik
                    if (totalCalculated !== 0) {
                        values[col] = totalCalculated;
                    } else {
                        values[col] = null;
                    }
                }
            }
            // =================================================================
            // 6. Standardowe zyski i przychody bazowe (Nie korygujemy o splity)
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

    const chartWrapper = document.getElementById('chart-wrapper')!;
    chartWrapper.style.display = 'block';

    // Odbieramy głównemu wrapperowi scrollowanie (żeby legenda stała w miejscu)
    chartWrapper.style.overflowX = 'hidden'; 
    chartWrapper.style.position = 'relative';

    // 1. KONTENER NA ZAMROŻONĄ LEGENDĘ (HTML)
    let legendContainer = document.getElementById('custom-chart-legend');
    if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.id = 'custom-chart-legend';
        legendContainer.style.display = 'flex';
        legendContainer.style.justifyContent = 'center';
        legendContainer.style.flexWrap = 'wrap';
        legendContainer.style.gap = '16px';
        legendContainer.style.marginBottom = '12px'; // Odstęp legendy od wykresu
        
        // Wstawiamy na sam szczyt chart-wrappera
        chartWrapper.insertBefore(legendContainer, chartWrapper.firstChild);
    }
    legendContainer.innerHTML = ''; // Czyścimy przy każdym odświeżeniu

    // 2. KONTENER Z PASKIEM PRZEWIJANIA 
    let scrollArea = document.getElementById('chart-scroll-area');
    if (!scrollArea) {
        scrollArea = document.createElement('div');
        scrollArea.id = 'chart-scroll-area';

        // TUTAJ DODAJEMY WYSOKOŚĆ:
        scrollArea.style.height = 'calc(100% - 40px)'; // 100% wysokości minus miejsce na legendę
        scrollArea.style.minHeight = '350px';          // Bezpiecznik (ustaw np. na 350px lub 400px)
        scrollArea.style.paddingBottom = '10px';
        chartWrapper.insertBefore(scrollArea, legendContainer.nextSibling);
    }

    // 3. ELASTYCZNY KONTENER NA CANVAS
    let innerContainer = document.getElementById('chart-inner-container');
    if (!innerContainer) {
        innerContainer = document.createElement('div');
        innerContainer.id = 'chart-inner-container';
        innerContainer.style.position = 'relative';
        innerContainer.style.height = '100%'; 

        scrollArea.appendChild(innerContainer);
        innerContainer.appendChild(ctx);
    }

    // Zmiana szerokości w zależności od ilości danych w Statements
    if (currentMainTab === 'statements') {
        const pointsFor10Years = currentPeriod === 'quarterly' ? 40 : 10;
        const widthPercent = Math.max(100, (columns.length / pointsFor10Years) * 100);
        
        innerContainer.style.width = `${widthPercent}%`;
        scrollArea.style.overflowX = 'auto';
        scrollArea.style.overflowY = 'hidden';
    } else {
        innerContainer.style.width = '100%';
        scrollArea.style.overflowX = 'hidden';
    }

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

        const maxVolume = Math.max(...volumes, 1);
        const maxPrice = Math.max(...prices, 1);
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
                        backgroundColor: (context: any) => {
                            const chart = context.chart;
                            const { ctx, chartArea, scales } = chart;
                            if (!chartArea || !scales['yPrice']) return null; 
                            
                            const yAxis = scales['yPrice'];
                            const gradient = ctx.createLinearGradient(0, yAxis.top, 0, yAxis.bottom);
                            
                            gradient.addColorStop(0, 'rgba(60, 216, 89, 0.4)');
                            gradient.addColorStop(1, 'rgba(60, 216, 89, 0)');  
                            
                            return gradient;
                        },
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
                        tension: 0.2,
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
                    legend: { display: false } // ZABRONIONA NATYWNA LEGENDA
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

        let averagePE = 0;
        if (peDataPoints.length > 0) {
            const sumPE = peDataPoints.reduce((acc, val) => acc + val, 0);
            averagePE = sumPE / peDataPoints.length;
        }
        
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
                {
                    label: `Średnie P/E (${averagePE.toFixed(2)})`, 
                    data: averageDataPoints,
                    borderColor: 'rgba(255, 82, 82, 0.8)', 
                    borderWidth: 2,
                    borderDash: [5, 5], 
                    pointRadius: 0,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false } }, // ZABRONIONA NATYWNA LEGENDA
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
        const chartLabels = [...columns];
        let datasets: any[] = [];
        let yScaleOptions: any = {
            ticks: {
                callback: function(value: any) {
                    if (value >= 1.0e9 || value <= -1.0e9) return ((value / 1.0e9).toFixed(1) + 'B');
                    if (value >= 1.0e6 || value <= -1.0e6) return ((value / 1.0e6).toFixed(1) + 'M');
                    return value;
                }
            },
            grid: {
                color: 'rgba(150, 150, 150, 0.1)'
            }
        };

        const getRowValues = (labelToFind: string) => {
            const row = tableData.find(r => r.label === labelToFind);
            return chartLabels.map(col => row?.values[col] || 0);
        };

        if (currentTab === 'income') {
            datasets = [
                { label: 'Revenue', data: getRowValues('Revenue'), backgroundColor: '#448AFF', borderRadius: 2 },
                { label: 'Gross profit', data: getRowValues('Gross profit'), backgroundColor: '#4DD0E1', borderRadius: 2 },
                { label: 'Operating income', data: getRowValues('Operating income'), backgroundColor: '#F57F17', borderRadius: 2 },
                { label: 'Income before tax', data: getRowValues('Income before income tax'), backgroundColor: '#B388FF', borderRadius: 2 },
                { label: 'Net income', data: getRowValues('Net income'), backgroundColor: '#FBC02D', borderRadius: 2 }
            ];
        } 
        else if (currentTab === 'balance') {
            datasets = [
                { label: 'Total Assets', data: getRowValues('Total Assets'), backgroundColor: '#448AFF', borderRadius: 2 },
                { label: 'Total Liabilities', data: getRowValues('Total Liabilities'), backgroundColor: '#4DD0E1', borderRadius: 2 }
            ];
        } 
        else if (currentTab === 'cashflow') {
            const opData = getRowValues('Operating Cash Flow');
            const invData = getRowValues('Investing Cash Flow');
            const finData = getRowValues('Financing Cash Flow');

            datasets = [
                { label: 'Operating Cash Flow', data: opData, backgroundColor: '#448AFF', borderRadius: 2 },
                { label: 'Investing Cash Flow', data: invData, backgroundColor: '#4DD0E1', borderRadius: 2 },
                { label: 'Financing Cash Flow', data: finData, backgroundColor: '#F57F17', borderRadius: 2 }
            ];

            let maxAbs = 0;
            [...opData, ...invData, ...finData].forEach(val => {
                if (Math.abs(val) > maxAbs) maxAbs = Math.abs(val);
            });
            maxAbs = maxAbs * 1.1; 
            
            if (maxAbs === 0) maxAbs = 1000; 

            yScaleOptions.min = -maxAbs;
            yScaleOptions.max = maxAbs;
            
            yScaleOptions.grid = {
                color: (context: any) => {
                    if (context.tick.value === 0) return 'rgba(150, 150, 150, 0.5)'; 
                    return 'rgba(150, 150, 150, 0.1)';
                },
                lineWidth: (context: any) => {
                    if (context.tick.value === 0) return 2;
                    return 1;
                }
            };
            datasets = datasets.map(ds => ({
                ...ds,
                categoryPercentage: 0.50, 
                barPercentage: 0.95 
                }));
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false }, // ZABRONIONA NATYWNA LEGENDA
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
                    y: yScaleOptions
                }
            }
        });
    }

    // ====================================================================
    // 3. GENEROWANIE WŁASNEJ ZAMROŻONEJ LEGENDY HTML
    // ====================================================================
    if (chartInstance && legendContainer) {
        const chartDatasets = chartInstance.data.datasets;
        let html = '';
        
        chartDatasets.forEach((ds: any) => {
            let color = '#888';
            if (typeof ds.borderColor === 'string' && ds.borderColor !== 'transparent') {
                color = ds.borderColor;
            } else if (typeof ds.backgroundColor === 'string') {
                color = ds.backgroundColor;
            }
            
            // Reaguje nawet na Twoją linię przerywaną 'borderDash' z Indicators!
            let borderStyle = ds.borderDash 
                ? `border: 2px dashed ${color}; background: transparent; box-sizing: border-box;` 
                : `background: ${color};`;

            html += `
                <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-primary, #e1e1e1); font-weight: 500;">
                    <div style="width: 14px; height: 14px; border-radius: 3px; ${borderStyle}"></div>
                    <span>${ds.label}</span>
                </div>
            `;
        });
        
        legendContainer.innerHTML = html;
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


// ==========================================
// --- NOWE: MODUŁ MAKROEKONOMII ---
// ==========================================
let currentMacroCountry = 'US';
let currentMacroCurrency = 'USDPLN=X';
let macroChartInstances: Record<string, any> = {};

// Podłączamy przyciski nawigacyjne makro
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.macro-country-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.macro-country-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentMacroCountry = target.dataset.country!;
            loadMacroData(); // Ładuje tylko makro (bez walut, by było szybciej)
        });
    });

    document.querySelectorAll('.macro-currency-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.macro-currency-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget as HTMLButtonElement;
            target.classList.add('active');
            currentMacroCurrency = target.dataset.currency!;
            loadMacroCurrency(); // Ładuje tylko walutę
        });
    });
});

// Główna funkcja ładująca pełny panel po kliknięciu w zakładkę
function loadMacroTab() {
    loadMacroCurrency();
    loadMacroData();
}

async function loadMacroCurrency() {
    try {
        const prices = await (window as any).electronAPI.getHistoricalPrices(currentMacroCurrency);
        if (prices && prices.length > 0) {
            // POPRAWKA: Używamy new Date(), aby wymusić tekst niezależnie od tego co wyśle Yahoo, 
            // a dopiero potem go tniemy split('T')
            const labels = prices.map((p: any) => new Date(p.date).toISOString().split('T')[0]);
            const data = prices.map((p: any) => p.close);
            renderGenericChart('macro-currency-chart', currentMacroCurrency, labels, data, '#3CD859', false);
        }
    } catch (e) {
        console.error("Błąd pobierania walut:", e);
    }
}

async function loadMacroData() {
    try {
        const data = await (window as any).electronAPI.getMacroData(currentMacroCountry);
        
        if (data.RGDP) renderGenericChart('macro-gdp-chart', 'PKB (Real)', data.RGDP.dates, data.RGDP.values, '#2962FF', false);
        if (data.Y10YD) renderGenericChart('macro-rates-chart', 'Główna stopa procentowa (%)', data.Y10YD.dates, data.Y10YD.values, '#FFB300', false);
        if (data.CPI) renderGenericChart('macro-inflation-chart', 'Inflacja CPI r/r (%)', data.CPI.dates, data.CPI.values, '#FF5252', false);
        if (data.URATE) renderGenericChart('macro-unemployment-chart', 'Bezrobocie (%)', data.URATE.dates, data.URATE.values, '#9C27B0', false);
        if (data.EMP) renderGenericChart('macro-jobs-chart', 'Zmiana zatrudnienia', data.EMP.dates, data.EMP.values, '#00E676', true);

        // --- NOWE WSKAŹNIKI ---
        if (data.PMI) renderGenericChart('macro-pmi-chart', 'Produkcja Przemysłowa', data.PMI.dates, data.PMI.values, '#00B0FF', false);
        if (data.CCI) renderGenericChart('macro-cci-chart', 'Consumer Confidence', data.CCI.dates, data.CCI.values, '#FF9100', false);
        
        // Zmiana nazwy w zależności od kraju
        const jClaimsLabel = currentMacroCountry === 'US' ? 'Initial Jobless Claims (Tygodniowe)' : 'Całkowita liczba bezrobotnych';
        if (data.JCLAIMS) renderGenericChart('macro-jclaims-chart', jClaimsLabel, data.JCLAIMS.dates, data.JCLAIMS.values, '#F50057', false);
        
        // Bilans handlowy jest renderowany jako wykres słupkowy (true), żeby łatwo zobaczyć deficyt (czerwone/zielone słupki na osi O)
        if (data.TRADE) renderGenericChart('macro-trade-chart', 'Bilans handlowy', data.TRADE.dates, data.TRADE.values, '#651FFF', true);

    } catch (e) {
        console.error("Błąd pobierania makroekonomii:", e);
    }
}

// Uniwersalny render do obsługi 6 małych wykresów
function renderGenericChart(canvasId: string, label: string, dates: string[], values: number[], color: string, isBar: boolean) {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!ctx) return;

    if (macroChartInstances[canvasId]) {
        macroChartInstances[canvasId].destroy();
    }

    macroChartInstances[canvasId] = new Chart(ctx, {
        type: isBar ? 'bar' : 'line',
        data: {
            labels: dates,
            datasets: [{
                label: label,
                data: values,
                borderColor: color,
                backgroundColor: isBar ? color : `${color}1A`, // 1A to przezroczystość w Hex
                borderWidth: 2,
                pointRadius: 0,
                fill: !isBar,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { maxTicksLimit: 8 } } },
            interaction: { mode: 'index', intersect: false }
        }
    });
}

// ==========================================
// --- MODUŁ EARNINGS (HISTORIA + PROGNOZY) ---
// ==========================================
// ==========================================
// --- MODUŁ EARNINGS (HISTORIA + PROGNOZY) ---
// ==========================================
// ==========================================
// --- MODUŁ EARNINGS (HISTORIA + PROGNOZY) ---
// ==========================================
function renderEarnings() {
    if (!currentEarningsData) return;

    // Niszczenie starych instancji wykresów
    if (annualEarningsChartInstance) annualEarningsChartInstance.destroy();
    if (quarterlyEarningsChartInstance) quarterlyEarningsChartInstance.destroy();

    const trendData = currentEarningsData.trend || [];
    const historyData = currentEarningsData.history || [];

    // --- 1. RENDEROWANIE WYKRESU ROCZNEGO (TRADINGVIEW STYLE) ---
    const ctxAnnual = document.getElementById('annual-earnings-chart') as HTMLCanvasElement;
    if (ctxAnnual) {
        const columns = getAnnualColumns(); 
        const incomeData = processSecData(METRICS_MAP.income, columns);
        const epsRow = incomeData.find(r => r.label === 'EPS (Basic)') ?? incomeData.find(r => r.label === 'Basic');

        const aLabels: string[] = [];
        const aActuals: (number | null)[] = [];
        const aEstimates: (number | null)[] = [];

        const currentYear = new Date().getFullYear();

        // POPRAWKA: Pętla startująca zawsze od legendarnego 2009 roku!
        const startYear = 2009;
        for (let y = startYear; y < currentYear; y++) {
            const yearStr = y.toString();
            aLabels.push(yearStr);
            const val = epsRow?.values[yearStr];
            aActuals.push(val !== undefined ? val : null);
            aEstimates.push(null); // Szare słupki są puste dla historii
        }

        // Prognozy Yahoo
        const t0y = trendData.find((t: any) => t.period === '0y');
        const t1y = trendData.find((t: any) => t.period === '+1y');

        const eps0y = t0y?.earningsEstimate?.avg;
        const eps1y = t1y?.earningsEstimate?.avg;


        // Szary słupek 1: Rok bieżący (0y)
        aLabels.push(currentYear.toString());
        aActuals.push(null);
        aEstimates.push(eps0y != null ? eps0y : null);

        // Szary słupek 2: Przyszły rok (+1y)
        aLabels.push((currentYear + 1).toString());
        aActuals.push(null);
        aEstimates.push(eps1y != null ? eps1y : null);



        annualEarningsChartInstance = new Chart(ctxAnnual, {
            type: 'bar',
            data: {
                labels: aLabels,
                datasets: [
                    {
                        label: 'Zgłoszono (Rzeczywisty)',
                        data: aActuals,
                        backgroundColor: '#2962FF',
                        borderRadius: 2,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Szacunkowo (Prognoza)',
                        data: aEstimates,
                        backgroundColor: 'rgba(150, 150, 150, 0.15)',
                        borderColor: 'rgba(150, 150, 150, 0.4)',
                        borderWidth: 1,
                        borderRadius: 2,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: {
                        callbacks: {
                            label: function(context: any) {
                                if (context.parsed.y == null) return null;
                                return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // --- 2. RENDEROWANIE WYKRESU KWARTALNEGO (TRAFIENIA W PROGNOZY) ---
    const ctxQuarterly = document.getElementById('quarterly-earnings-chart') as HTMLCanvasElement;
    if (ctxQuarterly) {
        const validData = historyData.filter((d: any) => d.epsEstimate != null && d.epsActual != null);
        
        if (validData.length > 0) {
            const qLabels = validData.map((d: any) => {
                if (!d.quarter) return 'N/A';
                const dateObj = new Date(d.quarter);
                if (isNaN(dateObj.getTime())) return d.quarter;
                const q = Math.floor(dateObj.getMonth() / 3) + 1;
                return `Q${q} '${dateObj.getFullYear().toString().slice(-2)}`;
            });

            const qEstimates = validData.map((d: any) => d.epsEstimate);
            const qActuals = validData.map((d: any) => d.epsActual);

            quarterlyEarningsChartInstance = new Chart(ctxQuarterly, {
                type: 'bar',
                data: {
                    labels: qLabels,
                    datasets: [
                        {
                            label: 'Prognoza',
                            data: qEstimates,
                            backgroundColor: 'rgba(150, 150, 150, 0.3)',
                            borderColor: 'rgba(150, 150, 150, 0.8)',
                            borderWidth: 1,
                            borderRadius: 4,
                            barPercentage: 0.8,
                            categoryPercentage: 0.8
                        },
                        {
                            label: 'Rzeczywistość',
                            data: qActuals,
                            backgroundColor: (context: any) => {
                                const index = context.dataIndex;
                                return qActuals[index] >= qEstimates[index] ? 'rgba(60, 216, 89, 0.8)' : 'rgba(255, 82, 82, 0.8)';
                            },
                            borderColor: (context: any) => {
                                const index = context.dataIndex;
                                return qActuals[index] >= qEstimates[index] ? 'rgba(60, 216, 89, 1)' : 'rgba(255, 82, 82, 1)';
                            },
                            borderWidth: 1,
                            borderRadius: 4,
                            barPercentage: 0.8,
                            categoryPercentage: 0.8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context: any) {
                                    return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                                },
                                afterLabel: function(context: any) {
                                    if (context.datasetIndex === 1) { 
                                        const surprise = validData[context.dataIndex].surprisePercent;
                                        if (surprise != null) {
                                            const sign = surprise > 0 ? '+' : '';
                                            return `Zaskoczenie: ${sign}${(surprise * 100).toFixed(2)}%`;
                                        }
                                    }
                                    return null;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }
}