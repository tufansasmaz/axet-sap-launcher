import http from "node:http";
import https from "node:https";
import vm from "node:vm";
import net from "node:net";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { XMLParser } from "fast-xml-parser";
import { validateFlow, diagnoseError } from "./flowDiagnostics.js";

// `xlsx`/`xlsx-populate` (SheetJS/XlsxPopulate) node_modules'ten gercek CJS
// paketleri olarak kalıyor (electron.vite.config.ts'teki externalizeDepsPlugin
// sadece fast-xml-parser'i bundle'a gomuyor, digerleri gibi bunlar da
// paketlenmis exe'de node_modules'ten gercek bir `require()` ile
// cozumleniyor) - proje ESM ("type":"module") oldugu icin bu dosyada da
// senkron bir `require` gerekiyor, `createRequire` ile elde ediliyor
// (asagidaki `_run*ExcelNode` metodlari bu sekilde degismeden kalabiliyor).
const require = createRequire(import.meta.url);

// aXet.flows AI Builder - Mini Flow Runtime
// =========================================
// Bu motor, deploy edilen bir flow'u (FlowModel.toDeployArray() ciktisi)
// GERCEKTEN calistirir: function/change/switch/catch/inject/http-in/
// http-response/debug/link/http request/json-to-excel/excel-to-json
// node'lari Node.js icinde bilfiil yurutulur (dis HTTP/SOAP cagrisi, gercek
// .xlsx uretimi/okunmasi dahil). Kimlik dogrulamasi/kurumsal entegrasyon gerektiren ve bu ortamda
// GERCEK kimlik bilgisi/kanit olmadan calistirilamayacak node'lar (AI/LLM,
// MS Graph mail, shell, DB, UI-form) GUVENLIK ve KANIT GEREKSINIMI nedeniyle
// SIMULE edilir: gercek dis cagri yapilmaz, ama node "calismis gibi" mesaji
// bir sonraki node'a gecirir ve debug paneline "[SIMULATED]" etiketiyle
// loglanir. Bu, agent'in urettigi bir flow'u guvenle "test edip hata varsa
// duzeltmeyi" saglar.
//
// ADIM ADIM IZ (TRACE): her node calistirildiginda (basarili/hatali/simule)
// onTrace() ile bir adim event'i yayinlanir - {chainId, hopIndex, nodeId,
// status, input, output, cause, suggestion, ...}. Bir mesaj zinciri hata
// aldiginda zaten dogal olarak ilerlemeyi durdurur (bu dosyadaki _emit
// sadece hata olmayan sonuclari ileri gonderir); bu sayede debugger UI'i
// "akis TAM OLARAK bu node da durdu" bilgisini dogru sekilde gosterebilir.
//
// ASYNC CALISMA MODELI: _emit/_executeNode async'tir (http request node'u
// gercek I/O bekler). Tek bir zincir icinde adimlar SIRALI (await ile) calisir -
// bu sayede B node'u, A node'unun GERCEK sonucunu (orn HTTP yanitini) beklemeden
// asla baslamaz. triggerInject/_handleHttpRequest ust seviyede bu zinciri
// "fire-and-forget" baslatir (cagiran taraf tamamlanmasini beklemez) ama zincirin
// KENDI ICINDE sıra korunur.

const SIMULATED_TYPES = new Set([
  'enabler-llm',
  'ms-graph-mail-send',
  'excel',
  'excel-to-json-multiinput',
  'axetflows-shell',
  'axetflows-remote-shell',
  'axetflows-db-persist',
  'axetflows-db-query',
  'axetflows-db-remove',
  'axetflows-db-remove-all',
  'axetflows-db-find-one',
  'axetflows-db-flush',
  'axetflows-app',
  'axetflows-form',
  'axetflows-form-data-store',
  'axetflows-view-action',
  'axetflows-rx-view-action',
  'query',
  'refine',
  'history',
  'aXet Agent',
  'axet-agents-execute',
  'axet-worker',
  'axet-ai-capability-in',
  'axet-ai-capability-out',
  'python-agent',
  'node-backend',
  'sql-query',
  'nosql-count',
  'nosql-find-one',
  'nosql-persist',
  'nosql-query',
  'nosql-remove',
  'nosql-remove-all',
  'credentials',
  'secret',
  'hidden-secret',
  'e-mail in',
  'e-mail',
  'check-login',
  'ms-graph-mail-read',
  'ms-graph-shp-get-files',
  'ms-graph-shp-get-folders',
  'ms-graph-shp-download-file',
  'ms-graph-shp-upload-file',
  'ms-graph-shp-move-file',
  'ms-graph-shp-delete-file',
  'ms-graph-shp-create-shareable-link',
  'save',
  'get',
  'set',
  'destroy',
  'e-mail',
  // 2026-08-29 tam denetiminde eklenen, GERCEKTEN var olan ama bu ortamda
  // guvenle calistirilamayan (harici git clone/SPA build/statik sunucu,
  // gercek Okta tarayici otomasyonu/TOTP, harici Python/Node.js
  // process/venv yonetimi) node tipleri:
  'enabler-audio',
  'axet-spa-app',
  'axet-spa-sdk-event-in',
  'axet-spa-sdk-event-out',
  'axet-spa-sdk-request-in',
  'axet-spa-sdk-request-out',
  'UserBot',
  'OktaBot'
]);

// GERCEKTEN calisan node'lar: 'http request' (Node-RED core, gercek DNS/HTTP/
// HTTPS istegi atar - fast-xml-parser ile 'xml' ret modu builder'a ozel bir
// ek secenektir), 'json-to-excel'/'excel-to-json' (2026-08-29'da GERCEK
// `deptapps-flows-contrib-excel-utils` paketinin (aXet.flows Canlı host'unda
// kurulu) kaynak koduna karsi DOGRULANDI ve xlsx-populate/xlsx kutuphaneleriyle
// BIREBIR AYNI davranisa gore yeniden yazildi - asagidaki xlsx* yardimci
// fonksiyonlarina bak). Bunlarin HEPSI aXet.flows'un GERCEK Node-RED
// cekirdeginde/paletinde var olan tiplerdir (once burada hallusinasyon olan
// 'http-request' (tirali)/'smtp-mail-send'/'smtp-config' tipleri
// kullaniliyordu - bunlar KALDIRILDI, gercek 'http request' (bosluklu,
// Node-RED core) ve gercek mail node'lari 'ms-graph-mail-send'/'e-mail' ile
// degistirildi; mail gonderme GERCEK kimlik bilgisi/kurumsal SMTP relay
// gerektirdigi icin SIMULATED_TYPES'a eklendi, tekrar hallusinasyon yapmadan).
// 'excel' ve 'excel-to-json-multiinput' hala SIMULATED: bunlar json-to-excel/
// excel-to-json'dan TAMAMEN AYRI, gercekten var olan farkli node paketleri
// (axetflows-excel: json2xls ile dosyaya yazar; axetflows-util: dosya/base64
// okur) - bu ikisinin sunucu tarafindaki dosya-yolu semantigi (nereye
// yazar/hangi dizinden okur) net kanitlanmadigi icin uydurma bir davranis
// eklenmedi, SIMULATED kaliyorlar.

