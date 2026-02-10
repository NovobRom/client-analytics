import { Utils } from '../../utils/helpers.js';

export class TableRenderer {
    constructor(stateManager, els, modalManager) {
        this.state = stateManager;
        this.els = els;
        this.modalManager = modalManager;
        this.setupPaginationListeners();
        this.setupSortListeners();
    }

    setupSortListeners() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                this.state.setSort(field);
                // Notification will trigger render logic via UIManager
            });
        });
    }

    updateSortIcons() {
        const { field, dir } = this.state.sort;
        document.querySelectorAll('th[data-sort]').forEach(th => {
            const f = th.getAttribute('data-sort');
            // Find text node with arrow
            let arrowNode = null;
            th.childNodes.forEach(n => {
                if (n.nodeType === 3 && (n.textContent.includes('↕') || n.textContent.includes('↑') || n.textContent.includes('↓'))) {
                    arrowNode = n;
                }
            });

            if (arrowNode) {
                if (f === field) {
                    arrowNode.textContent = dir === 'asc' ? ' ↑' : ' ↓';
                    th.classList.add('bg-gray-100'); // Highlight active sort column header
                } else {
                    arrowNode.textContent = ' ↕';
                    th.classList.remove('bg-gray-100');
                }
            }
        });
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
        this.updateSortIcons();
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
                <td class="px-4 py-3 cell-name"></td>
                <td class="px-4 py-3 text-center cell-abc"></td>
                <td class="px-4 py-3 cell-segment"></td>
                <td class="px-4 py-3 text-right font-medium text-blue-600 cell-revenue"></td>
                <td class="px-4 py-3 text-center font-medium cell-count"></td>
                <td class="px-4 py-3 text-right text-gray-600 bg-yellow-50/50 cell-avg"></td>
                <td class="px-4 py-3 text-gray-500 bg-blue-50/30 truncate max-w-[150px] cell-dest"></td>
                <td class="px-4 py-3 text-gray-500 bg-green-50/30 truncate max-w-[150px] cell-items"></td>
            `;


            // Helper to fill cell safely
            const q = (sel) => tr.querySelector(sel);

            // Name & Phone
            const nameCell = q('.cell-name');
            const nameDiv = document.createElement('div');
            nameDiv.className = "flex flex-col";
            const nameSpan = document.createElement('span');
            nameSpan.className = "font-medium text-gray-900";
            if (c.isHiddenBiz) {
                nameSpan.className = "text-red-500 font-bold";
                nameSpan.title = "Potential Hidden Business";
                nameSpan.textContent = "⚠️ " + c.name;
            } else {
                nameSpan.textContent = c.name;
            }
            nameDiv.appendChild(nameSpan);

            if (c.phone) {
                const phoneSpan = document.createElement('span');
                phoneSpan.className = "text-[10px] text-gray-400";
                phoneSpan.textContent = "📞 " + c.phone;
                nameDiv.appendChild(phoneSpan);
            }
            nameCell.appendChild(nameDiv);

            // ABC Badge
            const abcCell = q('.cell-abc');
            const abcBadge = document.createElement('span');
            abcBadge.className = `px - 2 py - 0.5 rounded text - [10px] font - bold ${c.abcClass === 'A' ? 'bg-green-100 text-green-700' :
                    c.abcClass === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                } `;
            abcBadge.textContent = c.abcClass;
            abcCell.appendChild(abcBadge);

            // Segment
            const segCell = q('.cell-segment');
            const segBadge = document.createElement('span');
            segBadge.className = "px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px]";
            segBadge.textContent = c.segment;
            segCell.appendChild(segBadge);

            // Metrics
            q('.cell-revenue').textContent = Utils.formatCurrency(c.revenue);
            q('.cell-count').textContent = c.count;
            q('.cell-avg').textContent = Utils.formatCurrency(c.avgCheck);

            // Dest
            const destCell = q('.cell-dest');
            destCell.title = Object.keys(c.destinationsMap).join(', ');
            destCell.textContent = destStr;

            // Items
            const itemCell = q('.cell-items');
            itemCell.title = c.topItems;
            itemCell.textContent = c.topItems;

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
