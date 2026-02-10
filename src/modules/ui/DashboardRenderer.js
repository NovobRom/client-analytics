import { Utils } from '../../utils/helpers.js';
import { COUNTRY_CODE_MAP } from '../../utils/constants.js';

export class DashboardRenderer {
    constructor(els) {
        this.els = els;
    }

    render(res) {
        if (!res) return;
        if (this.els.totalRev) this.els.totalRev.textContent = Utils.formatCurrency(res.totalRev);
        if (this.els.totalShip) this.els.totalShip.textContent = res.clients.length;
        if (this.els.avgCheck) this.els.avgCheck.textContent = Utils.formatCurrency(res.avgCheckGlobal);

        // Origin Display
        if (this.els.originContainer) {
            this.els.originContainer.innerHTML = '';
            Object.entries(res.originStats)
                .sort((a, b) => b[1] - a[1])
                .forEach(([origin, rev]) => {
                    const div = document.createElement('div');
                    div.className = "flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100";

                    const left = document.createElement('div');
                    left.className = "flex items-center space-x-2";

                    const flag = document.createElement('span');
                    flag.className = `fi fi-${(COUNTRY_CODE_MAP[origin] || 'xx').toLowerCase()} rounded shadow-sm`;

                    const name = document.createElement('span');
                    name.className = "text-sm font-medium text-gray-700";
                    name.textContent = origin;

                    left.appendChild(flag);
                    left.appendChild(name);

                    const right = document.createElement('span');
                    right.className = "text-sm font-bold text-gray-900";
                    right.textContent = Utils.formatCurrency(rev);

                    div.appendChild(left);
                    div.appendChild(right);
                    this.els.originContainer.appendChild(div);
                });
        }

        // ABC Counts
        if (this.els.countA) this.els.countA.textContent = res.abcCounts.A;
        if (this.els.countB) this.els.countB.textContent = res.abcCounts.B;
        if (this.els.countC) this.els.countC.textContent = res.abcCounts.C;
    }
}
