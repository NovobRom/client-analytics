import { Utils } from '../../utils/helpers.js';

export class ModalManager {
    constructor(els) {
        this.els = els;
        this.modalPanel = document.getElementById('modalPanel');
        this.btnClose = document.getElementById('btnCloseModal'); // Correct ID
        this.btnCloseBottom = document.getElementById('btnCloseModalBottom');
        this.setupListeners();
    }

    setupListeners() {
        const m = this.els.modal;
        if (!m) return;

        // Close on backdrop click
        m.addEventListener('click', (e) => {
            if (e.target === m) this.closeClientModal();
        });

        // Close buttons
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.closeClientModal());
        }
        if (this.btnCloseBottom) {
            this.btnCloseBottom.addEventListener('click', () => this.closeClientModal());
        }

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !m.classList.contains('hidden')) {
                this.closeClientModal();
            }
        });
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
            Object.entries(client.items || {}).sort((a, b) => b[1] - a[1]).forEach(([item, count]) => {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100";

                const tdItem = document.createElement('td');
                tdItem.className = "py-2 text-gray-600";
                tdItem.textContent = item;

                const tdCount = document.createElement('td');
                tdCount.className = "py-2 text-right font-medium text-gray-800";
                tdCount.textContent = count;

                tr.appendChild(tdItem);
                tr.appendChild(tdCount);
                tbody.appendChild(tr);
            });
        }

        // Show Logic
        m.classList.remove('hidden');
        m.classList.add('flex');

        // Animate In
        if (this.modalPanel) {
            // Force reflow
            void this.modalPanel.offsetWidth;
            this.modalPanel.classList.remove('opacity-0', 'scale-95');
            this.modalPanel.classList.add('opacity-100', 'scale-100');
        }
    }

    closeClientModal() {
        const m = this.els.modal;
        if (!m) return;

        // Animate Out
        if (this.modalPanel) {
            this.modalPanel.classList.remove('opacity-100', 'scale-100');
            this.modalPanel.classList.add('opacity-0', 'scale-95');
        }

        // Hide after transition (300ms matches Tailwind duration-300 default or similar)
        setTimeout(() => {
            if (m) {
                m.classList.add('hidden');
                m.classList.remove('flex');
            }
        }, 300);
    }
}

