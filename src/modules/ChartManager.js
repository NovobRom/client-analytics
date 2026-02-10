import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Utils } from '../utils/helpers.js';

export class ChartManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.charts = {};
        this.COLORS = {
            A: '#22c55e', B: '#3b82f6', C: '#ef4444',
            bar: '#3b82f6', barHover: '#2563eb'
        };
        Chart.register(ChartDataLabels);
    }

    renderAll(clients, countryStats, originStats) {
        // Prepare Data
        const topRevenue = clients.slice(0, 10);
        const sortByAvg = [...clients].sort((a, b) => b.avgCheck - a.avgCheck).slice(0, 10);
        const sortByCount = [...clients].sort((a, b) => b.count - a.count).slice(0, 10);

        const countriesSorted = Object.entries(countryStats)
            .map(([k, v]) => ({ name: k, ...v }))
            .sort((a, b) => b.rev - a.rev)
            .slice(0, 10);

        const countriesAvgSorted = Object.entries(countryStats)
            .map(([k, v]) => ({ name: k, avg: v.count ? v.rev / v.count : 0 }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 10);

        // 1. Revenue
        this._createBarChart('revenueChart',
            topRevenue.map(c => c.name),
            topRevenue.map(c => c.revenue),
            "Revenue (EUR)", this.COLORS.bar, (val) => Utils.formatCurrency(val));

        // 2. Avg Check
        this._createBarChart('avgCheckChart',
            sortByAvg.map(c => c.name),
            sortByAvg.map(c => c.avgCheck),
            "Avg Check (EUR)", '#10b981', (val) => Utils.formatCurrency(val));

        // 3. Count
        this._createBarChart('countChart',
            sortByCount.map(c => c.name),
            sortByCount.map(c => c.count),
            "Shipments", '#8b5cf6');

        // 4. Country Revenue
        this._createBarChart('countryRevenueChart',
            countriesSorted.map(c => c.name),
            countriesSorted.map(c => c.rev),
            "Country Revenue", '#f59e0b', (val) => Utils.formatCurrency(val),
            (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const country = countriesSorted[idx].name;
                    if (this.state) this.state.toggleCountryFilter(country);
                }
            }
        );

        // 5. Country Avg
        this._createBarChart('countryAvgCheckChart',
            countriesAvgSorted.map(c => c.name),
            countriesAvgSorted.map(c => c.avg),
            "Country Avg Check", '#ec4899', (val) => Utils.formatCurrency(val));

        // 6. Destination Chart (Bubble - Top 10 by Rev)
        this._createBubbleChart('destinationChart', topRevenue);
    }

    _createBarChart(id, labels, data, label, color, fmtStr, onClick) {
        if (this.charts[id]) this.charts[id].destroy();
        const ctx = document.getElementById(id).getContext('2d');
        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: color,
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: onClick,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end', align: 'top',
                        formatter: fmtStr || Math.round,
                        font: { size: 10, weight: 'bold' },
                        color: '#6b7280'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${fmtStr ? fmtStr(ctx.raw) : ctx.raw}`
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, font: { size: 9 } } }
                }
            }
        });
    }

    _createBubbleChart(id, clients) {
        if (this.charts[id]) this.charts[id].destroy();
        const ctx = document.getElementById(id).getContext('2d');

        const allDests = new Set();
        clients.forEach(c => Object.keys(c.destinationsMap).forEach(d => allDests.add(d)));
        const destList = Array.from(allDests).sort();

        const datasets = clients.map((c, i) => {
            const dataPoints = Object.entries(c.destinationsMap).map(([d, count]) => ({
                x: i, // Client Index
                y: destList.indexOf(d), // Country Index
                r: Math.min(count * 2, 30) // Size
            }));
            return {
                label: c.name,
                data: dataPoints,
                backgroundColor: Utils.getColor(i)
            };
        });

        this.charts[id] = new Chart(ctx, {
            type: 'bubble',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: 'linear', position: 'bottom',
                        min: -1, max: clients.length,
                        ticks: {
                            callback: (val) => (clients[val] ? clients[val].name : ''),
                            stepSize: 1
                        }
                    },
                    y: {
                        type: 'linear',
                        min: -1, max: destList.length,
                        ticks: {
                            callback: (val) => destList[val] || '',
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}
