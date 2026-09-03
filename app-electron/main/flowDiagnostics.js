import vm from "node:vm";
import { getNodeValidationIssues, isConfigUnused, catalogEntry, isConfigType } from "../../src/flows/nodeCatalog.js";

// aXet.flows AI Builder - Flow Diagnostics
// =========================================
// Iki gorev:
// 1) validateFlow(flowArray): DEPLOY ONCESI statik kontrol - sozdizimi
//    hatalari, kopuk/eksik baglantilar, cakisan HTTP route'lari gibi
//    calistirmadan tespit edilebilecek "eksiklikleri" bulur. Boylece kullanici
//    deploy etmeden ONCE "burada sorun var, sebebi bu, oneri bu" gorur.
// 2) diagnoseError(node, err, context): RUNTIME sirasinda bir node hata
//    fırlattığında, hata mesaji uzerinde desen eslestirme yaparak insan
//    okunur bir "sebep" (neden oldu) ve "oneri" (ne yapilmali) uretir - LLM
//    cagirmadan, aninda ve deterministik. Boylece debugger "o noktada durup"
//    kullaniciya ham stack trace yerine anlasilir bir aciklama sunabilir.

function isConfigLikeType(type) {
  return (
    typeof type === 'string' &&
    (type.endsWith('-config') ||
      type === 'audit-config' ||
      type.startsWith('deptapps-app-auth-') ||
      type === 'python-gateway' ||
      type === 'axetflows-scheme-color')
  );
}

function checkFunctionSyntax(node, codeField, label) {
  const code = node[codeField];
  if (!code) return null;
  try {
    // Gercek calisma zamani (flowRuntime.js._runFunctionNode) kodu bir ASYNC
    // fonksiyon icine sarmalıyor (top-level `await` desteklensin diye) - bu
    // statik kontrol de AYNI sarmalayiciyi kullanmali, aksi halde `await`
    // iceren gecerli bir kod burada YANLIŞTAN SyntaxError olarak reddedilir
    // (deploy'u bloke eder) ama gercekte calisma zamaninda calisirdi.
    // eslint-disable-next-line no-new
    new vm.Script(`(async function(msg){\n${code}\n})`, { filename: `${node.name || node.id}.${codeField}.js` });
    return null;
  } catch (err) {
    return {
      nodeId: node.id,
      nodeName: node.name || node.type,
      nodeType: node.type,
      severity: 'error',
      code: 'SYNTAX_ERROR',
      title: `${label} icinde sozdizimi hatasi`,
      cause: `"${node.name || node.type}" node'unun ${label.toLowerCase()} kodu JavaScript olarak parse edilemedi: ${err.message}`,
      suggestion: `Kod editorunde parantez/suslu parantez/tirnak dengesini kontrol et. Hatanin ipucu: "${err.message}"`
    };
  }
}

/**
 * Deploy edilecek flow dizisini (FlowModel.toDeployArray ciktisi) statik
 * olarak kontrol eder. Node'lari GERCEKTEN calistirmaz.
 * Donen: { blocking: boolean, issues: Array<{severity, nodeId, nodeName, nodeType, code, title, cause, suggestion}> }
 * severity 'error' olan issue'lar deploy'u BLOKE eder (calisirsa kesin
 * crash/anlamsiz sonuc verir); 'warning' olanlar deploy'u durdurmaz ama
 * kullaniciya gosterilir.
 */
