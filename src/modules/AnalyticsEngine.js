import { Utils } from '../utils/helpers.js';
import { FALLBACK_RATES, CONFIG } from '../utils/constants.js';

export class AnalyticsEngine {
    constructor() {
        this.rates = { ...FALLBACK_RATES };
        this.isRatesLive = false;
    }

    async fetchRates() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/EUR');
            if (res.ok) {
                const data = await res.json();
                if (data && data.rates) {
                    this.rates = { ...this.rates, ...data.rates };
                    this.isRatesLive = true;
                }
            }
        } catch (e) {
            console.warn("Could not fetch live rates, using fallback.", e);
        }
        return this.isRatesLive;
    }

    analyze(rows, colIndices, filters = {}) {
        const idxs = colIndices;
        let clients = {}, totalRev = 0, totalShipments = 0, totalWeight = 0, segmentStats = {}, countryStats = {}, originStats = {};
        let detectedOrigins = new Set();
        let minDate = null, maxDate = null;

        // 1. Filter Rows
        const filteredRows = rows.filter(row => {
            const o = (row[idxs.idxCountry] || "").toString().trim().toUpperCase();
            const d = (row[idxs.idxDestCountry] || "").toString().trim().toUpperCase();

            const origins = filters.origins || [];
            const dests = filters.country || filters.dests || [];

            const matchOrigin = (origins.length === 0) ? true : origins.includes(o);
            const matchDest = (dests.length === 0) ? true : dests.includes(d);

            const segFilter = filters.segment;
            const rowSeg = row[idxs.idxSegment] || "Unknown";
            const matchSeg = (!segFilter || segFilter === 'ALL') ? true : rowSeg === segFilter;

            return matchOrigin && matchDest && matchSeg;
        });
        // 2. Aggregate
        filteredRows.forEach(row => {
            // Date
            if (idxs.idxDate !== -1) {
                const dObj = Utils.parseDate(row[idxs.idxDate]);
                if (dObj && !isNaN(dObj.getTime())) {
                    if (!minDate || dObj < minDate) minDate = dObj;
                    if (!maxDate || dObj > maxDate) maxDate = dObj;
                }
            }

            if (!row[idxs.idxName]) return;
            const name = row[idxs.idxName];

            // Revenue
            let revRaw = row[idxs.idxRev], revenueLocal = 0;
            if (revRaw) {
                if (typeof revRaw === 'string') revRaw = revRaw.replace(',', '.').replace(/\s/g, '');
                revenueLocal = parseFloat(revRaw) || 0;
            }
            let revenueEur = revenueLocal;
            if (idxs.idxCurr !== -1) {
                let curr = row[idxs.idxCurr];
                if (curr && typeof curr === 'string') {
                    const rate = this.rates[curr.trim().toUpperCase()];
                    if (rate) revenueEur = revenueLocal / rate;
                }
            }

            // Metadata
            const segment = row[idxs.idxSegment] || "Unknown";
            let dest = row[idxs.idxDestCountry] || "N/A";
            if (typeof dest === 'string') dest = dest.trim().toUpperCase();
            let orig = row[idxs.idxCountry] || "Unknown";
            if (typeof orig === 'string' && orig !== "Unknown") orig = orig.trim().toUpperCase();
            detectedOrigins.add(orig);

            // Stats
            if (!originStats[orig]) originStats[orig] = 0;
            originStats[orig] += revenueEur;

            if (!countryStats[dest]) countryStats[dest] = { rev: 0, count: 0 };
            countryStats[dest].rev += revenueEur; countryStats[dest].count += 1;

            // Client Aggregation
            if (!clients[name]) clients[name] = {
                name: name,
                revenue: 0,
                count: 0,
                segment: segment,
                origin: orig,
                type: row[idxs.idxType],
                phone: "",
                items: {},
                destinations: {},
                weight: 0
            };

            if (idxs.idxPhone !== -1 && !clients[name].phone && row[idxs.idxPhone]) clients[name].phone = row[idxs.idxPhone];

            clients[name].revenue += revenueEur;
            clients[name].count += 1;

            // Weight
            let wRaw = (idxs.idxWeight !== -1) ? row[idxs.idxWeight] : 0;
            let wVal = 0;
            if (wRaw) {
                if (typeof wRaw === 'string') wRaw = wRaw.replace(',', '.').replace(/\s/g, '');
                wVal = parseFloat(wRaw) || 0;
            }
            clients[name].weight = (clients[name].weight || 0) + wVal;
            totalWeight += wVal;

            if (segment && segment !== "Unknown") clients[name].segment = segment;

            const item = row[idxs.idxDesc] || "N/A";
            const cleanItem = item.toString().trim().substring(0, 30);
            clients[name].items[cleanItem] = (clients[name].items[cleanItem] || 0) + 1;
            clients[name].destinations[dest] = (clients[name].destinations[dest] || 0) + 1;

            totalRev += revenueEur;
            totalShipments += 1;
        });

        // 3. Post-Process (ABC, Formatting)
        const getTopKeys = (map, limit) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(e => `${e[0]} (${e[1]})`).join(", ");

        let clientList = Object.values(clients);
        clientList.sort((a, b) => b.revenue - a.revenue);

        let runningTotal = 0, countA = 0, countB = 0, countC = 0;
        clientList = clientList.map(c => {
            runningTotal += c.revenue;
            const percentage = (runningTotal / totalRev) * 100;
            let abcClass = 'C';
            if (percentage <= 80) abcClass = 'A'; else if (percentage <= 95) abcClass = 'B';

            if (abcClass === 'A') countA++;
            if (abcClass === 'B') countB++;
            if (abcClass === 'C') countC++;

            segmentStats[c.segment] = (segmentStats[c.segment] || 0) + 1;

            return {
                ...c,
                avgCheck: c.count ? (c.revenue / c.count) : 0,
                topItems: getTopKeys(c.items, 3),
                destinationsMap: c.destinations,
                isHiddenBiz: (c.type === 'Private person' && c.count >= CONFIG.POTENTIAL_BUSINESS_COUNT),
                abcClass: abcClass
            };
        });

        return {
            clients: clientList,
            totalRev,
            totalShipments,
            totalWeight,
            avgCheckGlobal: totalShipments ? (totalRev / totalShipments) : 0,
            segmentStats,
            countryStats,
            originStats,
            abcCounts: { A: countA, B: countB, C: countC },
            detectedOrigins: Array.from(detectedOrigins),
            dateRange: { min: minDate, max: maxDate }
        };
    }
}
