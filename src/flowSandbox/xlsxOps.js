// json-to-excel / excel-to-json yardımcıları — flow sandbox penceresinde çalışır.
// =====================================================================
// Bu fonksiyonlar eskiden app-electron/main/flowRuntime.js içindeydi ve
// güvenilmeyen .xlsx dosyalarını ANA SÜREÇTE ayrıştırıyordu. SheetJS'in
// bilinen prototype pollution / ReDoS açıkları ve ayar nesnesinden kurulan
// RegExp'ler (xlsxGetSheetSettings) ana süreçte kalırsa, kötü niyetli bir
// dosya ya da flow Node yetkisine sahip süreci kilitleyebilir ya da
// kirletebilirdi. Artık hepsi Chromium sandbox'lı, Node'suz gizli pencerede
// çalışıyor; ana süreç yalnızca Buffer taşıyor.
//
// Mantık DEĞİŞTİRİLMEDEN taşındı (GERÇEK deptapps-flows-contrib-excel-utils
// paketinin src/utils/excel-write-helper.js + settings-helper.js portu — bkz.
// flowRuntime.js'teki eski açıklama). Tek fark: kütüphaneler (`XLSX`,
// `XlsxPopulate`) parametre olarak geliyor. Böylece aynı kod sandbox
// sayfasında tarayıcı paketleriyle, testlerde ise Node paketleriyle
// çalışabiliyor; modül DOM'a da Node'a da dokunmuyor.

const XLSX_POPULATE_HEADER_TYPE = { DEFAULT: 'default', ARRAY: 'array', COLUMN: 'column', DEFINED: 'defined' };

// Boş çalışma kitabındaki varsayılan "Sheet1" bu işaretle yeniden adlandırılıp
// sonunda siliniyor — gerçek node'un davranışı (kullanıcının verisinde
// Sheet1 yoksa çıktıda boş bir Sheet1 kalmasın diye).
export const SHEET_TBD_MARK = '_ToBeDeleted#';

export function xlsxPopulateGetHeaderType(header) {
  if (header === undefined) return XLSX_POPULATE_HEADER_TYPE.DEFAULT;
  if (header === 1) return XLSX_POPULATE_HEADER_TYPE.ARRAY;
  if (header === 'A') return XLSX_POPULATE_HEADER_TYPE.COLUMN;
  if (Array.isArray(header)) return XLSX_POPULATE_HEADER_TYPE.DEFINED;
  throw new Error('Not supported header type.');
}

function xlsxGetSheetSettings(config, callerCallback) {
  return function (sheetName) {
    let matched;
    for (const [sheetNameOrRegexp, sheetSetting] of Object.entries(config)) {
      const exact = sheetName === sheetNameOrRegexp;
      let regExpMatch = false;
      try {
        regExpMatch = new RegExp(sheetNameOrRegexp.split('/').filter(Boolean).join('')).test(sheetName);
      } catch {
        regExpMatch = false;
      }
      if (exact || regExpMatch) {
        matched = sheetSetting;
        break;
      }
    }
    return matched !== undefined ? callerCallback(matched)() : undefined;
  };
}

export function xlsxGetHeaderSettings(headerConfig) {
  if (!headerConfig || headerConfig === 'auto') return () => undefined;
  if (headerConfig === 'column') return () => 'A';
  if (['2D', 'array'].includes(headerConfig)) return () => 1;
  if (Array.isArray(headerConfig)) return () => headerConfig;
  if (typeof headerConfig === 'object' && !Array.isArray(headerConfig)) return xlsxGetSheetSettings(headerConfig, xlsxGetHeaderSettings);
  return () => undefined;
}

export function xlsxGetOffsetSettings(offsetConfig) {
  if (!offsetConfig) return () => undefined;
  if (Number.isInteger(offsetConfig)) return () => +offsetConfig;
  if (typeof offsetConfig === 'object') return xlsxGetSheetSettings(offsetConfig, xlsxGetOffsetSettings);
  return () => undefined;
}

// GERÇEK excel-write-helper.js `addHeaderAndTransformRows` - excel-to-json'un
// ürettiği "non-null" (boş hücreler için key hiç yok) satırları, TÜM
// satırların anahtar birleşiminden oluşan sabit bir sütun setine tamamlar.
export function xlsxAddHeaderAndTransformRows(rows) {
  if (!rows || rows.length === 0) return [];
  const headerRow = {};
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerRow[key] = /^__EMPTY(?:_\d+)?$/.test(key) ? undefined : key;
    }
  }
  const headerKeys = Object.keys(headerRow);
  const mapRow = (row) => {
    const out = {};
    for (const k of headerKeys) out[k] = row[k];
    return out;
  };
  return [headerRow, ...rows.map(mapRow)];
}

function xlsxSetCellValue(cell, val) {
  if (typeof val === 'function') {
    cell.formula(val());
  } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val instanceof Date) {
    cell.value(val);
  }
}

function xlsxWriteValueInCell(val, cell) {
  if (val instanceof Date) {
    cell.value(val).style('numberFormat', 'dd/MM/yyyy');
  } else if (val !== null && typeof val === 'object') {
    if (Object.prototype.hasOwnProperty.call(val, 'value')) {
      xlsxSetCellValue(cell, val.value);
      if (Object.prototype.hasOwnProperty.call(val, 'style')) {
        for (const [key, value] of Object.entries(val.style)) cell.style(key, value);
      }
      if (Object.prototype.hasOwnProperty.call(val, 'hyperlink')) cell.hyperlink(val.hyperlink);
    } else {
      xlsxSetCellValue(cell, '');
    }
  } else {
    xlsxSetCellValue(cell, val);
  }
}

