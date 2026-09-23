import * as cheerio from 'cheerio';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import { app } from 'electron';

const SEC_HEADERS = {
    'User-Agent': 'PortfolioTrackerApp/1.0 (pawelmlisik@gmail.com)',
    'Accept-Encoding': 'gzip, deflate',
};

const VISA_CIK = '0001403161';
const CIK_NUMBER = '1403161';
const DELAY_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { headers: SEC_HEADERS });
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (err) {
            if (attempt === retries) return null;
            await sleep(500 * attempt);
        }
    }
    return null;
}

// Ta sama ekstremalnie czyszcząca funkcja co w testowym pliku
function parseEpsFromHtml(html: string): { basic: number | null; diluted: number | null } {
    const $ = cheerio.load(html);
    let basicEps: number | null = null;
    let dilutedEps: number | null = null;
    let inClassASection = false;

    $('tr').each((_, row) => {
        if (basicEps !== null && dilutedEps !== null) return false;

        const rowText = $(row).text().replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        const rowLower = rowText.toLowerCase();

        if (rowLower.includes('class a')) {
            inClassASection = true;
        } else if (rowLower.includes('class b') || rowLower.includes('class c')) {
            inClassASection = false;
        }

        const isBasicRow = rowLower.includes('basic');
        const isDilutedRow = rowLower.includes('diluted');
        const isExplicitClassA = rowLower.includes('class a');
        const isEpsRow = rowLower.includes('per share') && (isBasicRow || isDilutedRow);

        if ((isExplicitClassA && (isBasicRow || isDilutedRow)) || (inClassASection && (isBasicRow || isDilutedRow)) || isEpsRow) {
            $(row).find('td').each((_, col) => {
                let cellText = $(col).text();
                cellText = cellText.replace(/&nbsp;/g, '').replace(/\u00a0/g, '').replace(/\s+/g, '').replace(/\$/g, '').replace(/,/g, '').replace(/\(/g, '-').replace(/\)/g, '');

                const match = cellText.match(/^-?\d*\.\d{2}$/);
                if (match) {
                    const val = parseFloat(match[0]);
                    if (isBasicRow && isDilutedRow) {
                        if (basicEps === null) basicEps = val;
                        if (dilutedEps === null) dilutedEps = val;
                    } else if (isBasicRow && basicEps === null) {
                        basicEps = val;
                    } else if (isDilutedRow && dilutedEps === null) {
                        dilutedEps = val;
                    }
                }
            });
        }
    });

    return { basic: basicEps, diluted: dilutedEps };
}

async function getIncomeStatementUrl(accessionNoClean: string, primaryDoc: string): Promise<string> {
    const summaryUrl = `https://www.sec.gov/Archives/edgar/data/${CIK_NUMBER}/${accessionNoClean}/FilingSummary.xml`;
    const xmlData = await fetchWithRetry(summaryUrl);

    if (xmlData) {
        const $ = cheerio.load(xmlData, { xmlMode: true });
        let htmlReportFile = '';
        $('Report').each((_, report) => {
            const shortName = $(report).find('ShortName').text().toLowerCase();
            if ((shortName.includes('statement') || shortName.includes('statements')) && (shortName.includes('operation') || shortName.includes('income')) && !shortName.includes('comprehensive')) {
                htmlReportFile = $(report).find('HtmlFileName').text().trim();
                return false;
            }
        });
        if (htmlReportFile) return `https://www.sec.gov/Archives/edgar/data/${CIK_NUMBER}/${accessionNoClean}/${htmlReportFile}`;
    }
    return `https://www.sec.gov/Archives/edgar/data/${CIK_NUMBER}/${accessionNoClean}/${primaryDoc}`;
}

async function initDB() {
    // Zapisujemy bazę bezpiecznie w folderze użytkownika (userData)
    const dbPath = path.join(app.getPath('userData'), 'visa_eps_data.db');
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS visa_eps (
            id INTEGER PRIMARY KEY AUTOINCREMENT, form TEXT, period_end TEXT UNIQUE, filing_date TEXT, basic_eps REAL, diluted_eps REAL, source_url TEXT
        );
    `);
    return db;
}

// Mapuje kalendarzowe zakończenie kwartału na Lata Fiskalne Visy (FY kończy się we wrześniu)
function mapToFiscalQuarter(form: string, periodEndStr: string): string {
    const date = new Date(periodEndStr);
    const m = date.getMonth() + 1;
    const y = date.getFullYear();

    if (form === '10-K' || m === 9) return `${y}`;
    if (m === 12) return `${y + 1} Q1`;
    if (m === 3) return `${y} Q2`;
    if (m === 6) return `${y} Q3`;
    return `${y}`;
}

export async function fetchAndSyncVisaEps() {
    const db = await initDB();
    
    // 1. Pobieramy wszystkie zapisane daty raportów
    const existingRows = await db.all('SELECT period_end FROM visa_eps');
    const existingDates = new Set(existingRows.map(r => r.period_end));

    // 2. Pobieramy plik JSON z najnowszymi raportami (bardzo szybkie żądanie)
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${VISA_CIK}.json`;
    const submissionsRaw = await fetchWithRetry(submissionsUrl);
    
    if (submissionsRaw) {
        const submissions = JSON.parse(submissionsRaw);
        const recent = submissions.filings.recent;
        const missingFilings = [];

        // 3. Sprawdzamy czy są jakieś nowe raporty, których brakuje w bazie
        for (let i = 0; i < recent.form.length; i++) {
            const formType = recent.form[i];
            const reportDate = recent.reportDate[i];
            
            if ((formType === '10-K' || formType === '10-Q') && !existingDates.has(reportDate)) {
                missingFilings.push({
                    accessionNumber: recent.accessionNumber[i],
                    reportDate: reportDate,
                    filingDate: recent.filingDate[i],
                    form: formType,
                    primaryDocument: recent.primaryDocument[i],
                });
            }
        }

        // 4. Jeśli są braki – uruchamiamy scraper WYŁĄCZNIE dla tych brakujących (lub nowego kwartału)
        if (missingFilings.length > 0) {
            console.log(`Pobieranie ${missingFilings.length} brakujących raportów Visa...`);
            for (const filing of missingFilings) {
                const accNoClean = filing.accessionNumber.replace(/-/g, '');
                const targetUrl = await getIncomeStatementUrl(accNoClean, filing.primaryDocument);
                
                await sleep(DELAY_MS);
                const html = await fetchWithRetry(targetUrl);
                let basicEps = null, dilutedEps = null;
                
                if (html) {
                    const parsed = parseEpsFromHtml(html);
                    basicEps = parsed.basic;
                    dilutedEps = parsed.diluted;
                }

                await db.run(
                    `INSERT OR REPLACE INTO visa_eps (form, period_end, filing_date, basic_eps, diluted_eps, source_url) VALUES (?, ?, ?, ?, ?, ?)`,
                    [filing.form, filing.reportDate, filing.filingDate, basicEps, dilutedEps, targetUrl]
                );
            }
        }
    }

    // 5. Pobranie kompletnych danych z bazy i sformatowanie ich w słownik (np. '2023 Q1': {basic, diluted})
    const allData = await db.all('SELECT form, period_end, basic_eps, diluted_eps FROM visa_eps');
    const resultDict: Record<string, { basic: number | null, diluted: number | null }> = {};

    for (const row of allData) {
        const key = mapToFiscalQuarter(row.form, row.period_end);
        resultDict[key] = {
            basic: row.basic_eps,
            diluted: row.diluted_eps
        };
    }

    await db.close();
    return resultDict;
}