const MAX_HOPS = 2000; // sonsuz dongu koruma siniri (tek bir mesaj zincirinde)

function findFreePort(preferred) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (preferred) {
        // tercih edilen port musaitse degil, rastgele bir bosta ara
        findFreePort(0).then(resolve, reject);
      } else {
        reject(err);
      }
    });
    server.listen(preferred || 0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function safeJsonClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

// GERCEK Node-RED'in `RED.util.cloneMessage()` fonksiyonu bir JSON round-trip
// DEGIL, gercek bir yapısal (structural) derin kopyadir - Buffer/Date gibi
// ozel tipleri, `undefined` degerlerini, NaN/Infinity'yi vs. OLDUGU GIBI
// korur. Bu motorun onceki surumu (`safeJsonClone` / JSON.stringify+parse)
// mesaji node'lar arasinda AKTARIRKEN kullaniliyordu - bu, canli/gercek
// aXet.flows host'unda hata veren bazi function node kodlarinin bu motorda
// SESSIZCE (ve YANLIS) calismasina sebep oluyordu, orn: msg.payload bir
// Buffer/Date ise JSON clone onu duz bir obje/string'e cevirir, kullanicinin
// `Buffer.isBuffer(msg.payload)`/`msg.payload instanceof Date` gibi kontrolleri
// beklenmedik dallara girer; msg icindeki `undefined` alanlar JSON'da tamamen
// KAYBOLUR (gercek Node-RED'de kaybolmaz). `cloneMessage` bunu duzeltir -
// mesaj AKTARIMINDA (function/change/catch/get-context node'lari) BUNU
// KULLAN, sadece debug-onizleme/JSON-serilestirme icin `safeJsonClone` yeterli
// (orada JSON-safe olmasi zaten ISTENEN davranistir).
function cloneMessage(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value; // primitive (undefined/NaN/Infinity dahil, oldugu gibi doner)
  if (seen.has(value)) return seen.get(value); // dongusel referans koruma
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (Array.isArray(value)) {
    const out = [];
    seen.set(value, out);
    for (const item of value) out.push(cloneMessage(item, seen));
    return out;
  }
  if (value instanceof Map || value instanceof Set) {
    // Gercek Node-RED de bu tipleri msg icinde tasimayi desteklemez (JSON
    // API/debug paneli gosteremez) - sessizce ATLAMAK (undefined donmek)
    // yerine en azindan CRASH etmeyip orijinal referansi geri veriyoruz,
    // hallusinasyon bir davranis uydurmadan en guvenli secim bu.
    return value;
  }
  const out = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) {
    out[key] = cloneMessage(value[key], seen);
  }
  return out;
}

