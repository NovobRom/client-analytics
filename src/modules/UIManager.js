import { Utils } from '../utils/helpers.js';
import { DashboardRenderer } from './ui/DashboardRenderer.js';
import { TableRenderer } from './ui/TableRenderer.js';
import { FilterManager } from './ui/FilterManager.js';
import { ModalManager } from './ui/ModalManager.js';

export class UIManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.state.subscribe((s, type) => this.onStateChange(s, type));

        // DOM Elements
        this.els = {
            totalRev: document.getElementById('totalRevenue'),
            totalShip: document.getElementById('totalClients'),
            avgCheck: document.getElementById('avgCheckGlobal'),
            segmentFilters: document.getElementById('segmentFiltersContainer'),
            originContainer: document.getElementById('originStatsContainer'),
            tableBody: document.getElementById('clientTableBody'),
            pagTotal: document.getElementById('pagTotal'),
            pagCurrent: document.getElementById('pagCurrent'),
            pagMax: document.getElementById('pagMax'),
            btnPrev: document.getElementById('btnPrev'),
            btnNext: document.getElementById('btnNext'),
            detailsSection: document.getElementById('detailsSection'),
            modal: document.getElementById('clientModal'),
            loading: document.getElementById('loadingOverlay'),

            // ABC
            cardA: document.getElementById('cardAbcA'),
            cardB: document.getElementById('cardAbcB'),
            cardC: document.getElementById('cardAbcC'),
            countA: document.getElementById('countA'),
            countB: document.getElementById('countB'),
            countC: document.getElementById('countC'),

            // Global Filters
            originFilters: document.getElementById('originFilters'),
            destFilters: document.getElementById('destFilters'),
            settingsPanel: document.getElementById('settingsPanel')
        };

        // Initialize Sub-Managers
        this.modalManager = new ModalManager(this.els);
        this.filterManager = new FilterManager(this.state, this.els);
        this.dashboardRenderer = new DashboardRenderer(this.els);
        this.tableRenderer = new TableRenderer(this.state, this.els, this.modalManager);
    }

    onStateChange(state, type) {
        if (type === 'data_loaded') {
            this.dashboardRenderer.render(state.analysisResult);
            this.filterManager.renderGlobalFilters(state.analysisResult);
            this.filterManager.renderSegmentFilters(state.analysisResult); // New call
            this.tableRenderer.renderTable();
            if (this.els.detailsSection) this.els.detailsSection.classList.remove('hidden');
            const dash = document.getElementById('dashboard');
            if (dash) dash.classList.remove('hidden');
        } else if (type === 'filter_change') {
            this.tableRenderer.renderTable();
            this.filterManager.updateActiveFiltersUI();
            this.filterManager.updateABCStateUI();
        } else if (type === 'data_updated_internal') {
            this.dashboardRenderer.render(state.analysisResult);
            this.tableRenderer.renderTable();
            this.filterManager.updateABCStateUI();
        }
    }

    setLoading(isLoading) {
        if (!this.els.loading) return;
        if (isLoading) this.els.loading.classList.remove('hidden');
        else this.els.loading.classList.add('hidden');
    }

    // Proxy method for App.js if it calls showClientModal directly (though it shouldn't really)
    showClientModal(client) {
        this.modalManager.showClientModal(client);
    }
}
