import { Utils } from '../utils/helpers.js';
import { COUNTRY_CODE_MAP } from '../utils/constants.js';

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

        this.setupPaginationListeners();
        this.setupABCListeners();
        this._injectSettingsToggle();
    }

    setupPaginationListeners() {
        if (!this.els.btnPrev || !this.els.btnNext) return;
        this.els.btnPrev.onclick = () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.renderTable();
                this.updatePaginationControls();
            }
        };
        this.els.btnNext.onclick = () => {
            const filtered = this.state.getFilteredClients();
            const maxPage = Math.ceil(filtered.length / this.state.rowsPerPage);
            if (this.state.currentPage < maxPage) {
                this.state.currentPage++;
                this.renderTable();
                this.updatePaginationControls();
            }
        };
    }

    setupABCListeners() {
        const handler = (cls) => {
            const cur = this.state.filters.abc;
            const newFilter = cur === cls ? null : cls;
            this.state.setFilter('abc', newFilter);
        };
        if (this.els.cardA) this.els.cardA.onclick = () => handler('A');
        if (this.els.cardB) this.els.cardB.onclick = () => handler('B');
        if (this.els.cardC) this.els.cardC.onclick = () => handler('C');
    }

    _injectSettingsToggle() {
        const header = document.querySelector('header > div:nth-child(2)');
        if (header) {
            // Check if already injected?
            if (header.querySelector('button[data-ref="settings-toggle"]')) return;

            const btn = document.createElement('button');
            btn.className = "text-gray-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1";
            btn.innerHTML = `<span>⚙️</span> <span data-i18n="btnFilters">Фільтри</span>`;
            btn.dataset.ref = "settings-toggle";
            btn.onclick = () => this.els.settingsPanel.classList.toggle('hidden');
            header.insertBefore(btn, header.firstChild);
        }
    }

    onStateChange(state, type) {
        if (type === 'data_loaded') {
            this.renderDashboard(state.analysisResult);
            this.renderGlobalFilters(state.analysisResult);
            this.renderTable();
            if (this.els.detailsSection) this.els.detailsSection.classList.remove('hidden');
            const dash = document.getElementById('dashboard');
            if (dash) dash.classList.remove('hidden');
        } else if (type === 'filter_change') {
            this.renderTable();
            this._updateActiveFiltersUI();
            this._updateABCStateUI();
        } else if (type === 'data_updated_internal') {
            this.renderDashboard(state.analysisResult);
            this.renderTable();
            this._updateABCStateUI();
        }
    }

    renderDashboard(res) {
        if (!res) return;
        if (this.els.totalRev) this.els.totalRev.textContent = Utils.formatCurrency(res.totalRev);
        if (this.els.totalShip) this.els.totalShip.textContent = res.totalShipments;
        if (this.els.avgCheck) this.els.avgCheck.textContent = Utils.formatCurrency(res.avgCheckGlobal);

        // Origin Display
        if (this.els.originContainer) {
            this.els.originContainer.innerHTML = '';
            Object.entries(res.originStats)
                .sort((a, b) => b[1] - a[1])
                .forEach(([origin, rev]) => {
                    const div = document.createElement('div');
                    div.className = "flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100";
                    const flagClass = `fi fi-${(COUNTRY_CODE_MAP[origin] || 'xx').toLowerCase()}`;
                    div.innerHTML = `
                        <div class="flex items-center space-x-2">
                            <span class="${flagClass} rounded shadow-sm"></span>
                            <span class="text-sm font-medium text-gray-700">${origin}</span>
                        </div>
                        <span class="text-sm font-bold text-gray-900">${Utils.formatCurrency(rev)}</span>
                    `;
                    this.els.originContainer.appendChild(div);
                });
        }

        // Segment Filters
        if (this.els.segmentFilters) {
            this.els.segmentFilters.innerHTML = '';
            const allBtn = this._createSegmentBtn('ALL', res.totalShipments, this.state.filters.segment === 'ALL');
            this.els.segmentFilters.appendChild(allBtn);

            Object.entries(res.segmentStats).forEach(([seg, count]) => {
                const btn = this._createSegmentBtn(seg, count, this.state.filters.segment === seg);
                this.els.segmentFilters.appendChild(btn);
            });
        }

        // ABC Counts
        if (this.els.countA) this.els.countA.textContent = res.abcCounts.A;
        if (this.els.countB) this.els.countB.textContent = res.abcCounts.B;
        if (this.els.countC) this.els.countC.textContent = res.abcCounts.C;
    }

    renderGlobalFilters(res) {
        // Origins
        const origins = res.detectedOrigins || [];
        origins.sort();
        if (this.els.originFilters) {
            this.els.originFilters.innerHTML = '';
            origins.forEach(orig => {
                this.els.originFilters.appendChild(this._createFilterCheckbox('origin', orig));
            });
        }

        // Destinations
        const allDests = new Set();
        res.clients.forEach(c => Object.keys(c.destinationsMap).forEach(d => allDests.add(d)));
        const sortedDests = Array.from(allDests).sort();

        if (this.els.destFilters) {
            this.els.destFilters.innerHTML = '';
            sortedDests.forEach(d => {
                this.els.destFilters.appendChild(this._createFilterCheckbox('dest', d));
            });
        }

        // Listeners for Select All/None
        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

        bind('btnSelectAllOrigin', () => {
            this.state.setFilter('origins', origins);
            this._updateCheckboxState('origin', origins);
        });
        bind('btnUnselectAllOrigin', () => {
            this.state.setFilter('origins', []);
            this._updateCheckboxState('origin', []);
        });
        bind('btnSelectAllDest', () => {
            this.state.setFilter('country', sortedDests);
            this._updateCheckboxState('dest', sortedDests);
        });
        bind('btnUnselectAllDest', () => {
            this.state.setFilter('country', []);
            this._updateCheckboxState('dest', []);
        });
    }

    _createFilterCheckbox(type, val) {
        const code = COUNTRY_CODE_MAP[val] || 'xx';
        const label = document.createElement('label');
        label.className = "flex items-center space-x-2 text-xs cursor-pointer p-1 hover:bg-gray-100 rounded";
        label.innerHTML = `
            <input type="checkbox" class="form-checkbox text-indigo-600 rounded w-3 h-3" value="${val}" checked>
            <span class="fi fi-${code.toLowerCase()}"></span>
            <span>${val}</span>
        `;
        const inp = label.querySelector('input');
        inp.onchange = (e) => {
            const container = this.els[type === 'origin' ? 'originFilters' : 'destFilters'];
            const checkedMap = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
            this.state.setFilter(type === 'origin' ? 'origins' : 'country', checkedMap);
        };
        return label;
    }

    _updateCheckboxState(type, values) {
        const container = this.els[type === 'origin' ? 'originFilters' : 'destFilters'];
        if (!container) return;
        const inputs = container.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.checked = values.includes(inp.value);
        });
    }

    _createSegmentBtn(seg, count, isActive) {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1 rounded text-xs font-medium border transition-colors ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`;
        btn.textContent = `${seg} (${count})`;
        btn.onclick = () => this.state.setFilter('segment', seg);
        return btn;
    }

    _updateActiveFiltersUI() {
        // Segment
        const currentSeg = this.state.filters.segment;
        if (this.els.segmentFilters) {
            Array.from(this.els.segmentFilters.children).forEach(btn => {
                const segText = btn.textContent.split(' (')[0];
                const isActive = segText === currentSeg;
                btn.className = `px-3 py-1 rounded text-xs font-medium border transition-colors ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`;
            });
        }

        // Badges
        const segLabel = document.getElementById('currentFilterLabel');
        if (segLabel) {
            segLabel.textContent = `Segment: ${currentSeg}`;
            segLabel.classList.remove('hidden');
        }

        const countryLabel = document.getElementById('countryFilterLabel');
        if (countryLabel) {
            if (this.state.filters.country.length > 0) {
                const txt = this.state.filters.country.length > 3 ? `${this.state.filters.country.length} selected` : this.state.filters.country.join(', ');
                countryLabel.textContent = `Dest: ${txt} ✖`;
                countryLabel.classList.remove('hidden');
                countryLabel.onclick = () => {
                    this.state.setFilter('country', []);
                    this._updateCheckboxState('dest', []);
                };
            } else {
                countryLabel.classList.add('hidden');
            }
        }
    }

    _updateABCStateUI() {
        const active = this.state.filters.abc;
        ['A', 'B', 'C'].forEach(cls => {
            const el = this.els[`card${cls}`];
            if (el) {
                if (active === cls) {
                    el.classList.add('active-filter', 'ring-2', 'ring-offset-2');
                } else {
                    el.classList.remove('active-filter', 'ring-2', 'ring-offset-2');
                }
            }
        });
        const lbl = document.getElementById('abcFilterActiveLabel');
        if (lbl) {
            if (active) {
                lbl.classList.remove('hidden');
                lbl.textContent = `Class ${active} Active`;
            } else {
                lbl.classList.add('hidden');
            }
        }
    }

    renderTable() {
        if (!this.els.tableBody) return;
        const filtered = this.state.getFilteredClients();
        const total = filtered.length;
        const start = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const end = start + this.state.rowsPerPage;
        const pageData = filtered.slice(start, end);

        this.els.tableBody.innerHTML = '';
        pageData.forEach(c => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-100 hover:bg-gray-50 transition-colors";

            const nameHtml = c.isHiddenBiz ? `<span class="text-red-500 font-bold" title="Potential Hidden Business">⚠️ ${c.name}</span>` : `<span class="font-medium text-gray-900">${c.name}</span>`;
            const topDest = Object.entries(c.destinationsMap).sort((a, b) => b[1] - a[1])[0];
            const destStr = topDest ? `${topDest[0]} (${topDest[1]})` : '-';

            tr.innerHTML = `
                <td class="px-4 py-3">
                    <div class="flex flex-col">
                        ${nameHtml}
                        ${c.phone ? `<span class="text-[10px] text-gray-400">📞 ${c.phone}</span>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.abcClass === 'A' ? 'bg-green-100 text-green-700' :
                    c.abcClass === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }">${c.abcClass}</span>
                </td>
                <td class="px-4 py-3"><span class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px]">${c.segment}</span></td>
                <td class="px-4 py-3 text-right font-medium text-blue-600">${Utils.formatCurrency(c.revenue)}</td>
                <td class="px-4 py-3 text-center font-medium">${c.count}</td>
                <td class="px-4 py-3 text-right text-gray-600 bg-yellow-50/50">${Utils.formatCurrency(c.avgCheck)}</td>
                <td class="px-4 py-3 text-gray-500 bg-blue-50/30 truncate max-w-[150px]" title="${Object.keys(c.destinationsMap).join(', ')}">${destStr}</td>
                <td class="px-4 py-3 text-gray-500 bg-green-50/30 truncate max-w-[150px]" title="${c.topItems}">${c.topItems}</td>
            `;
            tr.onclick = (e) => {
                this.showClientModal(c);
            };
            this.els.tableBody.appendChild(tr);
        });

        this.updatePaginationControls(total);
    }

    updatePaginationControls(totalCount) {
        if (!this.els.pagTotal) return;
        const filtered = this.state.getFilteredClients();
        const total = totalCount !== undefined ? totalCount : filtered.length;
        const maxPage = Math.ceil(total / this.state.rowsPerPage) || 1;

        this.els.pagTotal.textContent = total;
        this.els.pagCurrent.textContent = this.state.currentPage;
        this.els.pagMax.textContent = maxPage;

        if (this.els.btnPrev) this.els.btnPrev.disabled = this.state.currentPage <= 1;
        if (this.els.btnNext) this.els.btnNext.disabled = this.state.currentPage >= maxPage;
    }

    showClientModal(client) {
        const m = this.els.modal;
        if (!m) return;

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setTxt('modalClientName', client.name);
        setTxt('modalClientSegment', client.segment);
        setTxt('modalClientRevenue', Utils.formatCurrency(client.revenue));
        setTxt('modalClientCount', client.count);
        setTxt('modalClientAvg', Utils.formatCurrency(client.avgCheck));

        const tbody = document.getElementById('modalItemsTable');
        if (tbody) {
            tbody.innerHTML = '';
            Object.entries(client.items).sort((a, b) => b[1] - a[1]).forEach(([item, count]) => {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100";
                tr.innerHTML = `<td class="py-2 text-gray-600">${item}</td><td class="py-2 text-right font-medium text-gray-800">${count}</td>`;
                tbody.appendChild(tr);
            });
        }

        m.classList.remove('hidden');
        m.classList.add('flex');
    }

    setLoading(isLoading) {
        if (!this.els.loading) return;
        if (isLoading) this.els.loading.classList.remove('hidden');
        else this.els.loading.classList.add('hidden');
    }
}