function previewValue(value, maxLen = 400) {
  const cloned = safeJsonClone(value);
  let text;
  try {
    text = typeof cloned === 'string' ? cloned : JSON.stringify(cloned);
  } catch {
    text = String(value);
  }
  if (text === undefined) text = String(value);
  return text && text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function coerceType(value, targetType) {
  switch (targetType) {
    case 'num':
      return Number(value);
    case 'bool':
      return value === true || value === 'true';
    case 'json':
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    case 'date':
      return Date.now();
    case 'str':
    default:
      return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

function getByPath(obj, path) {
  if (!path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, path, value) {
  if (!path) return;
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function evalRule(rule, subject) {
  const v = rule.v;
  switch (rule.t) {
    case 'eq':
      return String(subject) === String(v);
    case 'neq':
      return String(subject) !== String(v);
    case 'lt':
      return Number(subject) < Number(v);
    case 'lte':
      return Number(subject) <= Number(v);
    case 'gt':
      return Number(subject) > Number(v);
    case 'gte':
      return Number(subject) >= Number(v);
    case 'cont':
      return String(subject).includes(String(v));
    case 'true':
      return subject === true;
    case 'false':
      return subject === false;
    case 'null':
      return subject === null || subject === undefined;
    case 'nnull':
      return subject !== null && subject !== undefined;
    case 'else':
      return true;
    default:
      return false;
  }
}

// =====================================================================
// json-to-excel / excel-to-json - GERCEK deptapps-flows-contrib-excel-utils
// paketinin (aXet.flows Canlı host'unda kurulu, C:\Users\...\axet-flows\
// .deptapps-desktop\electron-releases\...\resources\app\node_modules\
// deptapps-flows-contrib-excel-utils) KAYNAK KODUNDAN birebir port edilmis
// yardimci fonksiyonlar. Onceki surum bu iki node'u SheetJS'in basit
// json_to_sheet/sheet_to_json API'siyle YAKLASIK taklit ediyordu - GERCEK
// node xlsx-populate kutuphanesiyle calisiyor ve TAMAMEN farkli bir payload
// sozlesmesi (sheet-adi -> satir dizisi haritasi) kullaniyor; bu fark canli
// bir kullanicinin "bizim editor hata vermedi ama Canli host verdi" bulgusuyla
// ortaya cikti (bkz. PROJE-BILGI.md). Asagidaki fonksiyonlar gercek
// src/utils/excel-write-helper.js + src/utils/settings-helper.js dosyalarinin
// mantigini DEGISTIRMEDEN tasir - sadece lodash `has/get/isDate` yerine bu
// dosyadaki esdegerleri (getByPath, Array.isArray/instanceof Date) kullanir.
// =====================================================================

const XLSX_POPULATE_HEADER_TYPE = { DEFAULT: 'default', ARRAY: 'array', COLUMN: 'column', DEFINED: 'defined' };

function xlsxPopulateGetHeaderType(header) {
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

function xlsxGetHeaderSettings(headerConfig) {
  if (!headerConfig || headerConfig === 'auto') return () => undefined;
  if (headerConfig === 'column') return () => 'A';
  if (['2D', 'array'].includes(headerConfig)) return () => 1;
  if (Array.isArray(headerConfig)) return () => headerConfig;
  if (typeof headerConfig === 'object' && !Array.isArray(headerConfig)) return xlsxGetSheetSettings(headerConfig, xlsxGetHeaderSettings);
  return () => undefined;
}

function xlsxGetOffsetSettings(offsetConfig) {
  if (!offsetConfig) return () => undefined;
  if (Number.isInteger(offsetConfig)) return () => +offsetConfig;
  if (typeof offsetConfig === 'object') return xlsxGetSheetSettings(offsetConfig, xlsxGetOffsetSettings);
  return () => undefined;
}

// GERCEK excel-write-helper.js `addHeaderAndTransformRows` - excel-to-json'un
// urettigi "non-null" (bos hucreler icin key hic yok) satirlari, TUM
// satirlarin anahtar birlesiminden olusan sabit bir sutun setine tamamlar.
function xlsxAddHeaderAndTransformRows(rows) {
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

// GERCEK excel-write-helper.js `fillWorkbook` - payload SADECE bir obje
// olabilir: her key bir sayfa adi, her value o sayfanin satir (obje) dizisi.
// Duz bir dizi (`[{...}, {...}]`) GECERSIZDIR - gercek node'da da Object.keys()
// uzerinden indekslere ("0","1",...) doner ve calismaz, biz de aynen o hatayi
// uretiyoruz (asagidaki _runJsonToExcelNode'daki kontrol).
function xlsxFillWorkbook(payload, workbook, config = {}) {
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

// GERCEK src/utils/checksum.js `checksum-buffer` (multihash sha1) kullaniyor -
// bu paket IPFS multihash formatinda bir prefix+digest byte dizisi uretiyor,
// bizim ortamimizda ekstra bir bagimlilik gerektirmeden BIREBIR ayni byte
// formatini uretmenin degeri yok (json-to-excel node'un KENDISI bu alani hic
// OKUMUYOR - sadece payload.data/payload.buffer okunuyor, checksum sadece
// bilgilendirme amacli). Bu yuzden BILINCLI bir sadelestirme olarak duz bir
// SHA-1 hex digest kullaniliyor - deger farkli olur ama hicbir gercek node
// bu degeri tuketmedigi icin islevsel bir fark yaratmiyor.
function xlsxChecksumFromBuffer(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

class FlowRuntime {
  constructor({ onDebug, onStatus, onLog, onTrace, onValidate } = {}) {
    this.onDebug = onDebug || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onLog = onLog || (() => {});
    this.onTrace = onTrace || (() => {});
    this.onValidate = onValidate || (() => {});
    this.nodesById = {};
    this.httpServer = null;
    this.port = null;
    this.timers = [];
    this.running = false;
    this.pendingHttpResponses = new Map(); // msgId -> {res, node}
    // Gercek Node-RED'in context/flow/global depolama semantigi (varsayilan
    // "memory" context modulu): node-scoped (node.id ile), flow/tab-scoped
    // (node.z ile) ve tum runtime'a ortak tek bir global store. Bu store'lar
    // BILEREK stop()/deploy() sirasinda TEMIZLENMIYOR - gercek Node-RED'de de
    // bir "Full" deploy sadece node nesnelerini yeniden kurar, calisan
    // process HALA ayni oldugu icin bellek-tabanli context verisi process
    // canli oldugu surece hayatta kalir (sadece uygulama tamamen kapanip
    // acilinca sifirlanir) - bkz. bu ornegin de tek bir FlowRuntime
    // singleton'i olarak index.ts'te YASAM BOYU yasamasi.
    this.nodeContextStore = new Map(); // node.id -> plain object
    this.flowContextStore = new Map(); // node.z (tab/subflow id) -> plain object
    this.globalContextStore = {};
    // aXet.flows Designer'daki Deploy dropdown'unun 3 gercek modu (Full/
    // Modified Flows/Modified Nodes - editor-client locales/en-US/editor.json
    // "deploy" bolumunden dogrulandi) + "Restart Flows" icin son basarili
    // deploy edilen tam flow array'i burada saklanir.
    this._lastDeployedArray = null;
  }

  isRunning() {
    return this.running;
  }

  getInfo() {
    return { running: this.running, port: this.port };
  }

  // Son deploy edilen ile yeni flow array'i karsilastirir - SADECE Deploy
  // dropdown'unda secilen mod (Modified Flows/Modified Nodes) hakkinda
  // DOGRU/GERCEK bir log mesaji uretmek icin kullanilir. Bu basit motor
  // TEK PARCA calistigi icin (tek nodesById map'i, tek HTTP sunucusu) hicbir
  // mod fiili olarak "sadece degisen kismi" yeniden yuklemez - hepsi ayni
  // stop()+yeniden-kur akisindan gecer. Bu fark burada ACIKCA loglanir,
  // "partial hot-reload" varmis gibi yalan bir davranis ASLA uydurulmaz.
  _diffSummary(newArray) {
    const prev = this._lastDeployedArray;
    if (!Array.isArray(prev)) return null;
    const prevById = new Map(prev.map((n) => [n.id, n]));
    const nextById = new Map((newArray || []).map((n) => [n.id, n]));
    const changedTabIds = new Set();
    let addedCount = 0;
    let removedCount = 0;
    let changedCount = 0;
    nextById.forEach((node, id) => {
      const before = prevById.get(id);
      if (!before) {
        addedCount++;
        if (node.z) changedTabIds.add(node.z);
      } else if (JSON.stringify(before) !== JSON.stringify(node)) {
        changedCount++;
        if (node.z) changedTabIds.add(node.z);
      }
    });
    prevById.forEach((node, id) => {
      if (!nextById.has(id)) {
        removedCount++;
        if (node.z) changedTabIds.add(node.z);
      }
    });
    return { changedTabCount: changedTabIds.size, addedCount, removedCount, changedCount };
  }

  async deploy(flowArray, mode = 'full') {
    if (mode === 'modified-flows' || mode === 'modified-nodes') {
      const diff = this._diffSummary(flowArray);
      if (diff) {
        const label = mode === 'modified-flows' ? 'Modified Flows' : 'Modified Nodes';
        this.onLog({
          level: 'info',
          text: `[Deploy: ${label}] ${diff.changedCount} node degisti, ${diff.addedCount} eklendi, ${diff.removedCount} silindi (${diff.changedTabCount} flow etkilendi). Bu basit motor tek parca calistigi icin gercek kismi (partial) hot-reload yapmiyor - tum workspace yeniden baslatiliyor (ayni Full deploy gibi), sadece degisen kisim bilgi amacli loglandi.`
        });
      }
    }
    await this.stop();

    const validation = validateFlow(flowArray || []);
    this.onValidate(validation);
    if (validation.blocking) {
      const errCount = validation.issues.filter((i) => i.severity === 'error').length;
      this.onLog({
        level: 'error',
        text: `Deploy iptal edildi: ${errCount} kritik sorun bulundu. Debug panelindeki "Deploy Oncesi Kontrol" bolumune bak.`
      });
      return { running: false, port: null, blocked: true, issues: validation.issues };
    }

    this.nodesById = {};
    (flowArray || []).forEach((n) => {
      this.nodesById[n.id] = n;
    });

    const httpNodes = Object.values(this.nodesById).filter(
      (n) => n.type === 'axetflows-http-in' || n.type === 'http in'
    );

    if (httpNodes.length > 0) {
      this.port = await findFreePort(17880);
      this.httpServer = http.createServer((req, res) => this._handleHttpRequest(req, res, httpNodes));
      await new Promise((resolve, reject) => {
        this.httpServer.once('error', reject);
        this.httpServer.listen(this.port, '127.0.0.1', resolve);
      });
    } else {
      this.port = null;
    }

    this.running = true;
    this._setupInjectTimers();
    this._lastDeployedArray = safeJsonClone(flowArray || []) || flowArray || [];
    this.onStatus({
      running: true,
      port: this.port,
      httpRoutes: httpNodes.map((n) => ({ id: n.id, url: n.url, method: n.method || 'get' }))
    });
    this.onLog({
      level: 'info',
      text: `Deploy tamamlandi (${mode === 'restart' ? 'Restart Flows' : mode === 'modified-flows' ? 'Modified Flows' : mode === 'modified-nodes' ? 'Modified Nodes' : 'Full'}).${this.port ? ` HTTP sunucu: http://127.0.0.1:${this.port}` : ''}`
    });
    return { ...this.getInfo(), blocked: false, issues: validation.issues };
  }

  // aXet.flows Designer'daki "Restart Flows" ("Restarts the current deployed
  // flows") - flow'da hicbir degisiklik yapmadan, SON BASARILI deploy edilen
  // ayni array'i tekrar calistirir. Hicbir diff/degisiklik hesaplamasi yok,
  // gercek anlamiyla bire bir "yeniden baslat".
  async restart() {
    if (!this._lastDeployedArray) {
      return { running: false, port: null, blocked: true, issues: [], error: 'Once en az bir kez deploy etmen gerekiyor.' };
    }
    return this.deploy(this._lastDeployedArray, 'restart');
  }

  async stop() {
    this.timers.forEach((t) => clearInterval(t) || clearTimeout(t));
    this.timers = [];
    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(resolve));
      this.httpServer = null;
    }
    // Bekleyen HTTP cevaplari varsa 503 ile kapat (deploy durdurulunca askida kalmasin)
    this.pendingHttpResponses.forEach(({ res }) => {
      try {
        if (!res.writableEnded) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: 'Flow deploy durduruldu.' }));
        }
      } catch {
        // yut
      }
    });
    this.pendingHttpResponses.clear();
    this.port = null;
    this.running = false;
    this.onStatus({ running: false, port: null, httpRoutes: [] });
  }

  _setupInjectTimers() {
    Object.values(this.nodesById).forEach((node) => {
      if (node.type !== 'inject') return;
      if (node.crontab) {
        // Basit crontab yorumu desteklenmiyor (gercek cron parser eklenmedi);
        // yalnizca "manuel tetikle" butonuyla calistirilabilir, sessizce gec.
        return;
      }
      const repeatSec = Number(node.repeat);
      if (Number.isFinite(repeatSec) && repeatSec > 0) {
        const timer = setInterval(() => this.triggerInject(node.id), repeatSec * 1000);
        this.timers.push(timer);
      }
      if (node.once) {
        const delayMs = Number(node.onceDelay) > 0 ? Number(node.onceDelay) * 1000 : 100;
        const timer = setTimeout(() => this.triggerInject(node.id), delayMs);
        this.timers.push(timer);
      }
    });
  }

  triggerInject(nodeId) {
    const node = this.nodesById[nodeId];
    if (!node || node.type !== 'inject') {
      throw new Error(`triggerInject: ${nodeId} bir inject node degil veya bulunamadi.`);
    }
    const msg = {
      _msgid: randomUUID(),
      topic: node.topic || '',
      payload: coerceType(node.payload, node.payloadType || 'date')
    };
    this.onTrace({
      chainId: msg._msgid,
      hopIndex: -1,
      kind: 'chain-start',
      trigger: { nodeId: node.id, nodeName: node.name || 'inject', reason: 'manuel/otomatik tetikleme' },
      timestamp: Date.now()
    });
    this._fireEmit(node.id, msg, [node.id]);
    return msg._msgid;
  }

  // _emit artik async (gercek HTTP/SMTP I/O icerebilir). triggerInject ve
  // _handleHttpRequest, bir zincirin TAMAMLANMASINI beklemeden hemen geri
  // donmesi gereken ust-seviye giris noktalari - bu yuzden Promise'i
  // "fire-and-forget" baslatirlar, ama yakalanmamis bir reddi (unhandled
  // rejection) Electron'un sessizce crash olmasini onlemek icin loglarlar.
  _fireEmit(nodeId, msg, path) {
    this._emit(nodeId, msg, path).catch((err) => {
      this.onLog({ level: 'error', text: `Beklenmeyen calisma zamani hatasi: ${err.message}` });
    });
  }

  _handleHttpRequest(req, res, httpNodes) {
    const urlPath = (req.url || '/').split('?')[0];
    const method = (req.method || 'GET').toLowerCase();
    const node = httpNodes.find((n) => n.url === urlPath && (n.method || 'get').toLowerCase() === method);
    if (!node) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Bilinmeyen route: ${method.toUpperCase()} ${urlPath}` }));
      return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bodyRaw = Buffer.concat(chunks).toString('utf-8');
      let payload = bodyRaw;
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json') && bodyRaw) {
        try {
          payload = JSON.parse(bodyRaw);
        } catch {
          // parse edilemedi, ham metin olarak birak
        }
      }
      const msgId = randomUUID();
      const msg = {
        _msgid: msgId,
        payload,
        req: { method: req.method, url: req.url, headers: req.headers, body: payload },
        res: { _resId: msgId }
      };
      this.pendingHttpResponses.set(msgId, { res, node });
      this.onTrace({
        chainId: msgId,
        hopIndex: -1,
        kind: 'chain-start',
        trigger: { nodeId: node.id, nodeName: node.name || node.url, reason: `HTTP istegi (${req.method} ${req.url})` },
        timestamp: Date.now()
      });
      const timeout = setTimeout(() => {
        if (this.pendingHttpResponses.has(msgId)) {
          this.pendingHttpResponses.delete(msgId);
          if (!res.writableEnded) {
            res.statusCode = 504;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Flow zaman asimina ugradi (http response node calismadi).' }));
          }
          this.onTrace({
            chainId: msgId,
            hopIndex: 9999,
            kind: 'chain-timeout',
            nodeId: node.id,
            status: 'error',
            cause: 'Bu istek icin 15 saniye icinde bir "http response" node una ulasilamadi.',
            suggestion: 'Zincirin sonunda bir http response node oldugundan ve oraya kadar hicbir dalin sessizce durmadigindan emin ol.',
            timestamp: Date.now()
          });
        }
      }, 15000);
      this.timers.push(timeout);
      this._fireEmit(node.id, msg, [node.id]);
    });
  }

  _emitTrace(entry) {
    this.onTrace({ kind: 'step', timestamp: Date.now(), ...entry });
  }

  // Bir node'un cikisindaki mesaji, wire'larla bagli tum hedeflere gonderir.
  // Async: node gercek I/O (http request) yapabilir, bu yuzden
  // bir sonraki node'a GECMEDEN once bu node'un TAMAMEN bitmesini bekler.
  async _emit(nodeId, msg, path) {
    if (path.length > MAX_HOPS) {
      this.onLog({ level: 'error', text: `Guvenlik siniri: ${nodeId} sonrasi zincir cok uzun (olasi sonsuz dongu), durduruldu.` });
      this._emitTrace({
        chainId: msg._msgid,
        hopIndex: path.length - 1,
        nodeId,
        status: 'error',
        cause: 'Mesaj zinciri 2000 adimi gecti (olasi sonsuz dongu - orn iki node birbirini surekli tetikliyor).',
        suggestion: 'Flow icinde birbirini dongusel tetikleyen node ciftlerini kontrol et.'
      });
      return;
    }
    const node = this.nodesById[nodeId];
    if (!node) return;
    const hopIndex = path.length - 1;
    const chainId = msg._msgid || 'manual';

    let result;
    try {
      result = await this._executeNode(node, msg);
    } catch (err) {
      const diag = diagnoseError(node, err);
      this._emitTrace({
        chainId,
        hopIndex,
        nodeId: node.id,
        nodeName: node.name || node.type,
        nodeType: node.type,
        status: 'error',
        input: previewValue(msg.payload),
        errorMessage: err.message,
        errorCode: diag.code,
        cause: diag.cause,
        suggestion: diag.suggestion
      });
      await this._handleNodeError(node, msg, err, diag, path);
      return;
    }

    const isSimulated = SIMULATED_TYPES.has(node.type);
    const outputPreview =
      result == null
        ? null
        : Array.isArray(result)
          ? result.map((r) => (r == null ? null : previewValue(r.payload)))
          : previewValue(result.payload);

    this._emitTrace({
      chainId,
      hopIndex,
      nodeId: node.id,
      nodeName: node.name || node.type,
      nodeType: node.type,
      status: isSimulated ? 'simulated' : 'ok',
      input: previewValue(msg.payload),
      output: outputPreview
    });

    if (result == null && !(node.__pendingSends && node.__pendingSends.length)) return; // node akisi burada bilerek durdurdu (orn function null dondurdu, node.send() da hic cagrilmadi)

    // Gercek Node-RED'in function node'undaki `node.send(msg)` API'si -
    // `return`'den BAGIMSIZ olarak, script calisirken (senkron VEYA async
    // kod icinde) istenildigi kadar EK mesaj gonderebilir; bunlar burada
    // dosya basindaki `_dispatchResult` yardimcisiyla (return degeriyle
    // AYNI wires/output esleme mantigi) ayri ayri gonderiliyor. `node`
    // (gercek flow node nesnesi) uzerine _runFunctionNode tarafindan GECICI
    // olarak eklenen `__pendingSends` burada TUKETILIP hemen temizleniyor -
    // bir sonraki calismaya sizmasin.
    if (node.__pendingSends && node.__pendingSends.length) {
      const pending = node.__pendingSends;
      node.__pendingSends = null;
      for (const sent of pending) {
        await this._dispatchResult(node, sent, path);
      }
    }
    if (result != null) {
      await this._dispatchResult(node, result, path);
    }
  }

  // `result` tek bir mesaj OLABILIR (output 0'a gider) VEYA node'un
  // cikislariyla (wires) sirali bir dizi OLABILIR (return [msg1,msg2] gibi -
  // gercek Node-RED'deki AYNI konvansiyon). `node.send()` ile yapilan
  // EXPLICIT gonderimler de AYNI sekli kullanabilir, bu yuzden bu yardimci
  // hem normal return-degeri sevkiyati hem `node.send()` sevkiyatlari icin
  // ORTAK olarak kullaniliyor.
  async _dispatchResult(node, result, path) {
    const outputs = Array.isArray(result) ? result : [result];
    for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
      const outMsg = outputs[outIdx];
      if (outMsg == null) continue;
      const targets = (node.wires && node.wires[outIdx]) || [];
      for (const toId of targets) {
        await this._emit(toId, outMsg, [...path, toId]);
      }
    }
  }

  async _handleNodeError(node, msg, err, diag, path = []) {
    const diagnosis = diag || diagnoseError(node, err);
    this.onLog({ level: 'error', text: `[${node.name || node.type}] HATA: ${err.message}`, nodeId: node.id });
    this.onDebug({
      nodeId: node.id,
      nodeName: node.name || node.type,
      nodeType: node.type,
      payload: { error: err.message, stack: err.stack },
      topic: msg.topic,
      error: true,
      cause: diagnosis.cause,
      suggestion: diagnosis.suggestion,
      errorCode: diagnosis.code,
      timestamp: Date.now()
    });
    const catchNode = Object.values(this.nodesById).find((n) => {
      if (n.type !== 'catch') return false;
      if (n.z !== node.z) return false;
      if (!n.scope) return true; // scope null = tum flow'daki hatalari yakala
      try {
        const scopeIds = Array.isArray(n.scope) ? n.scope : JSON.parse(n.scope);
        return scopeIds.includes(node.id);
      } catch {
        return true;
      }
    });
    if (catchNode) {
      const errMsg = {
        ...cloneMessage(msg),
        error: { message: err.message, source: { id: node.id, type: node.type }, cause: diagnosis.cause, suggestion: diagnosis.suggestion }
      };
      // Hata zincirinin onceki yolunu koru: debugger catch node'unun
      // fonksiyondan sonra calistigini ayni adim dizisinde gormeli.
      await this._emit(catchNode.id, errMsg, [...path, catchNode.id]);
    } else if (this.pendingHttpResponses.size) {
      // Yakalanmadi ve bekleyen bir http response varsa 500 dondur (askida kalmasin)
      this.pendingHttpResponses.forEach(({ res }, msgId) => {
        if (msg._msgid === msgId && !res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, cause: diagnosis.cause, suggestion: diagnosis.suggestion }));
          this.pendingHttpResponses.delete(msgId);
        }
      });
    }
  }

  async _executeNode(node, msg) {
    if (SIMULATED_TYPES.has(node.type)) {
      this.onDebug({
        nodeId: node.id,
        nodeName: node.name || node.type,
        nodeType: node.type,
        payload: msg.payload,
        topic: msg.topic,
        simulated: true,
        timestamp: Date.now()
      });
      this.onLog({ level: 'info', text: `[SIMULATED] ${node.name || node.type} calisti (gercek dis cagri yapilmadi).`, nodeId: node.id });
      return { ...msg };
    }

    switch (node.type) {
      case 'comment':
      case 'axetflows-httpin-model-config':
      case 'ms-graph-mail-config':
      case 'audit-config':
      case 'global-config':
      case 'axetflows-scheme-color':
      case 'deptapps-app-auth-basic-internal':
      case 'deptapps-app-auth-okta':
      case 'deptapps-app-auth-ldap':
      case 'deptapps-app-auth-cas':
      case 'deptapps-app-auth-openid':
      case 'deptapps-app-auth-azure-ad':
      case 'enabler-config':
      case 'axet-config':
      case 'axet-agent-config':
      case 'axet-ai-capability-config':
      case 'python-gateway':
      case 'ms-graph-shp-config':
      case 'global-status-endpoints':
        return null; // yorum/config node - ileri gonderim yok

      case 'inject':
        // triggerInject() bu node'un id'siyle _emit cagirir; tetiklendiginde
        // olusturulan msg'i KENDI wires'i uzerinden ilerletmesi gerekir -
        // aksi halde inject asla downstream'e ulasamaz.
        return { ...msg };

      case 'axetflows-http-in':
      case 'http in':
        return { ...msg };

      case 'function':
        return this._runFunctionNode(node, msg);

      case 'change':
        return this._runChangeNode(node, msg);

      case 'switch':
        return this._runSwitchNode(node, msg);

      case 'link in':
      case 'link out':
      case 'link call':
      case 'junction':
        return { ...msg };

      case 'catch':
      case 'status':
      case 'complete':
        return { ...msg };

      case 'axetflows-get-context':
        return this._runGetContextNode(node, msg);

      case 'http response':
        return this._runHttpResponseNode(node, msg);

      case 'http request':
        return this._runHttpRequestNode(node, msg);

      case 'json-to-excel':
        return this._runJsonToExcelNode(node, msg);

      case 'excel-to-json':
        return this._runExcelToJsonNode(node, msg);

      case 'debug':
        if (node.active === false) return null; // debug node kapatilmis (Ozellikler panelinden "Aktif" isaretsiz)
        this.onDebug({
          nodeId: node.id,
          nodeName: node.name || 'debug',
          nodeType: node.type,
          payload: getByPath(msg, node.complete || 'payload'),
          topic: msg.topic,
          timestamp: Date.now()
        });
        return null;

      case 'use-case':
        this.onLog({ level: 'info', text: `[AUDIT] use-case node calisti: ${node.usecaseid || '(id yok)'}`, nodeId: node.id });
        return null;

      default:
        if (SIMULATED_TYPES.has(node.type)) {
          this.onLog({ level: 'info', text: `[SIMULATED] ${node.type} - gercek dis servis cagrilmadi, mesaj degistirilmeden gecirildi.`, nodeId: node.id });
        } else {
          this.onLog({ level: 'warn', text: `[BILINMEYEN TIP] ${node.type} - degistirilmeden gecirildi.`, nodeId: node.id });
        }
        return { ...msg };
    }
  }

  // Node-scoped (node.id) veya flow/tab-scoped (node.z) context store'unu
  // getirir, yoksa lazy olarak olusturur - `map` constructor'da kurulan
  // `this.nodeContextStore`/`this.flowContextStore`'dan biri olur.
  _getContextStore(map, key) {
    let store = map.get(key);
    if (!store) {
      store = {};
      map.set(key, store);
    }
    return store;
  }

  // Gercek Node-RED context/flow/global API'siyle AYNI senkron sozlesme:
  // `.get(key)` / `.set(key, value)` (varsayilan "memory" context modulu
  // de senkrondur, Promise dondurmez) + kolaylik icin `.keys()`.
  _makeContextApi(store) {
    return {
      get: (key) => store[key],
      set: (key, value) => {
        store[key] = value;
      },
      keys: () => Object.keys(store)
    };
  }

  async _runFunctionNode(node, msg) {
    const sandboxConsole = {
      log: (...args) => this.onLog({ level: 'info', text: `[${node.name || 'function'}] ${args.map(String).join(' ')}`, nodeId: node.id }),
      warn: (...args) => this.onLog({ level: 'warn', text: `[${node.name || 'function'}] ${args.map(String).join(' ')}`, nodeId: node.id }),
      error: (...args) => this.onLog({ level: 'error', text: `[${node.name || 'function'}] ${args.map(String).join(' ')}`, nodeId: node.id })
    };
    // `node.send(msg, cloneMsg)`/`node.warn(msg)`/`node.error(msg, origMsg)`/
    // `node.log(msg)`/`node.done()`/`node.status(status)` - gercek Node-RED
    // function node'unun `node` API'siyle AYNI isimler/imzalar. `node.send()`
    // burada senkron olarak `pendingSends` dizisine biriktiriliyor, GERCEK
    // sevkiyat script bittikten sonra `_emit()` icinde yapiliyor (bkz. o
    // metoddaki not) - boylece `node.send(msg); return null;` ve
    // `return msg;` desenlerinin IKISI DE calisir, gercek Node-RED'deki gibi.
    const pendingSends = [];
    const sandboxNode = {
      id: node.id,
      name: node.name,
      send: (sendMsg, cloneMsg) => {
        if (sendMsg == null) return;
        pendingSends.push(cloneMsg === false ? sendMsg : cloneMessage(sendMsg));
      },
      warn: (m) => this.onLog({ level: 'warn', text: `[${node.name || 'function'}] ${typeof m === 'string' ? m : previewValue(m)}`, nodeId: node.id }),
      error: (m, origMsg) => {
        this.onLog({ level: 'error', text: `[${node.name || 'function'}] ${typeof m === 'string' ? m : previewValue(m)}`, nodeId: node.id });
      },
      log: (m) => this.onLog({ level: 'info', text: `[${node.name || 'function'}] ${typeof m === 'string' ? m : previewValue(m)}`, nodeId: node.id }),
      done: () => {},
      status: () => {} // Debug panelinde canli node status noktasi bu motorda yok, sessizce yut - gercek Node-RED'de sadece gorsel bir yan etki, akisi degistirmez.
    };
    const nodeContext = this._makeContextApi(this._getContextStore(this.nodeContextStore, node.id));
    const flowContext = this._makeContextApi(this._getContextStore(this.flowContextStore, node.z || 'global'));
    const globalContext = this._makeContextApi(this.globalContextStore);
    const sandbox = {
      msg: cloneMessage(msg),
      node: sandboxNode,
      context: nodeContext,
      flow: flowContext,
      global: globalContext,
      env: { get: (name) => process.env[name] },
      console: sandboxConsole,
      Buffer,
      Date,
      JSON,
      Math,
      Promise,
      RegExp,
      Array,
      Object,
      Error,
      // Gercek Node-RED function node sandbox'i setTimeout/setInterval'i
      // DOGRUDAN saglar (orn `await new Promise((r) => setTimeout(r, 100))`
      // cok yaygin bir desendir) - bu motorda eksikti, ReferenceError
      // firlatiyordu. Olusturulan handle'lar `this.timers`'a (inject
      // node'larinin da kullandigi AYNI liste) eklenir ki stop()/redeploy
      // sirasinda sarkan (leaked) bir timer process'i canli tutmasin.
      setTimeout: (fn, ms, ...args) => {
        const handle = setTimeout(fn, ms, ...args);
        this.timers.push(handle);
        return handle;
      },
      clearTimeout: (handle) => clearTimeout(handle),
      setInterval: (fn, ms, ...args) => {
        const handle = setInterval(fn, ms, ...args);
        this.timers.push(handle);
        return handle;
      },
      clearInterval: (handle) => clearInterval(handle),
      __result: undefined
    };
    // Gercek Node-RED, function node kodunu bir ASYNC fonksiyon olarak
    // sarmalar - bu, kullanicinin kod icinde ust seviyede `await` kullanmasina
    // izin verir (orn `await someAsyncCall()`). Onceki surum burada SENKRON
    // bir sarmalayici kullaniyordu; bu hem `await` iceren kodu SyntaxError ile
    // patlatiyordu (gercek host'ta calisirken) HEM DE bazi async-bagimli
    // hatalarin bu motorda hic yakalanmamasina yol aciyordu.
    const code = `__result = (async function(msg){\n${node.func || 'return msg;'}\n})(msg);`;
    const vmContext = vm.createContext(sandbox);
    const script = new vm.Script(code, { filename: `${node.name || node.id}.function.js` });
    script.runInContext(vmContext, { timeout: 3000 });
    // `__result` senkron calisirken bir Promise'e ATANIR (async fonksiyon
    // cagrisi hemen bir Promise dondurur) - GERCEK cozumleme/hata script
    // bittikten SONRA (mikro-gorev kuyrugunda) olusur, bu yuzden burada
    // `await` ediliyor. `vm.Script`'in `timeout` secenegi SADECE senkron
    // calismayi sinirlar (Promise'in cozulmesini beklemez) - kullanicinin
    // kodu asla cozulmeyen bir Promise'i `await` ederse motor sonsuza kadar
    // asilmasin diye ayrica 10 saniyelik bir "yaris" (race) zaman asimi
    // ekleniyor.
    let result;
    let timeoutHandle;
    try {
      const asyncTimeout = new Promise((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error('Function node zaman asimina ugradi (10s) - kod icinde hic cozulmeyen bir Promise/await olabilir.'));
        }, 10000);
      });
      result = await Promise.race([vmContext.__result, asyncTimeout]);
    } catch (err) {
      if (pendingSends.length) node.__pendingSends = pendingSends;
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }
    if (pendingSends.length) node.__pendingSends = pendingSends;
    if (result === undefined) return null;
    if (Array.isArray(result)) return result;
    return result;
  }

  _runChangeNode(node, msg) {
    const out = cloneMessage(msg);
    const rules = Array.isArray(node.rules) ? node.rules : [];
    rules.forEach((rule) => {
      if (rule.t !== 'set') return;
      let value;
      if (rule.tot === 'msg') {
        value = getByPath(out, rule.to);
      } else {
        value = coerceType(rule.to, rule.tot || 'str');
      }
      setByPath(out, rule.p || 'payload', value);
    });
    return out;
  }

  _runSwitchNode(node, msg) {
    const property = node.property || 'payload';
    const subject = getByPath(msg, property);
    const rules = Array.isArray(node.rules) ? node.rules : [];
    const outputs = new Array(Math.max(rules.length, 1)).fill(null);
    let matched = false;
    rules.forEach((rule, idx) => {
      if (!node.checkall && matched) return;
      if (evalRule(rule, subject)) {
        outputs[idx] = { ...msg };
        matched = true;
      }
    });
    return outputs;
  }

  _runGetContextNode(node, msg) {
    const out = cloneMessage(msg);
    setByPath(out, node.outputProp || 'payload', getByPath(msg, node.outputProp || 'payload'));
    return out;
  }

  _runHttpResponseNode(node, msg) {
    const msgId = msg._msgid;
    const pending = msgId ? this.pendingHttpResponses.get(msgId) : null;
    if (!pending) {
      this.onLog({ level: 'warn', text: `[http response] Bu mesaj bir HTTP istegine ait degil (elle tetiklenmis olabilir), yanit gonderilemedi.`, nodeId: node.id });
      return null;
    }
    const { res } = pending;
    this.pendingHttpResponses.delete(msgId);
    const statusCode = Number(node.statusCode) || 200;
    res.statusCode = statusCode;
    const headers = node.headers && typeof node.headers === 'object' ? node.headers : {};
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    const body = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload ?? null);
    res.end(body);
    return null;
  }

  // GERCEK dis HTTP/SOAP cagrisi. url/method node config'inden, yoksa
  // msg.url/msg.method'dan alinir (Node-RED'in gercek "http request" core
  // node'unun davranisini birebir izler: POST/PUT/PATCH'te govde olarak
  // msg.payload kullanilir). format: 'text' (varsayilan) | 'json' | 'xml' |
  // 'binary'. 'xml' secilirse yanit fast-xml-parser ile GERCEKTEN JS
  // objesine cevrilir (orn SOAP/.wso servislerinin duz XML yanitlari icin).
  _runHttpRequestNode(node, msg) {
    return new Promise((resolve, reject) => {
      const targetUrl = node.url || msg.url;
      if (!targetUrl) {
        reject(new Error('http request: URL belirtilmedi (node.url ya da msg.url gerekli).'));
        return;
      }
      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch {
        reject(new Error(`http request: gecersiz URL: "${targetUrl}"`));
        return;
      }
      const client = parsed.protocol === 'https:' ? https : http;
      const method = String(node.method || msg.method || 'get').toUpperCase();
      const headers = { ...(node.headers && typeof node.headers === 'object' ? node.headers : {}) };
      let bodyBuf;
      if (['POST', 'PUT', 'PATCH'].includes(method) && msg.payload !== undefined && msg.payload !== null) {
        bodyBuf = typeof msg.payload === 'string' || Buffer.isBuffer(msg.payload) ? msg.payload : JSON.stringify(msg.payload);
        if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
          headers['Content-Type'] = typeof msg.payload === 'string' ? 'text/plain' : 'application/json';
        }
        headers['Content-Length'] = Buffer.byteLength(bodyBuf);
      }
      const timeoutMs = Number(node.timeout) > 0 ? Number(node.timeout) : 15000;
      const req = client.request(
        { hostname: parsed.hostname, port: parsed.port, path: `${parsed.pathname}${parsed.search}`, method, headers, timeout: timeoutMs },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            // Gercek Node-RED "http request" core node'unun 'ret' alani:
            // 'txt' (varsayilan), 'bin', 'obj' (JSON.parse). 'xml' builder'a
            // ozel bir 4. secenektir (gercek node'da yok, SOAP/XML servisleri
            // kolay test etmek icin fast-xml-parser ile eklendi).
            const ret = node.ret || 'txt';
            const out = { ...msg, statusCode: res.statusCode, headers: res.headers };
            try {
              if (ret === 'bin') {
                out.payload = bodyBuffer;
              } else if (ret === 'obj') {
                out.payload = JSON.parse(bodyBuffer.toString('utf-8'));
              } else if (ret === 'xml') {
                out.payload = new XMLParser({ ignoreAttributes: false }).parse(bodyBuffer.toString('utf-8'));
              } else {
                out.payload = bodyBuffer.toString('utf-8');
              }
            } catch (err) {
              reject(new Error(`http request: yanit "${ret}" olarak parse edilemedi: ${err.message}`));
              return;
            }
            resolve(out);
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error(`http request zaman asimina ugradi (${timeoutMs}ms).`)));
      req.on('error', reject);
      if (bodyBuf) req.write(bodyBuf);
      req.end();
    });
  }

  // GERCEK json-to-excel node'unun (deptapps-flows-contrib-excel-utils/src/
  // nodes/json-to-excel/json-to-excel.js) BIREBIR portu. Onceki surum
  // (SheetJS json_to_sheet + duz dizi payload) YANLIS bir sozlesme
  // uyduruyordu - GERCEK node xlsx-populate kullanir ve payload'in
  // {"SayfaAdi": [ {satir...}, ... ]} seklinde bir OBJE (sayfa adi -> satir
  // dizisi haritasi) olmasini bekler, duz bir dizi degil. `kind` alaninin
  // gecerli degerleri "auto"/"blank"/"buffer" - "base64" GERCEK node'da hic
  // YOK (nodeCatalog.js'teki secenek listesi de bu turda duzeltildi).
  async _runJsonToExcelNode(node, msg) {
    const XlsxPopulate = require('xlsx-populate');
    const AUTO_TYPE = 'auto';
    const BLANK_KIND = 'blank';
    const BUFFER_KIND = 'buffer';
    const BUFFER_PROP_DEFAULT = 'payload.buffer';
    const DATA_PROP_DEFAULT = 'payload.data';
    const SHEET_TBD_MARK = '_ToBeDeleted#';

    let kind = node.kind || AUTO_TYPE;
    let bufferProp = node.bufferProp || BUFFER_PROP_DEFAULT;
    let payloadProp = node.payloadProp || DATA_PROP_DEFAULT;

    if (kind === AUTO_TYPE) {
      payloadProp = DATA_PROP_DEFAULT;
      bufferProp = BUFFER_PROP_DEFAULT;
    }
    if (getByPath(msg, payloadProp) === undefined) {
      throw new Error(`json-to-excel: msg.${payloadProp} does not exist`);
    }
    if (kind === AUTO_TYPE) {
      kind = getByPath(msg, BUFFER_PROP_DEFAULT) !== undefined ? BUFFER_KIND : BLANK_KIND;
    }

    let workbook;
    if (kind === BLANK_KIND) {
      workbook = await XlsxPopulate.fromBlankAsync();
    } else if (kind === BUFFER_KIND) {
      const bufferValue = getByPath(msg, bufferProp);
      if (bufferValue === undefined) throw new Error('json-to-excel: Buffer not exists.');
      workbook = await XlsxPopulate.fromDataAsync(bufferValue);
    } else {
      throw new Error(`json-to-excel: "Write into ${kind}" option not supported.`);
    }

    if (kind === BLANK_KIND) {
      const sheet1 = workbook.sheet('Sheet1');
      if (sheet1) sheet1.name(`${sheet1.name()}${SHEET_TBD_MARK}`);
    }

    const payload = getByPath(msg, payloadProp);
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`json-to-excel: msg.${payloadProp} bir obje olmali - her key bir sayfa adi, her value o sayfanin satir (obje) dizisi ("{ Sheet1: [{...}] }"), duz bir dizi DEGIL (gercek node'un sozlesmesi budur, bkz. json-to-excel.html "Data" aciklamasi).`);
    }
    const excelConfig = msg.payload && msg.payload.config ? msg.payload.config : {};
    xlsxFillWorkbook(payload, workbook, excelConfig);

    workbook.sheets()
      .map((sheet) => sheet.name())
      .filter((name) => name.endsWith(SHEET_TBD_MARK))
      .forEach((name) => workbook.deleteSheet(name));

    const outputBuffer = await workbook.outputAsync();
    return { ...msg, payload: outputBuffer };
  }

  // GERCEK excel-to-json node'unun (deptapps-flows-contrib-excel-utils/src/
  // nodes/excel-to-json/excel-to-json.js) BIREBIR portu. Onceki surum sadece
  // ILK sayfayi okuyup duz bir dizi donuyordu - GERCEK node TUM sayfalari
  // okur ve `payload.data` altinda {sayfaAdi: [satirlar]} seklinde, ayrica
  // `payload.buffer` (orijinal Buffer, pass-through) ve `payload.checksum`
  // ile birlikte doner - bu cikti tam olarak json-to-excel'in `payloadProp`/
  // `bufferProp` varsayilanlarinin (payload.data/payload.buffer) bekledigi
  // sekildir (iki node'un round-trip sozlesmesi budur).
  async _runExcelToJsonNode(node, msg) {
    const XLSX = require('xlsx');
    const input = msg.payload;
    if (!Buffer.isBuffer(input)) {
      throw new Error('excel-to-json: msg.payload must be a Buffer');
    }
    const buffer = input;
    const checksum = xlsxChecksumFromBuffer(buffer);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const data = {};
    for (const sheetName of workbook.SheetNames) {
      data[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        range: xlsxGetOffsetSettings(msg.offset)(sheetName),
        header: xlsxGetHeaderSettings(msg.header)(sheetName),
        blankrows: true
      });
    }
    return {
      ...msg,
      payload: {
        buffer, checksum, data,
        config: { offset: msg.offset, header: msg.header }
      }
    };
  }

  // 'smtp-mail-send'/_runSmtpMailSendNode KALDIRILDI - gercek aXet.flows
  // palette'inde bu type yok (hallusinasyondu). Gercek mail node'lari
  // ('ms-graph-mail-send', 'e-mail') GERCEK kurumsal kimlik bilgisi/SMTP
  // relay gerektirdigi icin SIMULATED_TYPES listesinde kaliyorlar - bu
  // ortamda guvenle "gercekten" calistirilamazlar.
}

export { FlowRuntime, findFreePort, validateFlow, diagnoseError };