function xlsxDrawWithDefaultHeader({ sheet, data, config }) {
  const { offset } = config;
  xlsxAddHeaderAndTransformRows(data).forEach((row, r) => {
    Object.keys(row).forEach((colName, c) => {
      xlsxWriteValueInCell(row[colName], sheet.cell(r + 1 + offset, c + 1));
    });
  });
}

function xlsxDrawWithArrayHeader({ sheet, data, config }) {
  const { offset } = config;
  data.forEach((row, r) => {
    row.forEach((val, c) => xlsxWriteValueInCell(val, sheet.cell(r + 1 + offset, c + 1)));
  });
}

function xlsxDrawWithColumnHeader({ sheet, data, config }) {
  const { offset } = config;
  data.forEach((row, r) => {
    Object.entries(row)
      .sort(([a], [b]) => (a.length === b.length ? (a > b ? 1 : -1) : a.length > b.length ? 1 : -1))
      .forEach(([col, val]) => xlsxWriteValueInCell(val, sheet.cell(r + 1 + offset, col)));
  });
}

function xlsxDrawWithDefinedHeader({ sheet, data, config }) {
  const { header, offset } = config;
  const headerOrdinals = {};
  header.forEach((c, i) => { headerOrdinals[c] = i; });
  data.forEach((row, r) => {
    Object.entries(row)
      .map(([k, v]) => [k, v, headerOrdinals[k]])
      .sort(([, , a], [, , b]) => a - b)
      .forEach(([, val, c]) => xlsxWriteValueInCell(val, sheet.cell(r + 1 + offset, c + 1)));
  });
}

const XLSX_POPULATE_DRAW_METHODS = {
  [XLSX_POPULATE_HEADER_TYPE.DEFAULT]: xlsxDrawWithDefaultHeader,
  [XLSX_POPULATE_HEADER_TYPE.ARRAY]: xlsxDrawWithArrayHeader,
  [XLSX_POPULATE_HEADER_TYPE.COLUMN]: xlsxDrawWithColumnHeader,
  [XLSX_POPULATE_HEADER_TYPE.DEFINED]: xlsxDrawWithDefinedHeader
};

// GERÇEK excel-write-helper.js `fillWorkbook` - payload SADECE bir obje
// olabilir: her key bir sayfa adı, her value o sayfanın satır (obje) dizisi.
export function xlsxFillWorkbook(payload, workbook, config = {}) {
  Object.keys(payload).forEach((sheetName) => {
    const sheet = workbook.sheet(sheetName) || workbook.addSheet(sheetName);
    const data = payload[sheetName];
    const rawOffset = xlsxGetOffsetSettings(config.offset)(sheetName);
    const offset = Number.isNaN(+rawOffset) ? 0 : +rawOffset;
    const header = xlsxGetHeaderSettings(config.header)(sheetName);
    const headerType = xlsxPopulateGetHeaderType(header);
    XLSX_POPULATE_DRAW_METHODS[headerType]({ sheet, data, config: { header, offset } });
  });
}

// Sayfa adı dosyadan geliyor, yani saldırganın elinde: "__proto__" adlı bir
// sayfa düz atamayla sonuç nesnesinin prototipini değiştirirdi. Öz özellik
// olarak tanımlamak adı sıradan bir anahtar gibi taşıyor.
function setOwn(target, key, value) {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

// excel-to-json'un ayrıştırma kısmı. `bytes` bir Uint8Array: sandbox'a Buffer
// değil yapılandırılmış klonlanmış bayt dizisi ulaşıyor, bu yüzden `type:
// 'array'`. `cellDates` eskisi gibi açık — tarihler Date olarak dönüyor.
export function xlsxRead({ XLSX }, bytes, { offset, header } = {}) {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
  const data = {};
  for (const sheetName of workbook.SheetNames) {
    setOwn(data, sheetName, XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: xlsxGetOffsetSettings(offset)(sheetName),
      header: xlsxGetHeaderSettings(header)(sheetName),
      blankrows: true
    }));
  }
  return data;
}

// json-to-excel'in yazma kısmı. `kind` / payload doğrulaması ve hata
// mesajları ana süreçte kaldı (flowRuntime.js `_runJsonToExcelNode`); buraya
// yalnızca doğrulanmış veri geliyor. Boş kitap mı şablon mu ayrı bir bayrakla
// söyleniyor, `templateBuffer`'ın null olmasından çıkarılmıyor: msg'deki
// buffer alanı null ise gerçek node xlsx-populate'in "Input type unknown"
// hatasını veriyor, sessizce boş kitaba dönmüyor.
// Çıktı Uint8Array: ana süreç onu yeniden Buffer'a çeviriyor.
export async function xlsxWrite({ XlsxPopulate }, { data, config, blank, templateBuffer }) {
  const workbook = blank ? await XlsxPopulate.fromBlankAsync() : await XlsxPopulate.fromDataAsync(templateBuffer);

  if (blank) {
    const sheet1 = workbook.sheet('Sheet1');
    if (sheet1) sheet1.name(`${sheet1.name()}${SHEET_TBD_MARK}`);
  }

  xlsxFillWorkbook(data, workbook, config || {});

  workbook.sheets()
    .map((sheet) => sheet.name())
    .filter((name) => name.endsWith(SHEET_TBD_MARK))
    .forEach((name) => workbook.deleteSheet(name));

  return workbook.outputAsync('uint8array');
}
