import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export class DataEngine {
    constructor() {
        this.rawHeaders = [];
        this.rawRows = [];
        this.colIndices = {};
    }

    processCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        this._processRawData(results.data);
                        resolve();
                    } catch (e) { reject(e); }
                },
                error: (err) => reject(err)
            });
        });
    }

    processExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                    this._processRawData(jsonData);
                    resolve();
                } catch (error) { reject(error); }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    _processRawData(rows) {
        let headerRowIndex = -1;
        // Heuristic to find header
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const rowStr = rows[i].join(" ");
            if (rowStr.includes("Контрагент відправник по МЕН") && rowStr.includes("Shipment вартість послуг")) {
                headerRowIndex = i; break;
            }
        }
        if (headerRowIndex === -1) throw new Error("Header not found in file");

        this.rawHeaders = rows[headerRowIndex];
        this.rawRows = rows.slice(headerRowIndex + 1);
        this._mapColumnIndices(this.rawHeaders);
    }

    _mapColumnIndices(headers) {
        const colMap = {};
        headers.forEach((h, i) => { if (typeof h === 'string') colMap[h.trim()] = i; });
        const getIdx = (name) => {
            if (colMap[name] !== undefined) return colMap[name];
            const key = Object.keys(colMap).find(k => k.toLowerCase().includes(name.toLowerCase()));
            return key !== undefined ? colMap[key] : -1;
        };

        let dateIdx = getIdx("IWB дата створення");
        if (dateIdx === -1) dateIdx = getIdx("Дата оформлення");
        if (dateIdx === -1) dateIdx = getIdx("Shipment Date");
        if (dateIdx === -1) dateIdx = getIdx("Дата");

        let currIdx = getIdx("Shipment валюта вартості послуг");
        if (currIdx === -1) currIdx = getIdx("Валюта");
        if (currIdx === -1) currIdx = getIdx("Currency");

        this.colIndices = {
            idxName: getIdx("Контрагент відправник по МЕН"),
            idxRev: getIdx("Shipment вартість послуг"),
            idxCountry: getIdx("Країна-відправник"),
            idxDestCountry: getIdx("Країна отримувач"),
            idxType: getIdx("Тип відправника по МЕН"),
            idxDesc: getIdx("Опис відправлення"),
            idxSegment: getIdx("Сегмент відправника_"),
            idxPhone: getIdx("тел отправитель") !== -1 ? getIdx("тел отправитель") : getIdx("Телефон відправника"),
            idxDate: dateIdx,
            idxCurr: currIdx,
            idxWeight: (getIdx("Shipment вага брутто") !== -1) ? getIdx("Shipment вага брутто") :
                (getIdx("Weight") !== -1 ? getIdx("Weight") :
                    (getIdx("Вага") !== -1 ? getIdx("Вага") :
                        (getIdx("Gross Weight") !== -1 ? getIdx("Gross Weight") : getIdx("Маса"))))
        };
    }

    getUniqueOrigins() {
        const s = new Set();
        this.rawRows.forEach(r => {
            const val = r[this.colIndices.idxCountry];
            if (val && typeof val === 'string') s.add(val.trim().toUpperCase());
        });
        return Array.from(s).sort();
    }

    getUniqueDestinations() {
        const s = new Set();
        this.rawRows.forEach(r => {
            const val = r[this.colIndices.idxDestCountry];
            if (val && typeof val === 'string') s.add(val.trim().toUpperCase());
        });
        return Array.from(s).sort();
    }
}
