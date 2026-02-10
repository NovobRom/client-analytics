import { DataEngine } from './DataEngine.js';
import { AnalyticsEngine } from './AnalyticsEngine.js';
import { StateManager } from './StateManager.js';
import { UIManager } from './UIManager.js';
import { ChartManager } from './ChartManager.js';
import { Utils } from '../utils/helpers.js';
import * as XLSX from 'xlsx';

export class App {
    constructor() {
        this.dataEngine = new DataEngine();
        this.analyticsEngine = new AnalyticsEngine();
        this.stateManager = new StateManager();
        this.uiManager = new UIManager(this.stateManager);
        this.chartManager = new ChartManager(this.stateManager);
    }

    init() {
        this.setupEventListeners();

        // Subscribe to state changes to update Charts
        this.stateManager.subscribe((state, type) => {
            if (type === 'filter_change') {
                this.reAnalyze();
            }
        });
    }

    setupEventListeners() {
        // File inputs
        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', fn); };
        bind('csvInput', (e) => this.handleFile(e.target.files[0], 'csv'));
        bind('excelInput', (e) => this.handleFile(e.target.files[0], 'excel'));
        bind('csvInputLanding', (e) => this.handleFile(e.target.files[0], 'csv'));
        bind('excelInputLanding', (e) => this.handleFile(e.target.files[0], 'excel'));

        // Search
        const searchInput = document.getElementById('searchTable');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.stateManager.setFilter('search', e.target.value);
            });
        }
        const btnReset = document.getElementById('btnResetSearch');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.stateManager.setFilter('search', '');
            });
        }

        // Export
        const btnExport = document.getElementById('btnExport');
        if (btnExport) btnExport.addEventListener('click', () => this.exportData());

        // Language Toggle
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('change', (e) => {
                const lang = e.target.checked ? 'en' : 'ua';
                this.uiManager.applyTranslations(lang);
            });
        }
    }

    async handleFile(file, type) {
        if (!file) return;
        this.uiManager.setLoading(true);
        try {
            // 1. Fetch Rates (if not yet)
            await this.analyticsEngine.fetchRates();

            // 2. Process File
            if (type === 'csv') await this.dataEngine.processCSV(file);
            else await this.dataEngine.processExcel(file);

            // 3. Initial Analyze
            const res = this.analyticsEngine.analyze(
                this.dataEngine.rawRows,
                this.dataEngine.colIndices,
                { segment: 'ALL' } // Initial filters
            );

            // 4. Update State (Fresh Load)
            this.stateManager.setAnalysisResult(res);

            // 5. Render Charts
            this.chartManager.renderAll(res.clients, res.countryStats, res.originStats);

            // 6. Badges
            const rateBadge = document.getElementById('rateBadge');
            if (rateBadge) {
                rateBadge.classList.remove('hidden');
                const rateText = document.getElementById('rateText');
                if (rateText) rateText.textContent = this.analyticsEngine.isRatesLive ? "Курс: Live (ECB)" : "Курс: Fallback";
            }

            const periodBadge = document.getElementById('periodBadge');
            if (periodBadge && res.dateRange && res.dateRange.min && res.dateRange.max) {
                const pText = document.getElementById('detectedPeriod');
                if (pText) pText.textContent = `${Utils.formatDate(res.dateRange.min)} - ${Utils.formatDate(res.dateRange.max)}`;
                periodBadge.classList.remove('hidden');
            }

            // 6. Show Main Content
            const landing = document.getElementById('landingScreen');
            if (landing) landing.classList.add('hidden');
            const main = document.getElementById('mainContent');
            if (main) main.classList.remove('hidden');

        } catch (err) {
            alert("Error processing file: " + err.message);
            console.error(err);
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    reAnalyze() {
        if (this.dataEngine.rawRows.length === 0) return;

        // Apply filters (including segment, origin, dest)
        const filters = {
            origins: this.stateManager.filters.origins,
            dests: this.stateManager.filters.country,
            segment: this.stateManager.filters.segment
        };

        const res = this.analyticsEngine.analyze(
            this.dataEngine.rawRows,
            this.dataEngine.colIndices,
            filters
        );

        this.stateManager.analysisResult = res;
        this.stateManager.globalClientData = res.clients;
        this.stateManager.notify('data_updated_internal'); // Updates Dashboard (KPIs)

        this.chartManager.renderAll(res.clients, res.countryStats, res.originStats);
    }

    exportData() {
        const data = this.stateManager.getFilteredClients().map(c => ({
            Client: c.name,
            Segment: c.segment,
            Revenue: c.revenue.toFixed(2),
            Count: c.count,
            AvgCheck: c.avgCheck.toFixed(2),
            ABC: c.abcClass,
            TopDestination: Object.entries(c.destinationsMap || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
            TopItems: c.topItems || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clients");
        XLSX.writeFile(wb, "Client_Analytics_Export.xlsx");
    }
}