function validateFlow(flowArray) {
  const nodes = Array.isArray(flowArray) ? flowArray : [];
  const nodesById = {};
  nodes.forEach((n) => {
    nodesById[n.id] = n;
  });
  const issues = [];

  // 0) GERCEK Node-RED editor'unun "bos zorunlu (required) alan varken
  // Deploy butonu devre disi" davranisinin AYNISI - artik editor-time
  // (FlowCanvas/FlowNode/NodeEditorPanel, bkz. src/flows/nodeCatalog.js)
  // ile DEPLOY-TIME burada TEK bir kaynaktan (getNodeValidationIssues)
  // besleniyor, iki ayri/tutarsiz kontrol mekanizmasi kalmadi. Kullanicinin
  // canli bulgusu ("Please select the tenant...") TAM OLARAK bu kontrolun
  // deploy'dan ONCE yakalamasi gereken bir durumdu - artik hem canvas'ta
  // kirmizi gorunuyor HEM de Deploy bu durumda BLOKE OLUYOR (gercek Node-RED
  // ile ayni sekilde 'error' severity kullanildi, tipki required:true'nun
  // gercek editorde Deploy'u devre disi birakmasi gibi).
  nodes.forEach((node) => {
    if (!node || typeof node.type !== 'string') return;
    const { ownMissing, configIssues } = getNodeValidationIssues(node.type, node, nodesById);
    ownMissing.forEach((m) => {
      issues.push({
        nodeId: node.id,
        nodeName: node.name || catalogEntry(node.type).label || node.type,
        nodeType: node.type,
        severity: 'error',
        code: 'REQUIRED_FIELD_EMPTY',
        title: `"${m.label}" alani bos`,
        cause: `"${node.name || catalogEntry(node.type).label || node.type}" node'unun "${m.label}" alani zorunlu ama bos birakilmis.`,
        suggestion: `Ozellikler panelinden bu alani doldur.`
      });
    });
    configIssues.forEach((ci) => {
      issues.push({
        nodeId: node.id,
        nodeName: node.name || catalogEntry(node.type).label || node.type,
        nodeType: node.type,
        severity: 'error',
        code: 'CONFIG_REQUIRED_FIELD_EMPTY',
        title: `"${ci.fieldLabel}" -> "${ci.configLabel}" icinde eksik alan`,
        cause: `"${node.name || catalogEntry(node.type).label || node.type}" node'unun isaret ettigi "${ci.configLabel}" (${ci.configType}) config node'unda ${ci.missing.map((m) => `"${m.label}"`).join(', ')} zorunlu ama bos birakilmis.`,
        suggestion: `"${ci.configLabel}" config node'unu ac ve eksik alan(lar)i doldur.`
      });
    });
    if (isConfigType(node.type) && isConfigUnused(node.id, nodesById)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name || catalogEntry(node.type).label || node.type,
        nodeType: node.type,
        severity: 'warning',
        code: 'UNUSED_CONFIG',
        title: 'Kullanilmayan config node',
        cause: `"${node.name || catalogEntry(node.type).label || node.type}" hicbir node tarafindan kullanilmiyor (is:config is:unused).`,
        suggestion: `Kullanilmiyorsa silebilirsin, kullaniliyor olmasi gerekiyorsa ilgili node'un config alanindan bu node'u sec.`
      });
    }
  });

  const httpRouteSeen = new Map(); // "method url" -> nodeId

  nodes.forEach((node) => {
    if (isConfigLikeType(node.type)) return; // config node'lar wire/route kontrolu disinda

    // 1) function/change kodlarinda sozdizimi hatasi
    if (node.type === 'function') {
      const err1 = checkFunctionSyntax(node, 'func', 'Function');
      if (err1) issues.push(err1);
      const err2 = checkFunctionSyntax(node, 'initialize', 'Initialize');
      if (err2) issues.push(err2);
      const err3 = checkFunctionSyntax(node, 'finalize', 'Finalize');
      if (err3) issues.push(err3);
    }

    // 2) wires icindeki hedef id'ler gercekten var mi?
    if (Array.isArray(node.wires)) {
      node.wires.forEach((targets, outIdx) => {
        (targets || []).forEach((toId) => {
          if (!nodesById[toId]) {
            issues.push({
              nodeId: node.id,
              nodeName: node.name || node.type,
              nodeType: node.type,
              severity: 'warning',
              code: 'DANGLING_WIRE',
              title: 'Var olmayan bir node a baglanti',
              cause: `"${node.name || node.type}" node'unun ${outIdx + 1}. cikisi, artik flow'da bulunmayan bir node'a (id: ${toId}) baglanmis kalmis.`,
              suggestion: `Bu eski baglantiyi kaldir (node'u sil ve yeniden bagla) veya hedef node'u geri ekle.`
            });
          }
        });
      });
    }

    // 3) HTTP endpoint kontrolleri: bos url, cakisan route
    if (node.type === 'axetflows-http-in' || node.type === 'http in') {
      if (!node.url || !String(node.url).trim()) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name || node.type,
          nodeType: node.type,
          severity: 'error',
          code: 'EMPTY_URL',
          title: 'HTTP endpoint URL bos',
          cause: `"${node.name || node.type}" node'unun URL alani bos. Bos URL'e istek gonderilemez.`,
          suggestion: `Ozellikler panelinden bu node'a gecerli bir URL yaz (orn "/api/orders").`
        });
      } else {
        const key = `${(node.method || 'get').toLowerCase()} ${node.url}`;
        if (httpRouteSeen.has(key)) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name || node.type,
            nodeType: node.type,
            severity: 'error',
            code: 'DUPLICATE_ROUTE',
            title: 'Cakisan HTTP route',
            cause: `"${(node.method || 'get').toUpperCase()} ${node.url}" adresi birden fazla HTTP In node'u tarafindan kullaniliyor (diger node id: ${httpRouteSeen.get(key)}).`,
            suggestion: `Bu iki endpoint'ten birinin URL'sini veya HTTP metodunu degistir, ikisi ayni adrese cevap veremez.`
          });
        } else {
          httpRouteSeen.set(key, node.id);
        }
      }

      // Bu endpoint'ten cikan zincirde bir http response var mi? (dead-end kontrolu)
      const hasDownstreamResponse = hasReachableType(node.id, 'http response', nodesById);
      if (!hasDownstreamResponse) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name || node.type,
          nodeType: node.type,
          severity: 'warning',
          code: 'NO_HTTP_RESPONSE',
          title: 'Bu endpoint hicbir http response node una ulasmiyor',
          cause: `"${node.name || node.type}" endpoint'ine istek gelirse, zincirin sonunda bir "http response" node'u olmadigi icin istek zaman asimina ugrayacak (15sn).`,
          suggestion: `Bu endpoint'in zincirinin sonuna bir "http response" node'u ekleyip baglat.`
        });
      }
    }

    // 4) config-ref alanlari icin referans verilen config node gercekten var mi?
    // 2026-08-29 ikinci tur denetimi: elle bakimi gereken sabit alan adi
    // listesi ("modelSchema/config/schemeColor/..." - yeni bir config-ref
    // alani eklendiginde burasi unutulabiliyordu) KALDIRILDI - artik
    // nodeCatalog.js'teki catalogEntry(type).formFields TEK KAYNAK, hangi
    // alanin 'config-ref' oldugunu ORADAN okuyoruz (getConfigUsageMap/
    // connectionKindFor'un generic yaklasimiyla AYNI prensip).
    (catalogEntry(node.type).formFields || []).forEach((ff) => {
      if (ff.type !== 'config-ref') return;
      const refId = node[ff.key];
      if (refId && typeof refId === 'string' && !nodesById[refId]) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name || node.type,
          nodeType: node.type,
          severity: 'warning',
          code: 'MISSING_CONFIG_REF',
          title: 'Referans verilen config node bulunamadi',
          cause: `"${node.name || node.type}" node'unun "${ff.key}" alani, artik var olmayan bir config node'a (id: ${refId}) isaret ediyor.`,
          suggestion: `Ozellikler panelinden bu alan icin gecerli bir config node sec veya "+ Yeni" ile bir tane olustur.`
        });
      }
    });

    // 5) switch node: hic kural yok
    if (node.type === 'switch' && (!Array.isArray(node.rules) || node.rules.length === 0)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name || node.type,
        nodeType: node.type,
        severity: 'warning',
        code: 'EMPTY_SWITCH',
        title: 'Switch node da hic kural yok',
        cause: `"${node.name || node.type}" hic bir kural tanimlamadigi icin gelen her mesaji yok sayacak.`,
        suggestion: `Ozellikler panelinden en az bir kural ekle (orn payload == deger).`
      });
    }

    // 6) http request: bos URL (bu node GERCEKTEN dis servise baglanmaya
    // calisir - bos URL'de anlamsiz/gecikmeli bir hata almak yerine deploy
    // oncesi acikca uyar).
    if (node.type === 'http request' && (!node.url || !String(node.url).trim())) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name || node.type,
        nodeType: node.type,
        severity: 'error',
        code: 'EMPTY_URL',
        title: 'http request URL bos',
        cause: `"${node.name || node.type}" node'unun URL alani bos. Bu node GERCEK bir dis HTTP/SOAP servisine baglanmaya calisir, bos URL'e istek gonderilemez.`,
        suggestion: `Ozellikler panelinden bu node'a cagirilacak servisin tam adresini yaz (orn "https://ornek.com/servis").`
      });
    }
  });

  const blocking = issues.some((i) => i.severity === 'error');
  return { blocking, issues };
}

