import { Utils } from '../../utils/helpers.js';
import { COUNTRY_CODE_MAP } from '../../utils/constants.js';

export class DashboardRenderer {
    constructor(els) {
        this.els = els;
    }

    render(res) {
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

        // ABC Counts
        if (this.els.countA) this.els.countA.textContent = res.abcCounts.A;
        if (this.els.countB) this.els.countB.textContent = res.abcCounts.B;
        if (this.els.countC) this.els.countC.textContent = res.abcCounts.C;
    }
}
