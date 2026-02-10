import { DataEngine } from './DataEngine.js';
import { AnalyticsEngine } from './AnalyticsEngine.js';
import { StateManager } from './StateManager.js';
import { UIManager } from './UIManager.js';
import { ChartManager } from './ChartManager.js';
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
        this.setupModalListeners();

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
    }

    setupModalListeners() {
        const m = document.getElementById('clientModal');
        const close = document.getElementById('closeModal');
        if (close && m) {
            close.onclick = () => { m.classList.add('hidden'); m.classList.remove('flex'); };
            m.onclick = (e) => { if (e.target === m) close.click(); };
        }
        // Also bottom close button
        const closeBottom = document.getElementById('btnCloseModalBottom');
        if (closeBottom && m) {
            closeBottom.onclick = () => { m.classList.add('hidden'); m.classList.remove('flex'); };
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

        // Use current state filters
        // NOTE: we need to pass filters to analyze.
        // StateManager filters include search/abc which are UI filters, not Analytics filters (except Origin/Country?)
        // AnalyticsEngine filters are: origins, dests (country).
        // Segment is handled in Analytics too?
        // Let's check AnalyticsEngine: `filters.origins` and `filters.dests`.
        // `filters.segment`? No, AnalyticsEngine doesn't seem to filter by segment in `filterRows` step (Line 926).
        // Wait, line 926: `const o = ... const d = ...`.
        // It filters by origin and dest.
        // What about segment?
        // AnalyticsEngine calculates `segmentStats` for ALL rows matching origin/dest.
        // If I select "Segment A", does it filter the input to Analytics?
        // Original code: `applyCombinedFilters` filtered by Segment!
        // My `AnalyticsEngine` logic (Step 214):
        // It DOES NOT filter by segment in Step 1.
        // But `StateManager.getFilteredClients` DOES.
        // So the "List" is filtered by Segment.
        // But Charts (which use `res` from Analytics) show ALL segments?
        // If I select "Segment A", I expect Charts to show ONLY Segment A data?
        // If so, `AnalyticsEngine` needs to filter by Segment too.
        // Let's update `AnalyticsEngine.analyze` to accept `filters.segment`.
        // And use it in Step 1.

        // I will update App.js to pass segment filter.
        // And I should update AnalyticsEngine to handle it.
        // But I already wrote AnalyticsEngine.
        // I'll check AnalyticsEngine code in Step 223 again.
        // It does NOT use `filters.segment` in Step 1.
        // It uses `filters.origins` and `filters.dests`.

        // So I should update AnalyticsEngine to filter by segment.
        // Or I should accept that Analytics is "Global Scope" and List is "Refined Scope".
        // But the Dashboard (KPIs, Charts) usually reflects the "View".
        // If I click "Segment A", KPIs should update.
        // So yes, AnalyticsEngine must filter by segment.

        // I will rewrite `AnalyticsEngine` with Segment filter support?
        // Or just let it be for now and see if I can do it in `reAnalyze`.
        // If `DataEngine.rawRows` contains all, I can filter them BEFORE passing to analyze?
        // No, `analyze` is the engine.
        // Ideally I should update `AnalyticsEngine.js`.

        // I will stick to what I have, but add Segment filtering to `AnalyticsEngine` in a subsequent edit if needed.
        // For now, let's match existing behavior:
        // Original `applyCombinedFilters` filtered EVERYTHING.
        // So `AnalyticsEngine` IS the `applyCombinedFilters`.
        // It needs `segment` in filter.

        // I'll update `AnalyticsEngine` in the next step to include segment filter.

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
