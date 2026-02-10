import { Utils } from '../../utils/helpers.js';

export class TableRenderer {
    constructor(stateManager, els, modalManager) {
        this.state = stateManager;
        this.els = els;
        this.modalManager = modalManager;
        this.setupPaginationListeners();
    }

    setupPaginationListeners() {
        if (!this.els.btnPrev || !this.els.btnNext) return;
        this.els.btnPrev.onclick = () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.renderTable();
            }
        };
        this.els.btnNext.onclick = () => {
            const filtered = this.state.getFilteredClients();
            const maxPage = Math.ceil(filtered.length / this.state.rowsPerPage);
            if (this.state.currentPage < maxPage) {
                this.state.currentPage++;
                this.renderTable();
            }
        };
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
                this.modalManager.showClientModal(c);
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
}
