import { COUNTRY_CODE_MAP } from '../../utils/constants.js';

export class FilterManager {
    constructor(stateManager, els) {
        this.state = stateManager;
        this.els = els;
        this.setupABCListeners();
        this._injectSettingsToggle();
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
            if (header.querySelector('button[data-ref="settings-toggle"]')) return;

            const btn = document.createElement('button');
            btn.className = "text-gray-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1";
            btn.innerHTML = `<span>⚙️</span> <span data-i18n="btnFilters">Фільтри</span>`;
            btn.dataset.ref = "settings-toggle";
            btn.onclick = () => this.els.settingsPanel.classList.toggle('hidden');
            header.insertBefore(btn, header.firstChild);
        }
    }

    renderGlobalFilters(res) {
        const origins = res.detectedOrigins || [];
        origins.sort();
        if (this.els.originFilters) {
            this.els.originFilters.innerHTML = '';
            origins.forEach(orig => {
                this.els.originFilters.appendChild(this._createFilterCheckbox('origin', orig));
            });
        }

        const allDests = new Set();
        res.clients.forEach(c => Object.keys(c.destinationsMap).forEach(d => allDests.add(d)));
        const sortedDests = Array.from(allDests).sort();

        if (this.els.destFilters) {
            this.els.destFilters.innerHTML = '';
            sortedDests.forEach(d => {
                this.els.destFilters.appendChild(this._createFilterCheckbox('dest', d));
            });
        }

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

    renderSegmentFilters(res) {
        if (this.els.segmentFilters) {
            this.els.segmentFilters.innerHTML = '';
            const allBtn = this._createSegmentBtn('ALL', res.totalShipments, this.state.filters.segment === 'ALL');
            this.els.segmentFilters.appendChild(allBtn);

            Object.entries(res.segmentStats).forEach(([seg, count]) => {
                const btn = this._createSegmentBtn(seg, count, this.state.filters.segment === seg);
                this.els.segmentFilters.appendChild(btn);
            });
        }
    }

    _createSegmentBtn(seg, count, isActive) {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1 rounded text-xs font-medium border transition-colors ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`;
        btn.textContent = `${seg} (${count})`;
        btn.onclick = () => this.state.setFilter('segment', seg);
        return btn;
    }

    updateActiveFiltersUI() {
        const currentSeg = this.state.filters.segment;
        if (this.els.segmentFilters) {
            Array.from(this.els.segmentFilters.children).forEach(btn => {
                const segText = btn.textContent.split(' (')[0];
                const isActive = segText === currentSeg;
                btn.className = `px-3 py-1 rounded text-xs font-medium border transition-colors ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`;
            });
        }

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

    updateABCStateUI() {
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
}
