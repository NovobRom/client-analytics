import { COUNTRY_MAP } from './constants.js';

export const Utils = {
    getFlagHtml: (countryCode) => {
        if (!countryCode || countryCode.length !== 2) return '';
        const lowerCode = countryCode.toLowerCase();
        return `<span class="fi fi-${lowerCode} rounded shadow-sm" style="font-size: 1.2em;"></span>`;
    },
    formatCurrency: (val) => {
        return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'EUR' }).format(val || 0);
    },
    getCountryName: (code, lang) => {
        if (!code) return "Unknown";
        const upper = code.toUpperCase().trim();
        // Check map
        if (COUNTRY_MAP[upper]) return COUNTRY_MAP[upper][lang];
        return upper;
    },
    parseDate: (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
        const cleanStr = dateStr.toString().trim().split(' ')[0];
        const parts = cleanStr.split(/[./-]/);
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        return null;
    },
    formatDate: (dateObj) => {
        const d = dateObj.getDate().toString().padStart(2, '0');
        const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}.${m}.${y}`;
    },
    getColor: (idx) => {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4'];
        return colors[idx % colors.length];
    }
};
