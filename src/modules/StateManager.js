export class StateManager {
    constructor() {
        this.globalClientData = []; // Array of client objects
        this.analysisResult = null; // Full result from AnalyticsEngine

        this.currentLang = 'ua';
        this.currentPage = 1;
        this.rowsPerPage = 50;

        this.filters = {
            segment: 'ALL',
            country: [],
            origins: [],
            abc: null,
            search: ""
        };

        this.subscribers = [];
    }

    subscribe(cb) { this.subscribers.push(cb); }
    notify(eventType = 'general') {
        this.subscribers.forEach(cb => cb(this, eventType));
    }

    setAnalysisResult(result) {
        this.analysisResult = result;
        this.globalClientData = result.clients;
        // Reset granular filters on new file load, but keep maybe lang?
        this.filters.country = [];
        this.filters.origins = [];
        this.filters.abc = null;
        this.filters.search = "";
        this.currentPage = 1;
        this.notify('data_loaded');
    }

    setFilter(key, val) {
        if (key === 'segment') this.filters.segment = val;
        if (key === 'search') this.filters.search = val.toLowerCase();
        if (key === 'abc') this.filters.abc = val;
        if (key === 'country') { // Toggle logic usually handled in UI, here we just set it
            this.filters.country = val;
        }
        if (key === 'origins') this.filters.origins = val;

        this.currentPage = 1; // Reset page on filter change
        this.notify('filter_change');
    }

    toggleCountryFilter(country) {
        const idx = this.filters.country.indexOf(country);
        if (idx === -1) this.filters.country.push(country);
        else this.filters.country.splice(idx, 1);
        this.currentPage = 1;
        this.notify('filter_change');
    }

    getFilteredClients() {
        if (!this.globalClientData) return [];
        return this.globalClientData.filter(c => {
            // Segment
            if (this.filters.segment !== 'ALL' && c.segment !== this.filters.segment) return false;

            // Search
            if (this.filters.search) {
                const s = this.filters.search;
                const matchName = c.name.toLowerCase().includes(s);
                const matchPhone = c.phone && c.phone.includes(s);
                if (!matchName && !matchPhone) return false;
            }

            // Country (Destination)
            if (this.filters.country.length > 0) {
                const dests = Object.keys(c.destinationsMap);
                if (!dests.some(d => this.filters.country.includes(d))) return false;
            }

            // ABC
            if (this.filters.abc && c.abcClass !== this.filters.abc) return false;

            // Origin
            if (this.filters.origins.length > 0 && !this.filters.origins.includes(c.origin)) return false;

            return true;
        });
    }
}