function hasReachableType(startId, targetType, nodesById, seen = new Set()) {
  if (seen.has(startId)) return false;
  seen.add(startId);
  const node = nodesById[startId];
  if (!node) return false;
  if (node.type === targetType) return true;
  if (!Array.isArray(node.wires)) return false;
  for (const targets of node.wires) {
    for (const toId of targets || []) {
      if (hasReachableType(toId, targetType, nodesById, seen)) return true;
    }
  }
  return false;
}

const ERROR_PATTERNS = [
  {
    test: (msg) => /Script execution timed out/i.test(msg),
    code: 'TIMEOUT',
    cause: () => 'Kod 3 saniyeden uzun surdu (sonsuz dongu veya cok agir bir islem olabilir).',
    suggestion: () => 'Kod icindeki dongu kosullarini kontrol et; buyuk veri isliyorsan islemi kucuk parcalara bol.'
  },
  {
    test: (msg) => /is not defined/i.test(msg),
    code: 'UNDEFINED_VAR',
    cause: (msg) => {
      const m = /(\w+) is not defined/i.exec(msg);
      return `Kod icinde "${m ? m[1] : 'bir degisken'}" adinda tanimsiz bir degisken/fonksiyon kullanilmis.`;
    },
    suggestion: (msg) => {
      const m = /(\w+) is not defined/i.exec(msg);
      const name = m ? m[1] : 'degisken';
      return `"${name}" degiskenini kod icinde tanimla, ya da bunun msg.payload/msg.topic gibi bir mesaj alanindan gelmesi gerekiyorsa dogru alan adini kullan.`;
    }
  },
  {
    test: (msg) => /Cannot read propert(?:y|ies).*of (?:undefined|null)/i.test(msg),
    code: 'NULL_ACCESS',
    cause: (msg) => {
      const m = /reading '([^']+)'/i.exec(msg) || /property '([^']+)'/i.exec(msg);
      return `Bir objenin "${m ? m[1] : 'bir alani'}" alanina erisilmeye calisildi, ama obje undefined/null cikti (beklenen veri gelmemis olabilir).`;
    },
    suggestion: () => 'msg.payload (veya erisilen obje) beklenen sekli iceriyor mu kontrol et; guvenli erisim icin "obj?.alan" veya once "if (obj)" kontrolu ekle.'
  },
  {
    test: (msg) => /Unexpected token/i.test(msg) && /JSON/i.test(msg),
    code: 'JSON_PARSE',
    cause: () => 'Gelen veri gecerli bir JSON degil (JSON.parse basarisiz oldu).',
    suggestion: () => 'Istegi gonderen tarafin Content-Type: application/json header ile duz JSON gonderdiginden emin ol; ya da JSON.parse etmeden once veri tipini kontrol et.'
  },
  {
    test: (msg) => /is not a function/i.test(msg),
    code: 'NOT_A_FUNCTION',
    cause: (msg) => {
      const m = /(\S+) is not a function/i.exec(msg);
      return `"${m ? m[1] : 'bir deger'}" bir fonksiyon olarak cagrilmaya calisildi ama fonksiyon degil.`;
    },
    suggestion: () => 'Cagirdigin seyin dogru bir fonksiyon oldugunu (yazim hatasi/yanlis alan adi olmadigini) kontrol et.'
  },
  {
    test: (msg) => /out of memory|Maximum call stack/i.test(msg),
    code: 'STACK_OR_MEMORY',
    cause: () => 'Kod cok fazla ic ice cagri yapiyor (sonsuz ozyineleme) veya asiri bellek kullaniyor.',
    suggestion: () => 'Ozyinelemeli (recursive) bir fonksiyon varsa durma kosulunu kontrol et.'
  },
  {
    test: (msg) => /ENOTFOUND|EAI_AGAIN/i.test(msg),
    code: 'DNS_NOT_FOUND',
    cause: (msg) => {
      const m = /getaddrinfo (?:ENOTFOUND|EAI_AGAIN) ([^\s]+)/i.exec(msg);
      return `"${m ? m[1] : 'hedef adres'}" adresi cozumlenemedi (DNS bulunamadi) - adres yanlis yazilmis olabilir veya bu makineden erisilemiyor.`;
    },
    suggestion: () => 'http request node\'undaki URL/host alanini kontrol et; internet baglantini ve adresin dogru yazildigini dogrula.'
  },
  {
    test: (msg) => /ECONNREFUSED/i.test(msg),
    code: 'CONNECTION_REFUSED',
    cause: () => 'Hedef sunucu baglantiyi reddetti (yanlis port olabilir veya sunucu o an calismiyor).',
    suggestion: () => 'Port numarasini ve sunucunun aktif/erisilebilir oldugunu kontrol et (orn SMTP icin 587/465, HTTP icin 80/443).'
  },
  {
    test: (msg) => /ETIMEDOUT|zaman asimina ugradi/i.test(msg),
    code: 'NETWORK_TIMEOUT',
    cause: () => 'Dis servise yapilan istek zaman asimina ugradi (sunucu yanit vermedi).',
    suggestion: () => 'Servisin erisilebilir oldugunu kontrol et; gerekirse node config indeki "timeout" degerini artir.'
  },
  {
    test: (msg) => /Corrupted zip|zip file|central directory|invalid signature/i.test(msg),
    code: 'INVALID_EXCEL_FILE',
    cause: () => 'Verilen dosya gecerli bir .xlsx (zip tabanli) dosyasi olarak okunamadi.',
    suggestion: () => 'Girdinin gercekten bir Excel dosyasinin ham binary/base64 icerigi oldugundan emin ol (orn HTTP upload\'da dogru alan kullanildigindan).'
  },
  {
    test: (msg) => /Input type unknown/i.test(msg),
    code: 'XLSX_POPULATE_INPUT_TYPE_UNKNOWN',
    cause: () => 'json-to-excel node\'u ("Existing workbook" secili) buffer alaninda bir Buffer/base64 string DEGIL (orn duz bir JS obje/dizi) buldu - xlsx-populate bu girdiyi acamaz.',
    suggestion: () => '"Write into" alanini "Blank workbook" veya "Auto" yap, ya da buffer alaninin gercekten bir onceki excel-to-json node\'undan gelen msg.payload.buffer\'a isaret ettigini kontrol et.'
  },
  {
    test: (msg) => /msg\.\S+ does not exist/i.test(msg) && /json-to-excel/i.test(msg),
    code: 'JSON_TO_EXCEL_MISSING_DATA_PROP',
    cause: () => 'json-to-excel node\'unun "Data" alaninin isaret ettigi msg property\'si bulunamadi.',
    suggestion: () => 'Veri {"SayfaAdi": [ {satir...} ]} seklinde bir OBJE olarak (duz bir dizi degil) "Data" alaninin isaret ettigi yola (varsayilan msg.payload.data) yerlestirilmeli.'
  }
];

/**
 * Runtime sirasinda yakalanan bir hatayi analiz eder, insan-okunur
 * sebep+oneri uretir. LLM CAGIRMAZ - deterministik desen eslestirme.
 */
function diagnoseError(node, err) {
  const message = (err && err.message) || String(err);
  const matched = ERROR_PATTERNS.find((p) => p.test(message));
  if (matched) {
    return {
      code: matched.code,
      cause: matched.cause(message),
      suggestion: matched.suggestion(message)
    };
  }
  return {
    code: 'UNKNOWN',
    cause: `"${node.name || node.type}" node'u calisirken beklenmeyen bir hata olustu: ${message}`,
    suggestion: 'Node un kodunu/config ini incele; gerekirse "AI ile Duzelt" butonuyla agent tan yardim iste.'
  };
}

export { validateFlow, diagnoseError };
