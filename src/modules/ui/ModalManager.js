import { Utils } from '../../utils/helpers.js';

export class ModalManager {
    constructor(els) {
        this.els = els;
        this.setupListeners();
    }

    setupListeners() {
        const m = this.els.modal;
        // The App.js handles opening? No, UIManager.showClientModal handled it.
        // But App.js had `setupModalListeners` for closing!
        // We should move that logic here eventually, but for now App.js does it.
        // We just handle 'showing' the modal.
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
}
