// aXet.flows / Node-RED node type katalogu.
// KAPSAM KURALI (siddetle uygulanir): buradaki HER girdi ya (a) kullanicidan
// alinan gercek aXet.flows Designer flow JSON'unda birebir gecen bir "type"
// string'ine, (b) resmi egitim dokumanlarinda (AGENTS.md) acikca adi gecen
// ve Node-RED standart tip ismiyle birebir orten bir kategoriye (Switch,
// Change, Comment, Link, Subflow), YA DA (c) bu bilgisayarda kurulu gercek
// aXet.flows Electron uygulamasinin node paketi dosyalarindan (.html
// icindeki RED.nodes.registerType(...) cagrilari) dogrudan okunan type/
// category/defaults/inputs/outputs/color degerlerine dayanir. (c) kaynagi:
// C:\Users\<user>\AppData\Local\axet-flows\.deptapps-desktop\
//   electron-releases\WINDOWS_X64\latest-prod\resources\app\packages\
//   node_modules\@node-red\nodes\
// Genel/varsayimsal Node-RED core node'lari (mqtt, tcp, websocket, csv,
// xml, html, moment, delay, trigger, template, split, join, sort, range,
// filter, status, complete vb.) BURAYA EKLENMEZ - aXet.flows'ta var
// olduklarina dair hicbir kanit yok, sifir halusinasyon ilkesi geçerli.
//
// isConfig:true olan tipler canvas'ta gosterilmez (config node), sadece
// diger node'lardan bir referans alaniyla (configField) baglanir.
//
// formFields: manuel duzenleme paneli (NodeEditorPanel) icin alan tanimlari.
// Her biri { key, label, type, options?, placeholder?, rows? } seklinde.
// type: 'text' | 'textarea' | 'code' | 'number' | 'checkbox' | 'select' | 'json' | 'config-ref' | 'password'
// Enum secenekleri (options) SADECE dosyada literal olarak gorulen degerler
// icin verilir; bilinmeyen enum'lar 'text' olarak birakilir (uydurma yok).

export const NODE_CATALOG = {
  'subflow-in': {
    category: 'subflow',
    label: 'Subflow Girisi',
    color: '#dd9be0',
    inputs: 0,
    outputs: 1,
    fields: ['name'],
    defaults: { name: 'in' },
    formFields: [{ key: 'name', label: 'Port Adi', type: 'text' }]
  },
  'subflow-out': {
    category: 'subflow',
    label: 'Subflow Cikisi',
    color: '#dd9be0',
    inputs: 1,
    outputs: 0,
    fields: ['name'],
    defaults: { name: 'out' },
    formFields: [{ key: 'name', label: 'Port Adi', type: 'text' }]
  },
  inject: {
    category: 'input',
    label: 'inject',
    color: '#a6ce39',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'props', 'repeat', 'crontab', 'once', 'onceDelay', 'topic', 'payload', 'payloadType'],
    defaults: { name: '', topic: '', payload: '', payloadType: 'date', repeat: '', crontab: '', once: false, onceDelay: 0.1 },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'topic', label: 'Topic', type: 'text' },
      {
        key: 'payloadType',
        label: 'Payload Tipi',
        type: 'select',
        options: ['date', 'str', 'num', 'bool', 'json', 'none']
      },
      { key: 'payload', label: 'Payload', type: 'text' },
      { key: 'repeat', label: 'Tekrar (saniye)', type: 'text' },
      { key: 'crontab', label: 'Crontab', type: 'text' },
      { key: 'once', label: 'Deploy sonrasi bir kere calistir', type: 'checkbox' },
      { key: 'onceDelay', label: 'Once Delay (sn)', type: 'number' }
    ]
  },
  'axetflows-http-in': {
    category: 'network',
    label: 'HTTP In (aXet)',
    color: '#e6a23c',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'url', 'method', 'upload', 'modelSchema', 'associatedLocalStorageDatabaseId'],
    configType: 'axetflows-httpin-model-config',
    configField: 'modelSchema',
    defaults: { name: '', url: '/api/v1/resource', method: 'get', upload: false, modelSchema: '', associatedLocalStorageDatabaseId: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'url', label: 'URL', type: 'text', placeholder: '/api/v1/resource', required: true },
      { key: 'method', label: 'HTTP Metod', type: 'select', options: ['get', 'post', 'put', 'delete', 'patch'], required: true },
      { key: 'upload', label: 'Dosya Yuklemeyi Etkinlestir', type: 'checkbox' },
      { key: 'modelSchema', label: 'Model Schema (config)', type: 'config-ref', configType: 'axetflows-httpin-model-config' },
      { key: 'associatedLocalStorageDatabaseId', label: 'LocalStorage DB Id', type: 'text' }
    ]
  },
  'http in': {
    category: 'input',
    label: 'http in',
    color: '#e6a23c',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'url', 'method', 'upload', 'skipBodyParsing', 'swaggerDoc', 'securityConfig'],
    defaults: { name: '', url: '/testing', method: 'get', upload: false, skipBodyParsing: false, swaggerDoc: '', securityConfig: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      // Gercek deploy-time kontrolcusu (flowDiagnostics.js EMPTY_URL/method)
      // bu iki alani ZATEN bos birakilamaz sayiyor (axetflows-http-in ile
      // AYNI kontrol) - editor-time gostergesi de tutarli olsun diye
      // required:true eklendi (2026-08-29, "tum nodeler icin tutarli olsun"
      // canli bulgusu sonrasi).
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'method', label: 'HTTP Metod', type: 'select', options: ['get', 'post', 'put', 'delete', 'patch'], required: true },
      { key: 'upload', label: 'Dosya Yuklemeyi Etkinlestir', type: 'checkbox' },
      { key: 'skipBodyParsing', label: 'Body Parsing Atla', type: 'checkbox' },
      { key: 'swaggerDoc', label: 'Swagger Doc', type: 'text' },
      { key: 'securityConfig', label: 'Security Config', type: 'text' }
    ]
  },
  // Gercek Node-RED core node'u (aXet.flows'un Node-RED cekirdeginde de var -
  // network/21-httprequest.js, type tam olarak "http request" bosluklu).
  // Gercek defaults: name/method/ret(txt|bin|obj)/paytoqs/url/tls/persist/
  // proxy/insecureHTTPParser/authType/senderr/headers + credentials(user/
  // password). Bu katalogda SADECE bu motorun gercekten kullanabildigi alt
  // kumesi tutuluyor (method/ret/url/headers) + 'timeout' (builder'a ozel EK
  // alan, gercek node'da YOK, guvenlik/test amacli eklendi - asagida
  // isaretlendi). 'ret' alanina, gercek 3 secenegin (txt/bin/obj) yanina SOAP/
  // XML servisleri kolay test edebilmek icin builder'a ozel 4. bir secenek
  // ('xml' - fast-xml-parser ile GERCEKTEN parse edilir) eklendi, bu da
  // isaretlenmistir.
  'http request': {
    category: 'network',
    label: 'http request',
    color: 'rgb(231,231,174)',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'method', 'ret', 'url', 'headers', 'timeout'],
    defaults: { name: '', method: 'GET', ret: 'txt', url: '', headers: {}, timeout: 15000 },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      // flowDiagnostics.js EMPTY_URL bu node icin de deploy'u zaten bloke
      // ediyor - editor-time isareti tutarli olsun diye required:true.
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://ornek.com/servis', required: true },
      { key: 'method', label: 'HTTP Metod', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      { key: 'ret', label: 'Yanit Tipi (ret)', type: 'select', options: ['txt', 'bin', 'obj', 'xml'] },
      { key: 'headers', label: 'Headers (JSON)', type: 'json', rows: 3 },
      { key: 'timeout', label: 'Zaman Asimi (ms) - builder ozel ek alan', type: 'number' }
    ]
  },
  catch: {
    category: 'input',
    label: 'catch',
    color: '#e6a23c',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'scope', 'uncaught'],
    defaults: { name: '', scope: null, uncaught: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'scope', label: 'Scope (node id listesi, JSON)', type: 'json', rows: 2 },
      { key: 'uncaught', label: 'Yakalanmamis hatalari da yakala', type: 'checkbox' }
    ]
  },
  comment: {
    category: 'other',
    label: 'comment',
    color: '#fdf0c4',
    inputs: 0,
    outputs: 0,
    fields: ['name', 'info', 'icon'],
    defaults: { name: '', info: '', icon: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'info', label: 'Aciklama (Markdown)', type: 'textarea', rows: 6 },
      { key: 'icon', label: 'Icon', type: 'text', placeholder: 'font-awesome/fa-book' }
    ]
  },
  function: {
    category: 'function',
    label: 'function',
    color: '#ffcc66',
    inputs: 1,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: ['name', 'func', 'outputs', 'initialize', 'finalize'],
    defaults: { name: '', func: 'return msg;', outputs: 1, initialize: '', finalize: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'func', label: 'Function (on Message)', type: 'code', rows: 10 },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' },
      { key: 'initialize', label: 'Initialize', type: 'code', rows: 4 },
      { key: 'finalize', label: 'Finalize', type: 'code', rows: 4 }
    ]
  },
  switch: {
    category: 'function',
    label: 'switch',
    color: '#ffcc66',
    inputs: 1,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: ['name', 'property', 'rules', 'checkall', 'outputs'],
    defaults: { name: '', property: 'payload', rules: [{ t: 'eq', v: '' }], checkall: true, outputs: 1 },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'property', label: 'Property', type: 'text', placeholder: 'payload' },
      { key: 'rules', label: 'Kurallar (JSON)', type: 'json', rows: 6 },
      { key: 'checkall', label: 'Tum kurallari kontrol et', type: 'checkbox' },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' }
    ]
  },
  change: {
    category: 'function',
    label: 'change',
    color: '#ffcc66',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'rules'],
    defaults: { name: '', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: '', tot: 'str' }] },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'rules', label: 'Kurallar (JSON)', type: 'json', rows: 6 }
    ]
  },
  // Gercek deptapps-flows-contrib-nodes-enabler paketinden (v2.2.14):
  // category 'aXet AI', color #050a1a, icon nttdataenabler-icon.png.
  // defaults'a config (enabler-config referansi) eklendi - gercek node
  // projectid/model/slug alanlarini config node uzerinden Okta'ya baglar.
  'enabler-llm': {
    category: 'ai',
    label: 'AI (enabler-llm)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'model', 'slug', 'projectid', 'config'],
    configType: 'enabler-config',
    configField: 'config',
    defaults: { name: 'AI', model: 'gpt-4o-mini', slug: 'ntt', projectid: '', config: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'config', label: 'Enabler Config', type: 'config-ref', configType: 'enabler-config' }
    ]
  },
  // Gercek deptapps-flows-contrib-nodes-enabler/nodes/audio/audio.html'den
  // (2026-08-29 tam denetim, ONCEDEN KATALOGDA HIC YOKTU) eklendi: 'enabler-'
  // + 'audio' = 'enabler-audio', input:{project:true, model:false} - config
  // referansi var ama model/slug alani YOK (model:false).
  'enabler-audio': {
    category: 'ai',
    label: 'AI Audio (enabler-audio)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'projectid', 'config', 'language', 'translate'],
    configType: 'enabler-config',
    configField: 'config',
    defaults: { name: '', projectid: '', config: '', language: '', translate: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'config', label: 'Enabler Config', type: 'config-ref', configType: 'enabler-config' },
      { key: 'language', label: 'Dil', type: 'text' },
      { key: 'translate', label: 'Cevir (dil "en" degilse)', type: 'text' }
    ]
  },
  'enabler-config': {
    isConfig: true,
    label: 'Enabler Config',
    color: '#cccccc',
    fields: ['name'],
    defaults: { name: '' },
    // Gercek node.defaults.name required:true (2026-08-29 required-field denetimi).
    formFields: [{ key: 'name', label: 'Credential Name', type: 'text', required: true }]
  },
  // Gercek deptapps-flows-contrib-nodes-axet paketinden (v2.2.13) - aXet.gaia
  // GenAI sorgu node'lari. Egitim dokumanlarindaki (AGENTS.md Bolum 5) "aXet.gaia
  // sorgu node'u" burasi - gercek type string'i sadece "query" (axet-query DEGIL).
  query: {
    category: 'ai',
    label: 'AI Query (aXet.gaia)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'projectid', 'model', 'slug', 'language', 'groupid', 'context', 'formid', 'config'],
    configType: 'axet-config',
    configField: 'config',
    defaults: { name: 'query', projectid: '', model: '', slug: '', language: '', groupid: '', context: '', formid: '', config: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'language', label: 'Dil', type: 'select', options: ['es', 'en', 'pt'] },
      { key: 'groupid', label: 'Group ID (teknoloji/domain grubu)', type: 'text' },
      { key: 'context', label: 'Context (groupId@context)', type: 'text' },
      { key: 'formid', label: 'Form ID (aksiyon)', type: 'text' },
      { key: 'config', label: 'aXet Config', type: 'config-ref', configType: 'axet-config' }
    ]
  },
  refine: {
    category: 'ai',
    label: 'AI Refine (aXet.gaia)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'language', 'clarification', 'custom'],
    defaults: { name: 'refine', language: '', clarification: 'details', custom: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'language', label: 'Dil', type: 'select', options: ['es', 'en', 'pt'] },
      { key: 'clarification', label: 'Clarification Tipi', type: 'select', options: ['details', 'stepbystep', 'reformulation', 'summary', 'custom'] },
      { key: 'custom', label: 'Custom Metin (clarification=custom ise)', type: 'textarea', rows: 3 }
    ]
  },
  history: {
    category: 'ai',
    label: 'AI History (aXet.gaia)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'projectid', 'config'],
    configType: 'axet-config',
    configField: 'config',
    defaults: { name: 'history', projectid: '', config: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'config', label: 'aXet Config', type: 'config-ref', configType: 'axet-config' }
    ]
  },
  'axet-config': {
    isConfig: true,
    label: 'aXet Config',
    color: '#cccccc',
    fields: ['name'],
    defaults: { name: '' },
    // Gercek node.defaults.name required:true (2026-08-29 required-field denetimi).
    formFields: [{ key: 'name', label: 'Isim', type: 'text', required: true }]
  },
  'ms-graph-mail-send': {
    category: 'msgraph',
    label: 'Send Outlook Email',
    color: '#0078d4',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'to', 'subject', 'saveToSentItems', 'config'],
    configType: 'ms-graph-mail-config',
    configField: 'config',
    defaults: { name: 'Send Outlook Email', to: '', subject: '', saveToSentItems: true, config: '' },
    // Gercek generateNodeTypeForMsGraphMail sarmalayicisi config:{required:true}
    // olarak kayit ediyor (2026-08-29 required-field denetimi, canli bulgu:
    // config bos/gecersizken "Mail Gonder" node'u calisirken hata veriyordu).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'to', label: 'Alici (bos = msg.payload.toRecipients)', type: 'text' },
      { key: 'subject', label: 'Konu (bos = msg.payload.subject)', type: 'text' },
      { key: 'saveToSentItems', label: 'Gonderilenler klasorune kaydet', type: 'checkbox' },
      { key: 'config', label: 'Mail Config', type: 'config-ref', configType: 'ms-graph-mail-config', required: true }
    ]
  },
  // 'smtp-mail-send'/'smtp-config' KALDIRILDI - gercek aXet.flows Designer
  // palette'inde bu type string'leriyle HICBIR node yok (hallusinasyon idi).
  // GERCEK mail gonderme node'lari: 'ms-graph-mail-send' (Outlook/MS Graph,
  // yukarida) ve 'e-mail' (deptapps-flows-contrib-email paketi, asagida,
  // gercek nodemailer/IMAP SMTP relay kullanir).
  'json-to-excel': {
    category: 'function',
    label: 'JSON -> Excel',
    color: '#8fd694',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'kind', 'bufferProp', 'payloadProp'],
    defaults: { name: '', kind: 'auto', bufferProp: 'payload.buffer', payloadProp: 'payload.data' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'kind', label: 'Write into', type: 'select', options: ['auto', 'blank', 'buffer'] },
      { key: 'bufferProp', label: 'Buffer (sadece "buffer" icin)', type: 'text' },
      { key: 'payloadProp', label: 'Data (sayfa-adi -> satir dizisi obje yolu)', type: 'text' }
    ]
  },
  'excel-to-json': {
    category: 'function',
    label: 'Excel -> JSON',
    color: '#8fd694',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  'http response': {
    category: 'output',
    label: 'http response',
    color: '#6bb1ff',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'statusCode', 'headers'],
    defaults: { name: '', statusCode: '200', headers: {} },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'statusCode', label: 'Status Code', type: 'text', placeholder: '200' },
      { key: 'headers', label: 'Headers (JSON)', type: 'json', rows: 3 }
    ]
  },
  debug: {
    category: 'output',
    label: 'debug',
    color: '#6bb1ff',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'active', 'tosidebar', 'console', 'tostatus', 'complete', 'targetType', 'statusVal', 'statusType'],
    defaults: {
      name: '',
      active: true,
      tosidebar: true,
      console: true,
      tostatus: false,
      complete: 'payload',
      targetType: 'msg',
      statusVal: '',
      statusType: 'auto'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'active', label: 'Aktif', type: 'checkbox' },
      { key: 'tosidebar', label: 'Debug sidebar\'a yaz', type: 'checkbox' },
      { key: 'console', label: 'Console\'a yaz', type: 'checkbox' },
      { key: 'tostatus', label: 'Node status\'una yaz', type: 'checkbox' },
      { key: 'complete', label: 'Gosterilecek property', type: 'text', placeholder: 'payload' },
      { key: 'targetType', label: 'Target Type', type: 'text' }
    ]
  },
  'use-case': {
    category: 'audit',
    label: 'use case',
    color: '#050a1a',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'userid', 'projectid', 'useCaseCategory', 'usecaseid', 'isAI', 'config'],
    configType: 'audit-config',
    configField: 'config',
    // Gercek deptapps-flows-contrib-nodes-audit/nodes/use-case/use-case.html'den
    // (2026-08-29 denetim) dogrulandi: useCaseCategory/isAI serbest metin
    // ({type:'text'}, enum/select DEGIL) ve varsayilan degerleri BOS - onceki
    // 'AUDIT'/enum secenekleri hallusinasyondu, kaldirildi.
    defaults: { name: '', userid: '', projectid: '', useCaseCategory: '', usecaseid: '', isAI: '', config: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'userid', label: 'Okta User ID', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'useCaseCategory', label: 'Use Case Kategorisi', type: 'text' },
      { key: 'usecaseid', label: 'Use Case ID', type: 'text' },
      { key: 'isAI', label: 'AI kullanimi var mi (true/false)', type: 'text' },
      { key: 'config', label: 'Audit Config', type: 'config-ref', configType: 'audit-config' }
    ]
  },
  'link in': {
    category: 'other',
    label: 'link in',
    color: '#e6a23c',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'links'],
    defaults: { name: '', links: [] },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'links', label: 'Bagli link out id leri (JSON)', type: 'json', rows: 3 }
    ]
  },
  'link out': {
    category: 'other',
    label: 'link out',
    color: '#e6a23c',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'mode', 'links'],
    defaults: { name: '', mode: 'link', links: [] },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'mode', label: 'Mod', type: 'select', options: ['link', 'return'] },
      { key: 'links', label: 'Bagli link in id leri (JSON)', type: 'json', rows: 3 }
    ]
  },
  'axetflows-app': {
    category: 'ui',
    label: 'Application',
    color: '#4287f5',
    inputs: 0,
    outputs: 0,
    fields: [
      'name', 'menu', 'welcomePage', 'sidebarMenuOrientation', 'logoImage', 'schemeColor',
      'customCSS', 'customCSSErrors', 'authConfig', 'sessionExpireTimeInMinutes',
      'basicInternalDb', 'oktaDb', 'roles'
    ],
    configType: 'axetflows-scheme-color',
    configField: 'schemeColor',
    defaults: {
      name: '',
      menu: '',
      welcomePage: '',
      sidebarMenuOrientation: '',
      logoImage: '',
      schemeColor: '',
      customCSS: '',
      authConfig: 'authNone',
      sessionExpireTimeInMinutes: '',
      basicInternalDb: '',
      oktaDb: '',
      roles: []
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'menu', label: 'Menu', type: 'text' },
      { key: 'welcomePage', label: 'Karsilama Sayfasi', type: 'text' },
      { key: 'sidebarMenuOrientation', label: 'Sidebar Menu Orientation', type: 'text' },
      { key: 'logoImage', label: 'Logo Image', type: 'text' },
      { key: 'schemeColor', label: 'Renk Semasi (config)', type: 'config-ref', configType: 'axetflows-scheme-color' },
      { key: 'customCSS', label: 'Custom CSS', type: 'code', rows: 6 },
      { key: 'authConfig', label: 'Auth Tipi', type: 'select', options: ['authNone', 'Okta', 'authBasicInternal'] },
      { key: 'sessionExpireTimeInMinutes', label: 'Session Suresi (dk)', type: 'number' },
      { key: 'basicInternalDb', label: 'Basic Internal Auth (config)', type: 'config-ref', configType: 'deptapps-app-auth-basic-internal' },
      { key: 'oktaDb', label: 'Okta Auth (config)', type: 'config-ref', configType: 'deptapps-app-auth-okta' },
      { key: 'roles', label: 'Roles (JSON)', type: 'json', rows: 4 }
    ]
  },
  'axetflows-form': {
    category: 'ui',
    label: 'Form',
    color: '#86adeb',
    inputs: 0,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: [
      'name', 'onDocumentReadyButtonAction', 'formStructure', 'associatedEntityMetamodel',
      'associatedEntityFormType', 'associatedContractModelMetamodel', 'associatedPersistantFormId',
      'associatedLocalStorageDatabaseId', 'buttons', 'outputs'
    ],
    defaults: {
      name: '',
      onDocumentReadyButtonAction: '',
      formStructure: [],
      associatedEntityMetamodel: '',
      associatedEntityFormType: '',
      associatedContractModelMetamodel: '',
      associatedPersistantFormId: '',
      associatedLocalStorageDatabaseId: '',
      buttons: [],
      outputs: 1
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'onDocumentReadyButtonAction', label: 'Document Ready Buton Aksiyonu', type: 'text' },
      { key: 'formStructure', label: 'Form Yapisi (JSON)', type: 'json', rows: 8 },
      { key: 'associatedEntityMetamodel', label: 'Associated Entity Metamodel', type: 'text' },
      { key: 'associatedEntityFormType', label: 'Associated Entity Form Type', type: 'text' },
      { key: 'associatedContractModelMetamodel', label: 'Associated Contract Model Metamodel', type: 'text' },
      { key: 'associatedPersistantFormId', label: 'Associated Persistant Form Id', type: 'text' },
      { key: 'associatedLocalStorageDatabaseId', label: 'LocalStorage DB Id', type: 'text' },
      { key: 'buttons', label: 'Butonlar (JSON)', type: 'json', rows: 5 },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' }
    ]
  },
  'axetflows-form-data-store': {
    category: 'ui',
    label: 'Form Data Store',
    color: '#ffcc66',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  'axetflows-view-action': {
    category: 'ui',
    label: 'View Action',
    color: '#6482b0',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'action', 'redirectPage', 'downloadFile', 'fileName', 'inputType', 'message', 'messageType'],
    defaults: {
      name: '',
      action: '',
      redirectPage: '',
      downloadFile: '',
      fileName: '',
      inputType: '',
      message: '',
      messageType: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'action', label: 'Aksiyon', type: 'text' },
      { key: 'redirectPage', label: 'Yonlendirilecek Sayfa', type: 'text' },
      { key: 'downloadFile', label: 'Indirilecek Dosya', type: 'text' },
      { key: 'fileName', label: 'Dosya Adi', type: 'text' },
      { key: 'inputType', label: 'Input Tipi', type: 'text' },
      { key: 'message', label: 'Mesaj', type: 'text' },
      { key: 'messageType', label: 'Mesaj Tipi', type: 'text' }
    ]
  },
  'axetflows-rx-view-action': {
    category: 'ui',
    label: 'Reactive View Action',
    color: '#529ca3',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'action', 'page', 'message', 'messageType'],
    defaults: { name: '', action: '', page: '', message: '', messageType: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'action', label: 'Aksiyon', type: 'text' },
      { key: 'page', label: 'Sayfa', type: 'text' },
      { key: 'message', label: 'Mesaj', type: 'text' },
      { key: 'messageType', label: 'Mesaj Tipi', type: 'text' }
    ]
  },
  // ---------------------------------------------------------------------
  // asagidaki 5 tip axet-flows-contrib-nodes-axet-ui-spa paketinden (2026-08-29
  // tam denetim, ONCEDEN KATALOGDA HIC YOKTU) eklendi - derlenmis bir SPA'yi
  // (statik dosya sunumu VEYA gomulu git-clone+build) servis eden ve SSE
  // tabanli bir "SDK" mesaj koprusu sunan node aileси. 'axet-spa-app' ile
  // eski 'axetflows-app' AYNI flow'da BIRLIKTE KULLANILAMAZ (gercek node
  // bunu editor tarafinda otomatik siliyor) - agent bu ikisini asla ayni
  // flow'a eklemeMELI.
  'axet-spa-app': {
    category: 'ui',
    label: 'aXet SPA App',
    color: '#5B9BD5',
    inputs: 0,
    outputs: 0,
    fields: [
      'name', 'appId', 'appName', 'mode', 'entryFile', 'gitUrl', 'gitBranch', 'gitSubdir',
      'gitInstallCmd', 'gitBuildCmd', 'gitOutputDir', 'gitArtifactOnly', 'authType', 'customOkta',
      'issuer', 'clientId', 'audience', 'scopes', 'redirectUri', 'sessionExpireTimeInMinutes',
      'accessControl', 'accessRulesCollection', 'accessUsersCollection', 'accessProjectsCollection',
      'accessCacheTtl', 'accessBypassRoles', 'sseRetentionMs', 'sseMaxSessions', 'sseMaxOutboxBytes'
    ],
    defaults: {
      name: '', appId: '', appName: '', mode: 'http', entryFile: 'index.html',
      gitUrl: '', gitBranch: 'main', gitSubdir: '', gitInstallCmd: '', gitBuildCmd: '', gitOutputDir: '', gitArtifactOnly: false,
      authType: 'none', customOkta: false, issuer: '', clientId: '', audience: '', scopes: '', redirectUri: '',
      sessionExpireTimeInMinutes: 20, accessControl: 'auto', accessRulesCollection: '', accessUsersCollection: '',
      accessProjectsCollection: '', accessCacheTtl: 60, accessBypassRoles: '',
      sseRetentionMs: 60000, sseMaxSessions: 5000, sseMaxOutboxBytes: 262144
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'appId', label: 'App ID (harf/rakam/-/_)', type: 'text', required: true },
      { key: 'appName', label: 'App Adi', type: 'text' },
      { key: 'mode', label: 'Mod', type: 'select', options: ['http', 'sdk'] },
      { key: 'entryFile', label: 'Entry Dosyasi', type: 'text' },
      { key: 'gitUrl', label: 'Git URL (bos = statik dosya)', type: 'text' },
      { key: 'gitBranch', label: 'Git Branch', type: 'text' },
      { key: 'gitSubdir', label: 'Git Alt Klasor', type: 'text' },
      { key: 'gitInstallCmd', label: 'Install Komutu', type: 'text' },
      { key: 'gitBuildCmd', label: 'Build Komutu', type: 'text' },
      { key: 'gitOutputDir', label: 'Build Cikis Klasoru', type: 'text' },
      { key: 'gitArtifactOnly', label: 'Sadece Artifact Kullan', type: 'checkbox' },
      { key: 'authType', label: 'Auth Tipi', type: 'select', options: ['none', 'oidc'] },
      { key: 'customOkta', label: 'Ozel Okta Kullan', type: 'checkbox' },
      { key: 'issuer', label: 'OIDC Issuer', type: 'text' },
      { key: 'clientId', label: 'OIDC Client ID', type: 'text' },
      { key: 'audience', label: 'OIDC Audience', type: 'text' },
      { key: 'scopes', label: 'OIDC Scopes', type: 'text' },
      { key: 'redirectUri', label: 'Redirect URI', type: 'text' },
      { key: 'sessionExpireTimeInMinutes', label: 'Oturum Suresi (dk)', type: 'number' },
      { key: 'accessControl', label: 'Erisim Kontrolu', type: 'select', options: ['auto', 'manual', 'off'] },
      { key: 'accessRulesCollection', label: 'Erisim Kurallari Koleksiyonu', type: 'text' },
      { key: 'accessUsersCollection', label: 'Kullanicilar Koleksiyonu', type: 'text' },
      { key: 'accessProjectsCollection', label: 'Projeler Koleksiyonu', type: 'text' },
      { key: 'accessCacheTtl', label: 'Erisim Cache TTL (sn)', type: 'number' },
      { key: 'accessBypassRoles', label: 'Bypass Roller (virgulle)', type: 'text' },
      { key: 'sseRetentionMs', label: 'SSE Retention (ms, sdk modu)', type: 'number' },
      { key: 'sseMaxSessions', label: 'SSE Max Session (sdk modu)', type: 'number' },
      { key: 'sseMaxOutboxBytes', label: 'SSE Max Outbox Byte (sdk modu)', type: 'number' }
    ]
  },
  'axet-spa-sdk-event-in': {
    category: 'ui',
    label: 'SPA SDK Event In',
    color: '#5B9BD5',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'appId', 'channel'],
    defaults: { name: '', appId: '', channel: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'appId', label: 'App ID (axet-spa-app, mode=sdk)', type: 'text' },
      { key: 'channel', label: 'Channel', type: 'text' }
    ]
  },
  'axet-spa-sdk-event-out': {
    category: 'ui',
    label: 'SPA SDK Event Out',
    color: '#5B9BD5',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'appId', 'mode', 'channel', 'payloadTemplate', 'audience', 'audienceType', 'passthrough'],
    defaults: { name: '', appId: '', mode: 'emit', channel: '', payloadTemplate: '{{payload}}', audience: '', audienceType: 'json', passthrough: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'appId', label: 'App ID (axet-spa-app, mode=sdk)', type: 'text' },
      { key: 'mode', label: 'Mod', type: 'text', placeholder: 'emit' },
      { key: 'channel', label: 'Channel', type: 'text' },
      { key: 'payloadTemplate', label: 'Payload Template', type: 'text' },
      { key: 'audience', label: 'Audience', type: 'text' },
      { key: 'audienceType', label: 'Audience Tipi', type: 'text' },
      { key: 'passthrough', label: 'Passthrough', type: 'checkbox' }
    ]
  },
  'axet-spa-sdk-request-in': {
    category: 'ui',
    label: 'SPA SDK Request In',
    color: '#5B9BD5',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'appId', 'path', 'method'],
    defaults: { name: '', appId: '', path: '', method: 'post' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'appId', label: 'App ID (axet-spa-app, mode=sdk)', type: 'text' },
      { key: 'path', label: 'Path', type: 'text' },
      { key: 'method', label: 'HTTP Metod', type: 'select', options: ['get', 'post', 'put', 'delete', 'patch'] }
    ]
  },
  'axet-spa-sdk-request-out': {
    category: 'ui',
    label: 'SPA SDK Request Out',
    color: '#5B9BD5',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'appId', 'payloadTemplate'],
    defaults: { name: '', appId: '', payloadTemplate: '{{payload}}' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'appId', label: 'App ID (axet-spa-app, mode=sdk)', type: 'text' },
      { key: 'payloadTemplate', label: 'Payload Template', type: 'text' }
    ]
  },
  excel: {
    category: 'excel-utils',
    label: 'Excel (aXet)',
    color: '#6B8E23',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'file'],
    defaults: { name: '', file: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'file', label: 'Dosya', type: 'text' }
    ]
  },
  'excel-to-json-multiinput': {
    category: 'excel-utils',
    label: 'Excel -> JSON (Multi Input)',
    color: '#a6bbcf',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'sourcetype', 'filepath', 'parseCellDates', 'rangeCell', 'skipHeader'],
    defaults: { name: '', sourcetype: '', filepath: '', parseCellDates: false, rangeCell: '', skipHeader: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'sourcetype', label: 'Kaynak Tipi', type: 'text' },
      { key: 'filepath', label: 'Dosya Yolu', type: 'text' },
      { key: 'parseCellDates', label: 'Hucre Tarihlerini Parse Et', type: 'checkbox' },
      { key: 'rangeCell', label: 'Range Cell', type: 'text' },
      { key: 'skipHeader', label: 'Basligi Atla', type: 'checkbox' }
    ]
  },
  'axetflows-shell': {
    category: 'utils',
    label: 'Shell',
    color: '#b5a385',
    inputs: 1,
    outputs: 3,
    fields: ['name', 'cwd', 'script', 'notWaitEndBackgroundProcesses', 'executeInShellMode', 'env'],
    defaults: { name: '', cwd: '', script: '', notWaitEndBackgroundProcesses: false, executeInShellMode: false, env: [] },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'cwd', label: 'Calisma Klasoru (cwd)', type: 'text' },
      { key: 'script', label: 'Script', type: 'code', rows: 6 },
      { key: 'notWaitEndBackgroundProcesses', label: 'Arka plan islemlerini bekleme', type: 'checkbox' },
      { key: 'executeInShellMode', label: 'Shell Modunda Calistir', type: 'checkbox' },
      { key: 'env', label: 'Env (JSON)', type: 'json', rows: 3 }
    ]
  },
  'axetflows-remote-shell': {
    category: 'utils',
    label: 'Remote Shell',
    color: '#b5a385',
    inputs: 1,
    outputs: 3,
    fields: ['name', 'cwd', 'server', 'port', 'operatingSystemType', 'authmode', 'certificate', 'certificatePathFromPayload', 'script', 'env'],
    defaults: {
      name: '',
      cwd: '',
      server: '',
      port: '',
      operatingSystemType: '',
      authmode: '',
      certificate: '',
      certificatePathFromPayload: '',
      script: '',
      env: []
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'cwd', label: 'Calisma Klasoru (cwd)', type: 'text' },
      { key: 'server', label: 'Sunucu', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'operatingSystemType', label: 'Isletim Sistemi Tipi', type: 'text' },
      { key: 'authmode', label: 'Auth Modu', type: 'text' },
      { key: 'certificate', label: 'Sertifika', type: 'text' },
      { key: 'certificatePathFromPayload', label: 'Sertifika Yolu (msg.payload)', type: 'checkbox' },
      { key: 'script', label: 'Script', type: 'code', rows: 6 },
      { key: 'env', label: 'Env (JSON)', type: 'json', rows: 3 }
    ]
  },
  'axetflows-get-context': {
    category: 'utils',
    label: 'Get Context',
    color: '#b5a385',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'outputProp', 'outputPropType'],
    defaults: { name: '', outputProp: 'payload', outputPropType: 'msg' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'outputProp', label: 'Cikis Alani', type: 'text', placeholder: 'payload' },
      { key: 'outputPropType', label: 'Cikis Alani Tipi', type: 'text', placeholder: 'msg' }
    ]
  },
  'axetflows-db-persist': {
    category: 'deprecated',
    label: 'DB Persist (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbName', 'dbNameIsBlockByAutogeneration', 'property', 'propertyType'],
    defaults: { name: '', dbName: '', dbNameIsBlockByAutogeneration: false, property: 'payload', propertyType: 'msg' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'property', label: 'Alan', type: 'text', placeholder: 'payload' },
      { key: 'propertyType', label: 'Alan Tipi', type: 'text', placeholder: 'msg' }
    ]
  },
  'axetflows-db-query': {
    category: 'deprecated',
    label: 'DB Query (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: [
      'name', 'dbName', 'dbNameIsBlockByAutogeneration', 'useStrictSearchFilter', 'sort', 'paginator',
      'searchFilterProperty', 'searchFilterPropertyType', 'bindingProperty', 'bindingPropertyType',
      'sortProperty', 'sortPropertyType', 'pageNumberProperty', 'pageNumberPropertyType',
      'itemsPerPageProperty', 'itemsPerPagePropertyType', 'totalItemsCountProperty', 'totalItemsCountPropertyType'
    ],
    defaults: {
      name: '',
      dbName: '',
      dbNameIsBlockByAutogeneration: false,
      useStrictSearchFilter: false,
      sort: false,
      paginator: false,
      searchFilterProperty: '',
      searchFilterPropertyType: 'msg',
      bindingProperty: 'payload',
      bindingPropertyType: 'msg',
      sortProperty: '',
      sortPropertyType: 'msg',
      pageNumberProperty: '',
      pageNumberPropertyType: 'msg',
      itemsPerPageProperty: '',
      itemsPerPagePropertyType: 'msg',
      totalItemsCountProperty: '',
      totalItemsCountPropertyType: 'msg'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'useStrictSearchFilter', label: 'Strict Search Filter', type: 'checkbox' },
      { key: 'sort', label: 'Sort Aktif', type: 'checkbox' },
      { key: 'paginator', label: 'Paginator Aktif', type: 'checkbox' },
      { key: 'searchFilterProperty', label: 'Search Filter Alani', type: 'text' },
      { key: 'bindingProperty', label: 'Binding Alani', type: 'text' },
      { key: 'sortProperty', label: 'Sort Alani', type: 'text' },
      { key: 'pageNumberProperty', label: 'Sayfa No Alani', type: 'text' },
      { key: 'itemsPerPageProperty', label: 'Sayfa Basi Oge Alani', type: 'text' },
      { key: 'totalItemsCountProperty', label: 'Toplam Oge Sayisi Alani', type: 'text' }
    ]
  },
  'axetflows-db-remove': {
    category: 'deprecated',
    label: 'DB Remove (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbName', 'dbNameIsBlockByAutogeneration', 'property', 'propertyType'],
    defaults: { name: '', dbName: '', dbNameIsBlockByAutogeneration: false, property: 'payload', propertyType: 'msg' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'property', label: 'Alan', type: 'text', placeholder: 'payload' },
      { key: 'propertyType', label: 'Alan Tipi', type: 'text', placeholder: 'msg' }
    ]
  },
  'axetflows-db-remove-all': {
    category: 'deprecated',
    label: 'DB Remove All (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbName', 'dbNameIsBlockByAutogeneration', 'collectionProperty', 'collectionPropertyType'],
    defaults: { name: '', dbName: '', dbNameIsBlockByAutogeneration: false, collectionProperty: '', collectionPropertyType: 'msg' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani', type: 'text' }
    ]
  },
  'axetflows-db-find-one': {
    category: 'deprecated',
    label: 'DB Find One (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbName', 'dbNameIsBlockByAutogeneration', 'identifierProperty', 'identifierPropertyType', 'bindingProperty', 'bindingPropertyType'],
    defaults: {
      name: '',
      dbName: '',
      dbNameIsBlockByAutogeneration: false,
      identifierProperty: '',
      identifierPropertyType: 'msg',
      bindingProperty: 'payload',
      bindingPropertyType: 'msg'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'identifierProperty', label: 'Identifier Alani', type: 'text' },
      { key: 'bindingProperty', label: 'Binding Alani', type: 'text' }
    ]
  },
  'axetflows-db-flush': {
    category: 'deprecated',
    label: 'DB Flush (Deprecated)',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbName', 'flushById', 'dbNameIsBlockByAutogeneration'],
    defaults: { name: '', dbName: '', flushById: false, dbNameIsBlockByAutogeneration: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbName', label: 'DB Adi', type: 'text' },
      { key: 'flushById', label: 'Id ile Flush Et', type: 'checkbox' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'DB Adi Otomatik Uretilsin', type: 'checkbox' }
    ]
  },
  'axetflows-httpin-model-config': {
    isConfig: true,
    label: 'HTTP In Model Schema',
    color: '#cccccc',
    fields: ['summary', 'description', 'tags', 'consumes', 'produces', 'parameters', 'responses', 'deprecated'],
    defaults: {
      summary: '',
      description: '',
      tags: '',
      consumes: 'application/json',
      produces: 'application/json',
      parameters: [],
      responses: {},
      deprecated: false
    },
    formFields: [
      { key: 'summary', label: 'Summary', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'tags', label: 'Tags (virgulle)', type: 'text' },
      { key: 'consumes', label: 'Consumes', type: 'text' },
      { key: 'produces', label: 'Produces', type: 'text' },
      { key: 'parameters', label: 'Parameters (JSON)', type: 'json', rows: 6 },
      { key: 'responses', label: 'Responses (JSON)', type: 'json', rows: 6 },
      { key: 'deprecated', label: 'Deprecated', type: 'checkbox' }
    ]
  },
  'ms-graph-mail-config': {
    isConfig: true,
    label: 'MS Graph Mail Config',
    color: '#cccccc',
    // Gercek deptapps-flows-contrib-nodes-ms-graph-mail-client node'undan (v1.4.0):
    // authType secenekleri sadece DELEGATED ("Delegated") ve MANUAL ("Manual token
    // set from msg.msGraphToken") - APPLICATION secenegi gercek .html'de YORUM
    // SATIRINA ALINMIS, secilemez. optionalScopes ("Is a shared mailbox?") ve
    // tenant SADECE authType=DELEGATED ise gosterilir/anlamlidir. MANUAL modda
    // hicbir ek alan yok - token calisma zamaninda msg.msGraphToken uzerinden
    // gelir (clientId/clientSecret/tenantId alanlari APPLICATION moduna ait ve
    // gercek node'da devre disi, buraya eklenmedi - uydurma yok).
    fields: ['fromMail', 'authType', 'optionalScopes', 'tenant'],
    defaults: { fromMail: '', authType: 'DELEGATED', optionalScopes: 'no', tenant: '' },
    // Gercek node.defaults'ta authType/optionalScopes/fromMail required:true;
    // 'tenant' SEMA seviyesinde required:false (2026-08-29 tam required-field
    // denetimi) — ama GERCEK CANLI BULGU: authType='DELEGATED' iken tenant
    // bos birakilirsa "Mail Gonder"/"Mail Oku" node'u calisirken (msg
    // islenirken) "Please select the tenant within your config node..."
    // hatasiyla PATLAR (kaynak: axet-credentials/src/credentials/azure/
    // azure.js — 3 parcali tenant string'i bekleyen bir kontrol, hem
    // login-baslatma hem her mesaj isleme anında calisir). Bu yuzden
    // 'tenant' burada KOSULLU zorunlu (requiredIf) olarak isaretlendi -
    // sema disi ama GERCEK davranisi dogru yansitan bilincli bir ek kontrol.
    formFields: [
      { key: 'fromMail', label: 'From mail', type: 'text', required: true },
      { key: 'authType', label: 'Auth type', type: 'select', options: ['DELEGATED', 'MANUAL'], required: true },
      { key: 'optionalScopes', label: 'Is a shared mailbox? (sadece Delegated)', type: 'select', options: ['yes', 'no'], required: true },
      { key: 'tenant', label: 'Tenant (sadece Delegated icin zorunlu)', type: 'text', requiredIf: (raw) => raw?.authType === 'DELEGATED' }
    ]
  },
  'audit-config': {
    isConfig: true,
    label: 'Audit Config',
    color: '#cccccc',
    fields: ['name', 'credentialname'],
    defaults: { name: 'Audit Credentials', credentialname: '' },
    // Gercek node.defaults.credentialname required:true (2026-08-29 required-field denetimi).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'credentialname', label: 'Credential Name', type: 'text', required: true }
    ]
  },
  'global-config': {
    isConfig: true,
    label: 'Global Config (modules)',
    color: '#cccccc',
    fields: ['env', 'modules'],
    defaults: { env: [], modules: {} },
    formFields: [
      { key: 'env', label: 'Env (JSON)', type: 'json', rows: 4 },
      { key: 'modules', label: 'Modules (JSON)', type: 'json', rows: 6 }
    ]
  },
  'axetflows-scheme-color': {
    isConfig: true,
    label: 'Renk Semasi (Application)',
    color: '#cccccc',
    // Gercek node.defaults.name required:true (2026-08-29 required-field denetimi).
    fields: [
      'colors', 'name', 'navbarSidebarColorPrimary', 'navbarColor', 'sidebarColor',
      'navbarSidebarTextColor', 'navbarSidebarTextColorLink', 'navbarSidebarTextColorLinkFocusHover',
      'imageNavbarBlackOrWhite', 'bodyBackgroundColor', 'bodyTextColor', 'footerBackgroundColor',
      'footerTextColor', 'formInputColor', 'formInputColorFocus', 'formInputColorTBody',
      'formInputTextColor', 'formButtonColor', 'formButtonColorFocus', 'formButtonColorHover',
      'formButtonTextColor', 'cardColor', 'cardTextColor'
    ],
    defaults: {
      colors: '',
      name: '',
      navbarSidebarColorPrimary: '',
      navbarColor: '',
      sidebarColor: '',
      navbarSidebarTextColor: '',
      navbarSidebarTextColorLink: '',
      navbarSidebarTextColorLinkFocusHover: '',
      imageNavbarBlackOrWhite: '',
      bodyBackgroundColor: '',
      bodyTextColor: '',
      footerBackgroundColor: '',
      footerTextColor: '',
      formInputColor: '',
      formInputColorFocus: '',
      formInputColorTBody: '',
      formInputTextColor: '',
      formButtonColor: '',
      formButtonColorFocus: '',
      formButtonColorHover: '',
      formButtonTextColor: '',
      cardColor: '',
      cardTextColor: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text', required: true },
      { key: 'navbarColor', label: 'Navbar Rengi', type: 'text' },
      { key: 'sidebarColor', label: 'Sidebar Rengi', type: 'text' },
      { key: 'navbarSidebarColorPrimary', label: 'Navbar/Sidebar Ana Renk', type: 'text' },
      { key: 'navbarSidebarTextColor', label: 'Navbar/Sidebar Yazi Rengi', type: 'text' },
      { key: 'navbarSidebarTextColorLink', label: 'Navbar/Sidebar Link Rengi', type: 'text' },
      { key: 'navbarSidebarTextColorLinkFocusHover', label: 'Navbar/Sidebar Link Hover Rengi', type: 'text' },
      { key: 'imageNavbarBlackOrWhite', label: 'Navbar Logo (Siyah/Beyaz)', type: 'text' },
      { key: 'bodyBackgroundColor', label: 'Sayfa Arka Plan Rengi', type: 'text' },
      { key: 'bodyTextColor', label: 'Sayfa Yazi Rengi', type: 'text' },
      { key: 'footerBackgroundColor', label: 'Footer Arka Plan Rengi', type: 'text' },
      { key: 'footerTextColor', label: 'Footer Yazi Rengi', type: 'text' },
      { key: 'formInputColor', label: 'Form Input Rengi', type: 'text' },
      { key: 'formInputColorFocus', label: 'Form Input Focus Rengi', type: 'text' },
      { key: 'formInputColorTBody', label: 'Form Input Tablo Rengi', type: 'text' },
      { key: 'formInputTextColor', label: 'Form Input Yazi Rengi', type: 'text' },
      { key: 'formButtonColor', label: 'Form Buton Rengi', type: 'text' },
      { key: 'formButtonColorFocus', label: 'Form Buton Focus Rengi', type: 'text' },
      { key: 'formButtonColorHover', label: 'Form Buton Hover Rengi', type: 'text' },
      { key: 'formButtonTextColor', label: 'Form Buton Yazi Rengi', type: 'text' },
      { key: 'cardColor', label: 'Card Rengi', type: 'text' },
      { key: 'cardTextColor', label: 'Card Yazi Rengi', type: 'text' },
      { key: 'colors', label: 'Colors (raw)', type: 'text' }
    ]
  },
  'deptapps-app-auth-basic-internal': {
    isConfig: true,
    label: 'Auth: Basic Internal',
    color: '#cccccc',
    fields: ['configurationName', 'dbEngineType', 'databaseName', 'userField', 'passwordField', 'roleField', 'autoConfigured'],
    defaults: {
      configurationName: '',
      dbEngineType: '',
      databaseName: '',
      userField: '',
      passwordField: '',
      roleField: '',
      autoConfigured: false
    },
    // Gercek node.defaults'ta 6 alan da required:true (2026-08-29 denetim) -
    // deptapps-app-auth-ldap/-cas/-openid/-azure-ad'deki "requied" yazim
    // hatasindan (bkz. asagida) FARKLI olarak bu dosyada dogru yazilmis.
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'dbEngineType', label: 'DB Engine Tipi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text', required: true },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'passwordField', label: 'Sifre Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text', required: true },
      { key: 'autoConfigured', label: 'Otomatik Konfigure Edildi', type: 'checkbox' }
    ]
  },
  'deptapps-app-auth-okta': {
    isConfig: true,
    label: 'Auth: Okta',
    color: '#cccccc',
    fields: ['configurationName', 'dbEngineType', 'databaseName', 'userField', 'roleField', 'autoConfigured', 'defaults', 'defaultProject', 'defaultModel'],
    defaults: {
      configurationName: '',
      dbEngineType: '',
      databaseName: '',
      userField: '',
      roleField: '',
      autoConfigured: false,
      defaults: false,
      defaultProject: '',
      defaultModel: ''
    },
    // Gercek node.defaults'ta configurationName/dbEngineType/databaseName/
    // userField/roleField required:true (2026-08-29 denetim).
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'dbEngineType', label: 'DB Engine Tipi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text', required: true },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text', required: true },
      { key: 'autoConfigured', label: 'Otomatik Konfigure Edildi', type: 'checkbox' },
      { key: 'defaults', label: 'Defaults', type: 'checkbox' },
      { key: 'defaultProject', label: 'Default Project', type: 'text' },
      { key: 'defaultModel', label: 'Default Model', type: 'text' }
    ]
  },
  // asagidaki 4 node (LDAP/CAS/OpenID/Azure AD) - gercek .html dosyalarinda
  // 'databaseName'/'roleField' alanlari "requied: true" (YAZIM HATASI,
  // "required" degil) tasidigi icin GERCEKTE zorunlu DEGIL - Node-RED bu
  // yazim hatali key'i tanimadigindan sessizce yok sayar (2026-08-29
  // denetim). Bu, help text'te "(mandatory)" denmesine RAGMEN gercek
  // sema/davranis farkli - kasitli olarak bu tutarsizligi DUZELTMEDIK
  // (birebir gercek davranisi yansitmak icin), sadece 'configurationName'/
  // 'userField' (dogru yazilmis alanlar) required:true isaretlendi.
  'deptapps-app-auth-ldap': {
    isConfig: true,
    label: 'Auth: LDAP',
    color: '#cccccc',
    fields: ['configurationName', 'databaseName', 'userField', 'roleField'],
    defaults: { configurationName: '', databaseName: '', userField: '', roleField: '' },
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text' },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text' }
    ]
  },
  'deptapps-app-auth-cas': {
    isConfig: true,
    label: 'Auth: CAS',
    color: '#cccccc',
    fields: ['configurationName', 'databaseName', 'userField', 'roleField'],
    defaults: { configurationName: '', databaseName: '', userField: '', roleField: '' },
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text' },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text' }
    ]
  },
  'deptapps-app-auth-openid': {
    isConfig: true,
    label: 'Auth: OpenID Connect',
    color: '#cccccc',
    fields: ['configurationName', 'databaseName', 'userField', 'roleField'],
    defaults: { configurationName: '', databaseName: '', userField: '', roleField: '' },
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text' },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text' }
    ]
  },
  'deptapps-app-auth-azure-ad': {
    isConfig: true,
    label: 'Auth: Azure AD',
    color: '#cccccc',
    fields: ['configurationName', 'databaseName', 'userField', 'roleField'],
    defaults: { configurationName: '', databaseName: '', userField: '', roleField: '' },
    formFields: [
      { key: 'configurationName', label: 'Konfigurasyon Adi', type: 'text', required: true },
      { key: 'databaseName', label: 'Database Adi', type: 'text' },
      { key: 'userField', label: 'Kullanici Alani', type: 'text', required: true },
      { key: 'roleField', label: 'Rol Alani', type: 'text' }
    ]
  },
  // ---------------------------------------------------------------------
  // Asagidaki tipler, bu bilgisayarda kurulu GERCEK aXet.flows Electron
  // uygulamasinin node paketlerinden (packages/node_modules/@node-red/nodes
  // ve resources/app/node_modules/deptapps-flows-contrib-*) dogrudan
  // cikarilmistir (type/category/color/icon/defaults degerleri .html
  // registerType(...) cagrilarindan okundu). Kaynak klasor:
  // C:\Users\<user>\AppData\Local\axet-flows\.deptapps-desktop\
  //   electron-releases\WINDOWS_X64\latest-prod\resources\app\
  // ---------------------------------------------------------------------
  // NOT: eskiden burada 'audit-use-case' ("use case (alias)") adinda bir
  // giris vardi - 2026-08-29 tam denetiminde bu tipin GERCEK aXet.flows
  // paletinde HICBIR karsiligi olmadigi (registerType('audit-use-case', ...)
  // hicbir .html dosyasinda gecmiyor - sadece 'use-case', yukarida zaten
  // tanimli) kanitlandi ve KALDIRILDI - "sifir halusinasyon" ilkesine
  // aykiriydi, agent'in yanlislikla var olmayan bu tipi uretmesi riskini
  // tasiyordu.
  // Gercek deptapps-flows-contrib-axet-agents/nodes/agent-external-backend/
  // crewai-agent-extback.html'den (2026-08-29 tam denetim) dogrulandi: gercek
  // node bu tipi 'category: "Deprecated nodes"' ile kayit ediyor (bizim
  // "ai" kategorimizden farkli - gorsel bir grup, flow JSON'unu etkilemiyor)
  // - kategori 'deprecated'e cekildi, tutarlilik icin.
  'aXet Agent': {
    category: 'deprecated',
    label: 'aXet Agent (CrewAI)',
    color: '#050a1a',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'projectid', 'model', 'slug', 'agent_role', 'agent_goal', 'agent_tools', 'agent_backstory', 'config'],
    configType: 'axet-agent-config',
    configField: 'config',
    defaults: { name: '', projectid: '', model: '', slug: '', agent_role: '', agent_goal: '', agent_tools: '', agent_backstory: '', config: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'agent_role', label: 'Rol', type: 'text' },
      { key: 'agent_goal', label: 'Hedef', type: 'textarea', rows: 3 },
      { key: 'agent_tools', label: 'Araclar (virgulle)', type: 'text' },
      { key: 'agent_backstory', label: 'Backstory', type: 'textarea', rows: 3 },
      // Gercek kaynakta (crewai-agent-extback.html + generateNodeType core
      // fonksiyonu) `config` alani VAR ama required:false - onceden bu
      // katalogda TAMAMEN eksikti (kullanici config'i UI'dan hic secemiyordu),
      // 2026-08-29 ikinci tur denetiminde bulundu ve eklendi.
      { key: 'config', label: 'aXet Agent Config', type: 'config-ref', configType: 'axet-agent-config' }
    ]
  },
  'axet-agent-config': {
    isConfig: true,
    label: 'aXet Agent Config',
    color: '#cccccc',
    fields: ['credentialname'],
    defaults: { credentialname: '' },
    // Audit-config/enabler-config ile AYNI desen: credentialname required:true.
    formFields: [{ key: 'credentialname', label: 'Credential Name', type: 'text', required: true }]
  },
  'axet-agents-execute': {
    category: 'ai',
    label: 'aXet Agent Execute (Mastra)',
    color: '#050a1a',
    inputs: 1,
    outputs: 2,
    outputLabels: ['success', 'error'],
    fields: [
      'name', 'agentId', 'agentName', 'description', 'instructions', 'model', 'input', 'mcpTools',
      'coreTools', 'customTools', 'temperature', 'maxRetries', 'maxSteps', 'timeout', 'stream',
      'outputSchema', 'projectId'
    ],
    defaults: {
      name: '', agentId: '', agentName: '', description: '', instructions: '', model: '', input: '',
      mcpTools: '', coreTools: '', customTools: '', temperature: 0.7, maxRetries: 2, maxSteps: 15,
      timeout: 300000, stream: false, outputSchema: '', projectId: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'instructions', label: 'Instructions (prompt)', type: 'textarea', rows: 5 },
      { key: 'input', label: 'Input', type: 'textarea', rows: 3 },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'coreTools', label: 'Core Tools (virgulle)', type: 'text' },
      { key: 'mcpTools', label: 'MCP Tools (JSON)', type: 'json', rows: 4 },
      { key: 'customTools', label: 'Custom Tools (JSON)', type: 'json', rows: 4 },
      { key: 'temperature', label: 'Temperature', type: 'number' },
      { key: 'maxRetries', label: 'Max Retries', type: 'number' },
      { key: 'maxSteps', label: 'Max Steps', type: 'number' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
      { key: 'stream', label: 'Streaming (SSE)', type: 'checkbox' },
      { key: 'outputSchema', label: 'Output Schema (JSON)', type: 'json', rows: 4 },
      { key: 'projectId', label: 'Project ID', type: 'text' }
    ]
  },
  'axet-worker': {
    category: 'function',
    label: 'aXet Worker (high performance function)',
    color: '#E6CC80',
    inputs: 1,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: ['name', 'func', 'outputs', 'preset', 'poolSize', 'idleTimeout', 'maxQueue', 'timeout'],
    defaults: { name: '', func: '\nreturn msg;', outputs: 1, preset: 'default', poolSize: '', idleTimeout: '', maxQueue: '', timeout: 60000 },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'func', label: 'Function (worker_threads icinde calisir)', type: 'code', rows: 10 },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' },
      { key: 'preset', label: 'Havuz Preset', type: 'select', options: ['default', 'high-concurrency', 'heavy-tasks', 'single-thread', 'custom'] },
      { key: 'poolSize', label: 'Pool Size (custom)', type: 'number' },
      { key: 'idleTimeout', label: 'Idle Timeout (custom)', type: 'number' },
      { key: 'maxQueue', label: 'Max Queue (custom)', type: 'number' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number' }
    ]
  },
  'axet-ai-capability-config': {
    isConfig: true,
    label: 'aXet AI Capability Config',
    color: '#cccccc',
    fields: ['capName', 'capVersion', 'capGroup', 'capDescription', 'protocol', 'inputSchema', 'outputSchema', 'maxConcurrency', 'syncTimeout', 'tags', 'deprecated', 'sunsetDate'],
    defaults: {
      capName: '', capVersion: '1.0.0', capGroup: '', capDescription: '', protocol: 'mcp',
      inputSchema: '{"type":"object","properties":{}}', outputSchema: '', maxConcurrency: 10,
      syncTimeout: 30, tags: '', deprecated: false, sunsetDate: ''
    },
    // Gercek node.defaults'ta capName/capVersion/capGroup required:true
    // (+ ayrica regex/semver validate fonksiyonlari da var, bu turda
    // uygulanmadi - required yeterli, ek regex dogrulama kapsam disi).
    formFields: [
      { key: 'capName', label: 'Capability Adi (dotted)', type: 'text', placeholder: 'orn: sales.lookup', required: true },
      { key: 'capVersion', label: 'Versiyon (semver)', type: 'text', required: true },
      { key: 'capGroup', label: 'Group', type: 'text', required: true },
      { key: 'capDescription', label: 'Aciklama (LLM icin, <=180 karakter)', type: 'textarea', rows: 3 },
      { key: 'protocol', label: 'Protokol', type: 'select', options: ['mcp', 'a2a'] },
      { key: 'inputSchema', label: 'Input Schema (JSON)', type: 'json', rows: 5 },
      { key: 'outputSchema', label: 'Output Schema (JSON)', type: 'json', rows: 5 },
      { key: 'maxConcurrency', label: 'Max Concurrency', type: 'number' },
      { key: 'syncTimeout', label: 'Sync Timeout (sn, <=110)', type: 'number' },
      { key: 'tags', label: 'Tags (virgulle)', type: 'text' },
      { key: 'deprecated', label: 'Deprecated', type: 'checkbox' },
      { key: 'sunsetDate', label: 'Sunset Date', type: 'text' }
    ]
  },
  'axet-ai-capability-in': {
    category: 'ai',
    label: 'AI Capability In',
    color: '#050a1a',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'capability', 'validateInput'],
    configType: 'axet-ai-capability-config',
    configField: 'capability',
    defaults: { name: '', capability: '', validateInput: true },
    // Gercek node.defaults.capability required:true (2026-08-29 denetim).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'capability', label: 'Capability', type: 'config-ref', configType: 'axet-ai-capability-config', required: true },
      { key: 'validateInput', label: 'Input Schema Dogrula', type: 'checkbox' }
    ]
  },
  'axet-ai-capability-out': {
    category: 'ai',
    label: 'AI Capability Out',
    color: '#050a1a',
    inputs: 1,
    outputs: 0,
    fields: ['name', 'capability', 'validateOutput', 'defaultErrorStatusCode'],
    configType: 'axet-ai-capability-config',
    configField: 'capability',
    defaults: { name: '', capability: '', validateOutput: false, defaultErrorStatusCode: 500 },
    // Gercek node.defaults.capability required:true (2026-08-29 denetim).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'capability', label: 'Capability', type: 'config-ref', configType: 'axet-ai-capability-config', required: true },
      { key: 'validateOutput', label: 'Output Schema Dogrula', type: 'checkbox' },
      { key: 'defaultErrorStatusCode', label: 'Varsayilan Hata Status Kodu', type: 'number' }
    ]
  },
  // Gercek axet-flows-contrib-nodes-python-agent/nodes/python-agent/python-agent.html'den
  // (2026-08-29 tam denetim) eksik alanlar eklendi: pyenvTargetVersion, sourceCwd,
  // apiName, apiRoutes (gercek node'da "deprecated - kept for migration" yorumuyla
  // hala var), modelClientId. 'gitToken' gercek node'da ayri bir 'credentials'
  // (sifreli) alani - diger credential alanlari (secret/hidden-secret/ms-graph-*
  // config) ile AYNI tutarli desenle burada regular field olarak modellenmedi.
  'python-agent': {
    category: 'ai',
    label: 'Python Agent',
    color: '#306998',
    inputs: 1,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: [
      'name', 'outputs', 'runtimeMode', 'pythonVersion', 'pyenvTargetVersion', 'dedicatedEnv', 'timeout', 'maxMemory',
      'codeSource', 'sourceCwd', 'code', 'gitRepo', 'gitBranch', 'entrypoint', 'requirements', 'autoInstall',
      'envVars', 'exposeApi', 'gateway', 'apiName', 'enableAxetLlm', 'projectid', 'model', 'slug', 'modelClientId'
    ],
    configType: 'python-gateway',
    configField: 'gateway',
    defaults: {
      name: '', outputs: 1, runtimeMode: 'uv', pythonVersion: '3.12', pyenvTargetVersion: '', dedicatedEnv: false, timeout: 300,
      maxMemory: '512m', codeSource: 'inline', sourceCwd: '', code: '', gitRepo: '', gitBranch: 'main', entrypoint: 'main.py',
      requirements: '', autoInstall: true, envVars: '{}', exposeApi: false, gateway: '', apiName: '', enableAxetLlm: true,
      projectid: '', model: '', slug: '', modelClientId: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'runtimeMode', label: 'Runtime Modu', type: 'select', options: ['uv', 'pyenv', 'system-native'] },
      { key: 'pythonVersion', label: 'Python Versiyonu', type: 'text' },
      { key: 'pyenvTargetVersion', label: 'Pyenv Target Versiyonu', type: 'text' },
      { key: 'codeSource', label: 'Kod Kaynagi', type: 'select', options: ['inline', 'git', 'cwd'] },
      { key: 'sourceCwd', label: 'Kaynak CWD (codeSource=cwd)', type: 'text' },
      { key: 'code', label: 'Kod (inline)', type: 'code', rows: 10 },
      { key: 'gitRepo', label: 'Git Repo', type: 'text' },
      { key: 'gitBranch', label: 'Git Branch', type: 'text' },
      { key: 'entrypoint', label: 'Entrypoint', type: 'text' },
      { key: 'requirements', label: 'Requirements.txt Icerigi', type: 'textarea', rows: 4 },
      { key: 'autoInstall', label: 'Bagimliliklari Otomatik Kur', type: 'checkbox' },
      { key: 'timeout', label: 'Timeout (sn)', type: 'number' },
      { key: 'maxMemory', label: 'Max Memory', type: 'text' },
      { key: 'envVars', label: 'Env Vars (JSON)', type: 'json', rows: 3 },
      { key: 'exposeApi', label: 'HTTP API olarak disari ac', type: 'checkbox' },
      { key: 'apiName', label: 'API Adi', type: 'text' },
      { key: 'gateway', label: 'Python Gateway (config)', type: 'config-ref', configType: 'python-gateway' },
      { key: 'enableAxetLlm', label: 'aXet LLM Kimlik Bilgilerini Aktar', type: 'checkbox' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'modelClientId', label: 'Model Client ID', type: 'text' },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' }
    ]
  },
  // Gercek python-gateway.html'den eksik alanlar eklendi: corsMethods,
  // corsHeaders, agentRoutes (dispatch modu), backendPrefix/internalPort/
  // wsAuthMode (reverse-proxy modu). corsOrigins varsayilani gercekte '*'.
  'python-gateway': {
    isConfig: true,
    label: 'Python Gateway',
    color: '#cccccc',
    fields: [
      'name', 'mode', 'port', 'corsOrigins', 'corsMethods', 'corsHeaders', 'agentRoutes',
      'exposePrefix', 'backendPrefix', 'asgiApp', 'internalPort', 'enableWebSocket', 'authMode', 'wsAuthMode'
    ],
    defaults: {
      name: '', mode: 'dispatch', port: 8100, corsOrigins: '*', corsMethods: 'GET,POST,PUT,DELETE,OPTIONS', corsHeaders: '*',
      agentRoutes: '[]', exposePrefix: '/backend/api', backendPrefix: '', asgiApp: 'app.main:app', internalPort: 0,
      enableWebSocket: true, authMode: 'backend', wsAuthMode: 'cookie'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'mode', label: 'Mod', type: 'select', options: ['dispatch', 'reverse-proxy'] },
      { key: 'port', label: 'Port', type: 'number' },
      { key: 'corsOrigins', label: 'CORS Origins', type: 'text' },
      { key: 'corsMethods', label: 'CORS Methods', type: 'text' },
      { key: 'corsHeaders', label: 'CORS Headers', type: 'text' },
      { key: 'agentRoutes', label: 'Agent Routes (JSON, dispatch modu)', type: 'json', rows: 3 },
      { key: 'exposePrefix', label: 'Public Prefix', type: 'text' },
      { key: 'backendPrefix', label: 'Backend Prefix (reverse-proxy)', type: 'text' },
      { key: 'asgiApp', label: 'ASGI App (reverse-proxy)', type: 'text' },
      { key: 'internalPort', label: 'Internal Port (reverse-proxy)', type: 'number' },
      { key: 'enableWebSocket', label: 'WebSocket Etkin', type: 'checkbox' },
      { key: 'authMode', label: 'Auth Modu', type: 'select', options: ['backend', 'edge'] },
      { key: 'wsAuthMode', label: 'WS Auth Modu', type: 'text' }
    ]
  },
  // Gercek axet-flows-contrib-nodes-node-backend/nodes/node-backend/node-backend.html'den
  // eksik alanlar eklendi: 'language' (default 'javascript') ve 'inputs' (0/1,
  // gercek node'da 1 ile ayni yerde ayrica validate ediliyor).
  'node-backend': {
    category: 'function',
    label: 'aXet Node.js Backend',
    color: '#306998',
    inputs: 1,
    outputs: 'dynamic',
    outputsField: 'outputs',
    fields: [
      'name', 'inputs', 'outputs', 'executionMode', 'language', 'codeSource', 'code', 'gitRepo', 'gitBranch', 'entrypoint',
      'dependencies', 'autoInstall', 'timeout', 'maxMemory', 'exposeApi', 'apiPrefix', 'envVars',
      'enableAxetLlm', 'projectid', 'model'
    ],
    defaults: {
      name: '', inputs: 1, outputs: 1, executionMode: 'handler', language: 'javascript', codeSource: 'inline', code: '', gitRepo: '',
      gitBranch: 'main', entrypoint: 'index.js', dependencies: '', autoInstall: true, timeout: 300,
      maxMemory: '512m', exposeApi: false, apiPrefix: '', envVars: '{}', enableAxetLlm: true, projectid: '', model: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'executionMode', label: 'Calisma Modu', type: 'select', options: ['handler', 'server'] },
      { key: 'codeSource', label: 'Kod Kaynagi', type: 'select', options: ['inline', 'git'] },
      { key: 'code', label: 'Kod (inline)', type: 'code', rows: 10 },
      { key: 'gitRepo', label: 'Git Repo', type: 'text' },
      { key: 'gitBranch', label: 'Git Branch', type: 'text' },
      { key: 'entrypoint', label: 'Entrypoint', type: 'text' },
      { key: 'dependencies', label: 'Bagimliliklar (package.json deps, JSON/text)', type: 'textarea', rows: 3 },
      { key: 'autoInstall', label: 'Bagimliliklari Otomatik Kur', type: 'checkbox' },
      { key: 'timeout', label: 'Timeout (sn)', type: 'number' },
      { key: 'maxMemory', label: 'Max Memory', type: 'text' },
      { key: 'exposeApi', label: 'HTTP API olarak disari ac', type: 'checkbox' },
      { key: 'apiPrefix', label: 'API Prefix', type: 'text' },
      { key: 'envVars', label: 'Env Vars (JSON)', type: 'json', rows: 3 },
      { key: 'enableAxetLlm', label: 'aXet LLM Kimlik Bilgilerini Aktar', type: 'checkbox' },
      { key: 'projectid', label: 'Project ID', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'outputs', label: 'Cikis Sayisi', type: 'number' }
    ]
  },
  'sql-query': {
    category: 'db',
    label: 'SQL Query',
    color: '#1a305c',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'query'],
    defaults: { name: '', query: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'query', label: 'SQL (Mustache: {{payload.x}})', type: 'code', rows: 6 }
    ]
  },
  // Gercek axet-flows-contrib-nodes-db-nosql/nodes/nosql-count/nosql-count.html'den
  // (2026-08-29 tam denetim) tip/defaults birebir dogrulandi.
  'nosql-count': {
    category: 'db',
    label: 'NoSQL Count',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'collectionProperty', 'bindingProperty'],
    defaults: { name: '', collectionProperty: 'collection', bindingProperty: 'submission' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' },
      { key: 'bindingProperty', label: 'Binding Alani (msg.)', type: 'text' }
    ]
  },
  // Gercek nosql-find-one.html'den dogrulandi: collectionPropertyType eklendi
  // (bu node'da dbNameIsBlockByAutogeneration YOK - diger nosql-* node'lardan
  // farkli, gercek kaynak da bunu icermiyor).
  'nosql-find-one': {
    category: 'db',
    label: 'NoSQL Find One',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'collectionProperty', 'collectionPropertyType', 'identifierProperty', 'identifierPropertyType', 'bindingProperty', 'bindingPropertyType'],
    defaults: {
      name: '', collectionProperty: 'collection', collectionPropertyType: 'str',
      identifierProperty: '_id', identifierPropertyType: 'msg',
      bindingProperty: 'submission', bindingPropertyType: 'msg'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' },
      { key: 'identifierProperty', label: 'Identifier Alani (msg.)', type: 'text' },
      { key: 'bindingProperty', label: 'Binding Alani (msg.)', type: 'text' }
    ]
  },
  // Gercek nosql-persist.html'den eksik alanlar eklendi: dbNameIsBlockByAutogeneration,
  // collectionPropertyType, propertyType.
  'nosql-persist': {
    category: 'db',
    label: 'NoSQL Persist',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbNameIsBlockByAutogeneration', 'collectionProperty', 'collectionPropertyType', 'property', 'propertyType'],
    defaults: {
      name: '', dbNameIsBlockByAutogeneration: false, collectionProperty: 'collection', collectionPropertyType: 'str',
      property: 'submission', propertyType: 'msg'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'Koleksiyon Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' },
      { key: 'property', label: 'Veri Alani (msg.)', type: 'text' }
    ]
  },
  // Gercek nosql-query.html'den eksik alan eklendi: dbNameIsBlockByAutogeneration.
  'nosql-query': {
    category: 'db',
    label: 'NoSQL Query',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: [
      'name', 'dbNameIsBlockByAutogeneration', 'collectionProperty', 'sort', 'paginator', 'searchFilterProperty', 'bindingProperty',
      'sortProperty', 'pageNumberProperty', 'itemsPerPageProperty', 'totalItemsCountProperty'
    ],
    defaults: {
      name: '', dbNameIsBlockByAutogeneration: false, collectionProperty: 'collection', sort: false, paginator: false,
      searchFilterProperty: 'submission.searchFilterContainer', bindingProperty: 'submission.dataGrid',
      sortProperty: {}, pageNumberProperty: '', itemsPerPageProperty: '', totalItemsCountProperty: ''
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'Koleksiyon Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' },
      { key: 'sort', label: 'Sort Aktif', type: 'checkbox' },
      { key: 'paginator', label: 'Paginator Aktif', type: 'checkbox' },
      { key: 'searchFilterProperty', label: 'Search Filter Alani', type: 'text' },
      { key: 'bindingProperty', label: 'Binding Alani', type: 'text' },
      { key: 'sortProperty', label: 'Sort Alani (JSON)', type: 'json', rows: 2 },
      { key: 'pageNumberProperty', label: 'Sayfa No Alani', type: 'text' },
      { key: 'itemsPerPageProperty', label: 'Sayfa Basi Oge Alani', type: 'text' },
      { key: 'totalItemsCountProperty', label: 'Toplam Oge Sayisi Alani', type: 'text' }
    ]
  },
  // Gercek nosql-remove.html'den eksik alanlar eklendi.
  'nosql-remove': {
    category: 'db',
    label: 'NoSQL Remove',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbNameIsBlockByAutogeneration', 'collectionProperty', 'collectionPropertyType', 'property', 'propertyType'],
    defaults: {
      name: '', dbNameIsBlockByAutogeneration: false, collectionProperty: 'collection', collectionPropertyType: 'str',
      property: 'submission', propertyType: 'msg'
    },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'Koleksiyon Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' },
      { key: 'property', label: 'Veri Alani (msg.)', type: 'text' }
    ]
  },
  // Gercek nosql-remove-all.html'den eksik alan eklendi.
  'nosql-remove-all': {
    category: 'db',
    label: 'NoSQL Remove All',
    color: '#8fcdff',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'dbNameIsBlockByAutogeneration', 'collectionProperty'],
    defaults: { name: '', dbNameIsBlockByAutogeneration: false, collectionProperty: 'collection' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'dbNameIsBlockByAutogeneration', label: 'Koleksiyon Adi Otomatik Uretilsin', type: 'checkbox' },
      { key: 'collectionProperty', label: 'Koleksiyon Alani (msg.)', type: 'text' }
    ]
  },
  credentials: {
    category: 'credentials',
    label: 'Credentials',
    color: '#F98E1D',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'property', 'propertyType', 'encrypt'],
    defaults: { name: '', property: '', propertyType: 'msg', encrypt: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'property', label: 'Yazilacak Alan (msg./flow./global.)', type: 'text' },
      { key: 'encrypt', label: 'Simetrik Sifrele (salt ile)', type: 'checkbox' }
    ]
  },
  secret: {
    category: 'credentials',
    label: 'Secret',
    color: '#F98E1D',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'property', 'propertyType'],
    defaults: { name: '', property: '', propertyType: 'msg' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'property', label: 'Yazilacak Alan', type: 'text' }
    ]
  },
  'hidden-secret': {
    category: 'credentials',
    label: 'Hidden Secret',
    color: '#F98E1D',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'property', 'propertyType', 'encrypt'],
    defaults: { name: '', property: '', propertyType: 'msg', encrypt: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'property', label: 'Yazilacak Alan', type: 'text' },
      { key: 'encrypt', label: 'Simetrik Sifrele (salt ile)', type: 'checkbox' }
    ]
  },
  // Gercek axet-flows-contrib-nodes-userbot/dist/nodes/userbot/userbot.html +
  // oktabot/oktabot.html'den (2026-08-29 tam denetim, ONCEDEN KATALOGDA HIC
  // YOKTU) eklendi - type string'leri GERCEKTEN BUYUK HARFLE BASLIYOR
  // ('UserBot'/'OktaBot', diger tum tiplerin aksine) - kaynak koddan
  // dogrulandi, yazim hatasi degil. username/password/totpSecret gercek
  // node'da 'credentials' (sifreli, flow JSON'una asla yazilmayan) alanlar -
  // diger credential-tasiyan node'larla (ms-graph-mail-config/secret vb.)
  // AYNI desenle burada regular field olarak modellenmedi.
  UserBot: {
    category: 'credentials',
    label: 'UserBot',
    color: '#46364b',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  OktaBot: {
    category: 'credentials',
    label: 'OktaBot',
    color: '#46364b',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  'e-mail in': {
    category: 'network',
    label: 'e-mail in',
    color: '#c7e9c0',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'protocol', 'server', 'useSSL', 'port', 'box', 'disposition', 'criteria', 'repeat', 'fetch'],
    defaults: { name: '', protocol: 'IMAP', server: 'relay.emeal.nttdatareports.com', useSSL: true, port: 993, box: 'INBOX', disposition: 'Read', criteria: 'UNSEEN', repeat: 300, fetch: 'trigger' },
    // Gercek node.defaults.repeat required:true (2026-08-29 denetim).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'protocol', label: 'Protokol', type: 'select', options: ['IMAP', 'POP3'] },
      { key: 'server', label: 'Sunucu', type: 'text' },
      { key: 'useSSL', label: 'SSL Kullan', type: 'checkbox' },
      { key: 'port', label: 'Port', type: 'number' },
      { key: 'box', label: 'Klasor', type: 'text' },
      { key: 'disposition', label: 'Okuma Sonrasi', type: 'select', options: ['Read', 'Delete'] },
      { key: 'criteria', label: 'Arama Kriteri', type: 'text' },
      { key: 'repeat', label: 'Polling Araligi (sn)', type: 'number', required: true },
      { key: 'fetch', label: 'Fetch Modu', type: 'select', options: ['trigger', 'auto'] }
    ]
  },
  'e-mail': {
    category: 'network',
    label: 'e-mail (send)',
    color: '#c7e9c0',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'to', 'server', 'port', 'secure', 'tls'],
    defaults: { name: '', to: '', server: 'relay.emeal.nttdatareports.com', port: '465', secure: true, tls: true },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'to', label: 'Alici (bos = msg.to)', type: 'text' },
      { key: 'server', label: 'SMTP Sunucu', type: 'text' },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'secure', label: 'Secure', type: 'checkbox' },
      { key: 'tls', label: 'TLS', type: 'checkbox' }
    ]
  },
  'check-login': {
    category: 'network',
    label: 'Check Login (IMAP/POP3)',
    color: '#c7e9c0',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'protocol', 'server', 'useSSL', 'port'],
    defaults: { name: '', protocol: 'IMAP', server: 'imap.gmail.com', useSSL: true, port: 993 },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'protocol', label: 'Protokol', type: 'select', options: ['IMAP', 'POP3'] },
      { key: 'server', label: 'Sunucu', type: 'text' },
      { key: 'useSSL', label: 'SSL Kullan', type: 'checkbox' },
      { key: 'port', label: 'Port', type: 'number' }
    ]
  },
  'ms-graph-mail-read': {
    category: 'msgraph',
    label: 'Read Outlook Mail',
    color: '#0078d4',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'box', 'disposition', 'criteria', 'retrieveAttachments', 'config'],
    configType: 'ms-graph-mail-config',
    configField: 'config',
    defaults: { name: '', box: '', disposition: 'READ', criteria: 'UNSEEN', retrieveAttachments: false, config: '' },
    // Gercek generateNodeTypeForMsGraphMail sarmalayicisi config:{required:true} (bkz. ms-graph-mail-send).
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'box', label: 'Klasor', type: 'text' },
      { key: 'disposition', label: 'Okuma Sonrasi', type: 'select', options: ['READ', 'DELETE'] },
      { key: 'criteria', label: 'Arama Kriteri', type: 'text' },
      { key: 'retrieveAttachments', label: 'Eklentileri Getir', type: 'checkbox' },
      { key: 'config', label: 'Mail Config', type: 'config-ref', configType: 'ms-graph-mail-config', required: true }
    ]
  },
  'ms-graph-shp-config': {
    isConfig: true,
    label: 'MS Graph SharePoint Config',
    color: '#cccccc',
    fields: ['authType', 'domain', 'name', 'tenant'],
    defaults: { authType: '', domain: '', name: '', tenant: '' },
    // Gercek node.defaults'ta authType/domain required:true; tenant SEMA
    // seviyesinde required:false (2026-08-29 denetim) - ms-graph-mail-config
    // ile ayni "tenant her zaman gorunuyor ama sadece bazi durumlarda
    // gercekten zorunlu" deseni burada da olasi ama credentials (clientId/
    // tenantId/clientSecret, APPLICATION auth) ayri saklandigi ve bu
    // katalogda regular field olarak modellenmedigi icin (bkz. dosya basi
    // "credential-tasiyan node'lar" notu) koşullu bir requiredIf eklenmedi -
    // kanit yetersiz, uydurma yapilmadi.
    formFields: [
      { key: 'authType', label: 'Auth Type', type: 'text', required: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true },
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'tenant', label: 'Tenant', type: 'text' }
    ]
  },
  'ms-graph-shp-get-files': {
    category: 'msgraph',
    label: 'SharePoint: Get Files',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '/', config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-get-folders': {
    category: 'msgraph',
    label: 'SharePoint: Get Folders',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '/', config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-download-file': {
    category: 'msgraph',
    label: 'SharePoint: Download File',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'filename', 'destination', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '', filename: '', destination: '', config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'filename', label: 'Dosya Adi', type: 'text' },
      { key: 'destination', label: 'Hedef', type: 'text' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-upload-file': {
    category: 'msgraph',
    label: 'SharePoint: Upload File',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'filename', 'replace', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '', filename: '', replace: false, config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'filename', label: 'Dosya Adi', type: 'text' },
      { key: 'replace', label: 'Uzerine Yaz', type: 'checkbox' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-move-file': {
    category: 'msgraph',
    label: 'SharePoint: Move File',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'filename', 'sourceFilePath', 'destinationFilePath', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', filename: '', sourceFilePath: '', destinationFilePath: '', config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'filename', label: 'Dosya Adi', type: 'text' },
      { key: 'sourceFilePath', label: 'Kaynak Yol', type: 'text' },
      { key: 'destinationFilePath', label: 'Hedef Yol', type: 'text' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-delete-file': {
    category: 'msgraph',
    label: 'SharePoint: Delete File',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'deletePermanently', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '', deletePermanently: false, config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'deletePermanently', label: 'Kalici Sil', type: 'checkbox' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  'ms-graph-shp-create-shareable-link': {
    category: 'msgraph',
    label: 'SharePoint: Create Shareable Link',
    color: '#7E5BAA',
    inputs: 1,
    outputs: 1,
    fields: ['site', 'path', 'right', 'linkExpiration', 'accessTo', 'usersToGiveAccess', 'config'],
    configType: 'ms-graph-shp-config',
    configField: 'config',
    defaults: { site: '', path: '', right: '', linkExpiration: '', accessTo: '', usersToGiveAccess: '', config: '' },
    formFields: [
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'path', label: 'Yol', type: 'text' },
      { key: 'right', label: 'Yetki', type: 'select', options: ['view', 'edit'] },
      { key: 'linkExpiration', label: 'Link Gecerlilik', type: 'text' },
      { key: 'accessTo', label: 'Erisim Tipi', type: 'select', options: ['anonymous', 'organization', 'users'] },
      { key: 'usersToGiveAccess', label: 'Erisim Verilecek Kullanicilar', type: 'text' },
      { key: 'config', label: 'SharePoint Config', type: 'config-ref', configType: 'ms-graph-shp-config' }
    ]
  },
  save: {
    category: 'session',
    label: 'Session: Save',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  get: {
    category: 'session',
    label: 'Session: Get',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  set: {
    category: 'session',
    label: 'Session: Set',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'key', 'value'],
    defaults: { name: '', key: '', value: '' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'key', label: 'Key', type: 'text' },
      { key: 'value', label: 'Value', type: 'text' }
    ]
  },
  destroy: {
    category: 'session',
    label: 'Session: Destroy',
    color: '#8ce3b9',
    inputs: 1,
    outputs: 1,
    fields: ['name'],
    defaults: { name: '' },
    formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
  },
  junction: {
    category: 'other',
    label: 'junction',
    color: '#c9c9c9',
    inputs: 1,
    outputs: 1,
    fields: [],
    defaults: {},
    formFields: []
  },
  'link call': {
    category: 'other',
    label: 'link call',
    color: '#e6a23c',
    inputs: 1,
    outputs: 1,
    fields: ['name', 'links', 'linkType', 'timeout'],
    defaults: { name: '', links: [], linkType: 'static', timeout: '30' },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'links', label: 'Bagli link in id leri (JSON)', type: 'json', rows: 3 },
      { key: 'linkType', label: 'Link Tipi', type: 'select', options: ['static', 'dynamic'] },
      { key: 'timeout', label: 'Timeout (sn)', type: 'text' }
    ]
  },
  status: {
    category: 'other',
    label: 'status',
    color: '#94c1d0',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'scope'],
    defaults: { name: '', scope: null },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'scope', label: 'Scope (JSON)', type: 'json', rows: 2 }
    ]
  },
  complete: {
    category: 'other',
    label: 'complete',
    color: '#c0edc0',
    inputs: 0,
    outputs: 1,
    fields: ['name', 'scope', 'uncaught'],
    defaults: { name: '', scope: [], uncaught: false },
    formFields: [
      { key: 'name', label: 'Isim', type: 'text' },
      { key: 'scope', label: 'Scope (JSON)', type: 'json', rows: 2 },
      { key: 'uncaught', label: 'Yakalanmamis hatalari da yakala', type: 'checkbox' }
    ]
  }
};

const GENERIC_ENTRY = {
  category: 'function',
  label: null,
  color: '#d9d9d9',
  inputs: 1,
  outputs: 1,
  fields: ['name'],
  defaults: { name: '' },
  formFields: [{ key: 'name', label: 'Isim', type: 'text' }]
};

export function catalogEntry(type) {
  return NODE_CATALOG[type] || { ...GENERIC_ENTRY, label: type };
}

export function isConfigType(type) {
  return Boolean(NODE_CATALOG[type]?.isConfig);
}

export function defaultConfigFor(type) {
  return { ...(NODE_CATALOG[type]?.defaults || {}) };
}

export function formFieldsFor(type) {
  return NODE_CATALOG[type]?.formFields || catalogEntry(type).formFields || [];
}

export const KNOWN_TYPES = Object.keys(NODE_CATALOG);

export const CANVAS_TYPES = KNOWN_TYPES.filter((t) => !NODE_CATALOG[t].isConfig);
export const CONFIG_TYPES = KNOWN_TYPES.filter((t) => NODE_CATALOG[t].isConfig);

export const CATEGORY_LABELS = {
  input: 'Girisler',
  network: 'Network',
  function: 'Islem',
  ai: 'AI',
  ui: 'UI (Application/Form)',
  'excel-utils': 'Excel Utils',
  utils: 'Utils',
  output: 'Cikislar',
  audit: 'Audit',
  db: 'Veritabani (SQL/NoSQL)',
  msgraph: 'MS Graph (Mail/SharePoint)',
  credentials: 'Credentials',
  session: 'Session',
  deprecated: 'Deprecated Nodes',
  subflow: 'Subflow Portlari',
  other: 'Diger'
};

// Palette'te kategorilerin gosterilme sirasi (Node-RED/aXet.flows paletindeki
// mantiga uygun: once tetikleyiciler/girisler, sonra islem/AI, sonra
// cikislar/audit, en sonda UI/utils/deprecated gibi daha az kullanilanlar).
// 'subflow' kasitli olarak buraya alinmadi - subflow-in/out SADECE bir
// subflow duzenlenirken anlamlidir, bu yuzden NodePalette onlari ayri
// mantikla (aktif container subflow ise) ekler.
export const CATEGORY_ORDER = [
  'input',
  'network',
  'function',
  'ai',
  'output',
  'audit',
  'ui',
  'db',
  'msgraph',
  'credentials',
  'session',
  'excel-utils',
  'utils',
  'deprecated',
  'other'
];

export const SUBFLOW_PORT_TYPES = ['subflow-in', 'subflow-out'];

export function isSubflowPortType(type) {
  return SUBFLOW_PORT_TYPES.includes(type);
}

// Kategori -> node basligindaki kucuk ikon rozeti (tamamen bu uygulamanin
// kendi gorsel dili, aXet.flows'un resmi ikonlarini temsil etmez). NodeLegend
// ve FlowNode arasinda TEK kaynak burasi - ikili kopya tutulmaz.
export const CATEGORY_ICONS = {
  input: '⚡',
  network: '🌐',
  function: '🧩',
  ai: '🤖',
  output: '📤',
  audit: '🛡',
  ui: '🖥',
  db: '🗄',
  msgraph: '📧',
  credentials: '🔑',
  session: '🧷',
  'excel-utils': '📊',
  utils: '🛠',
  deprecated: '⚠',
  subflow: '🔗',
  other: '⬛'
};

export function iconForType(type) {
  const entry = catalogEntry(type);
  return CATEGORY_ICONS[entry.category] || CATEGORY_ICONS.other;
}

// Node karti govdesinde tip adinin altinda gosterilen kisa bilgi satiri.
// SADECE o node tipinin nodeCatalog'da gercekten tanimli olan alanlarindan
// (raw config) turetilir - uydurma/tahmini alan YOK. Bilinmeyen/bos deger
// icin null dondurulur (satir gosterilmez).
export function infoLineFor(raw) {
  if (!raw || typeof raw.type !== 'string') return null;
  const type = raw.type;
  switch (type) {
    case 'inject': {
      if (raw.crontab) return `cron: ${raw.crontab}`;
      if (raw.repeat) return `her ${raw.repeat} sn`;
      if (raw.once) return 'deploy sonrasi 1 kez';
      return raw.payloadType ? `payload: ${raw.payloadType}` : null;
    }
    case 'axetflows-http-in':
    case 'http in':
      return `${(raw.method || 'get').toUpperCase()} ${raw.url || '/'}`;
    case 'http request':
      return raw.url ? `${(raw.method || 'GET').toUpperCase()} ${raw.url}` : null;
    case 'e-mail':
      return raw.to || 'alici: msg.to';
    case 'catch':
      return raw.uncaught ? 'yakalanmamis hatalar dahil' : 'scope: belirli node\'lar';
    case 'function':
      return raw.outputs > 1 ? `${raw.outputs} cikis` : null;
    case 'switch': {
      const count = Array.isArray(raw.rules) ? raw.rules.length : 0;
      return count ? `${count} kural · ${raw.property || 'payload'}` : null;
    }
    case 'change': {
      const count = Array.isArray(raw.rules) ? raw.rules.length : 0;
      return count ? `${count} kural` : null;
    }
    case 'enabler-llm':
      return raw.model || null;
    case 'ms-graph-mail-send':
      return raw.to || 'alici: msg.payload';
    case 'json-to-excel':
      return raw.kind && raw.kind !== 'auto' ? raw.kind : null;
    case 'http response':
      return raw.statusCode ? `status: ${raw.statusCode}` : null;
    case 'debug':
      return raw.complete && raw.complete !== 'payload' ? raw.complete : null;
    case 'use-case':
      return raw.useCaseCategory || null;
    case 'link in':
    case 'link out': {
      const count = Array.isArray(raw.links) ? raw.links.length : 0;
      return count ? `${count} baglanti` : null;
    }
    case 'axetflows-app':
      return raw.authConfig && raw.authConfig !== 'authNone' ? `auth: ${raw.authConfig}` : null;
    case 'axetflows-form':
      return raw.outputs > 1 ? `${raw.outputs} buton cikisi` : null;
    case 'excel':
      return raw.file || null;
    case 'excel-to-json-multiinput':
      return raw.filepath || raw.sourcetype || null;
    case 'axetflows-shell':
      return raw.cwd || null;
    case 'axetflows-remote-shell':
      return raw.server ? `${raw.server}${raw.port ? ':' + raw.port : ''}` : null;
    case 'axetflows-get-context':
      return raw.outputProp && raw.outputProp !== 'payload' ? raw.outputProp : null;
    case 'axetflows-db-persist':
    case 'axetflows-db-query':
    case 'axetflows-db-remove':
    case 'axetflows-db-remove-all':
    case 'axetflows-db-find-one':
    case 'axetflows-db-flush':
      return raw.dbName || null;
    default:
      return null;
  }
}

// GERCEK Node-RED editor'unun (packages/node_modules/@node-red/editor-client)
// otomatik "required field" dogrulama mekanizmasinin AYNISI (2026-08-29
// arastirmasiyla dogrulandi): her formField'da `required:true` isaretli bir
// alan bos/undefined/null ise node GECERSIZ sayilir - node'un kendi
// oneditprepare/validate kodunun HICBIR SEY YAPMASINA GEREK KALMADAN, saf
// deklaratif bir kontrol. `requiredIf(raw)` ise GERCEK semada olmayan ama
// CANLI BULGUYLA kanitlanmis kosullu zorunluluklari (bkz. ms-graph-mail-
// config.tenant) modellemek icin bu projeye ozel eklenen bir uzanti - Node-
// RED'in kendisinde YOK, bizim editorumuzun "gercek calisma zamani hatasini
// deploy'dan ONCE gorunur kilma" hedefine hizmet ediyor.
export function getMissingRequiredFields(type, raw) {
  const entry = catalogEntry(type);
  const missing = [];
  for (const ff of entry.formFields || []) {
    const isRequiredNow = ff.required || (typeof ff.requiredIf === 'function' && ff.requiredIf(raw));
    if (!isRequiredNow) continue;
    const value = raw?.[ff.key];
    const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    if (isEmpty) missing.push({ key: ff.key, label: ff.label });
  }
  return missing;
}

export function isNodeValid(type, raw) {
  return getMissingRequiredFields(type, raw).length === 0;
}

// GERCEK Node-RED'in "config-ref alaninda gosterilen bir config node kendisi
// GECERSIZSE, ona referans veren node da GECERSIZ sayilir" davranisinin
// (bkz. arastirma bulgu #4, madde 3) AYNISI. Bu, tam olarak kullanicinin
// gercek canli bulgusunu (2026-08-29) modelliyor: "Mail Gönder" node'unun
// KENDI alanlari (to/subject/config) DOLU olabilir, ama isaret ettigi
// ms-graph-mail-config'in authType='DELEGATED' + tenant BOS olmasi node'u
// (ve config'i) GECERSIZ yapiyor - bu fonksiyon HER IKISINI de tek bir
// cagriyla tespit eder. `nodesById` verilmezse SADECE kendi alanlari
// kontrol edilir (config-ref zinciri atlanir).
export function getNodeValidationIssues(type, raw, nodesById) {
  const ownMissing = getMissingRequiredFields(type, raw);
  const configIssues = [];
  if (nodesById) {
    const entry = catalogEntry(type);
    for (const ff of entry.formFields || []) {
      if (ff.type !== 'config-ref') continue;
      const refId = raw?.[ff.key];
      if (!refId) continue;
      const configNode = nodesById[refId];
      if (!configNode) continue; // ayri bir kontrol (flowDiagnostics.js MISSING_CONFIG_REF) zaten kapsiyor
      const configMissing = getMissingRequiredFields(configNode.type, configNode);
      if (configMissing.length > 0) {
        configIssues.push({
          field: ff.key,
          fieldLabel: ff.label,
          configId: refId,
          configType: configNode.type,
          configLabel: configNode.name || catalogEntry(configNode.type).label || configNode.type,
          missing: configMissing
        });
      }
    }
  }
  return { ownMissing, configIssues };
}

export function isNodeFullyValid(type, raw, nodesById) {
  const { ownMissing, configIssues } = getNodeValidationIssues(type, raw, nodesById);
  return ownMissing.length === 0 && configIssues.length === 0;
}

// "is:config is:unused" (gercek aXet.flows editorunun Ctrl+F arama sozdizimi,
// bkz. arastirma) ile AYNI semantik: bir config node, ondan ONCE hicbir
// canvas/config node tarafindan 'config-ref' tipli bir formField uzerinden
// referans ALINMIYORSA "unused" sayilir. `nodesById` TUM tab/subflow'lardaki
// dugumleri (flat) icermelidir (bkz. FlowModel.snapshot().nodesById).
export function getConfigUsageMap(nodesById) {
  const usage = new Map();
  for (const node of Object.values(nodesById || {})) {
    if (!node || typeof node.type !== 'string') continue;
    const entry = catalogEntry(node.type);
    for (const ff of entry.formFields || []) {
      if (ff.type !== 'config-ref') continue;
      const refId = node[ff.key];
      if (refId && typeof refId === 'string') {
        usage.set(refId, (usage.get(refId) || 0) + 1);
      }
    }
  }
  return usage;
}

export function isConfigUnused(configId, nodesById) {
  const usage = getConfigUsageMap(nodesById);
  return !usage.has(configId) || usage.get(configId) === 0;
}

// WorkflowSidebar'daki "Connections" bolumu icin: bir config node'un GERCEK
// bir dis servise (mail/auth/audit) mi yoksa sadece gorsel/yardimci bir
// ayara (renk semasi, http-in model semasi, global modules) mi karsilik
// geldigini ve zorunlu alan(lar)inin doldurulup doldurulmadigini belirler.
// Bu NETWORK PING DEGILDIR (bu masaustu prototipte gercek dis servislere
// baglanti/kimlik dogrulama yok) - sadece "bu config node'un calisir olma
// ihtimali icin gerekli alan(lar) girilmis mi" kontrolu.
//
// 2026-08-29: eskiden burada elle bakimi gereken bir CONNECTION_IDENTITY_FIELD
// haritasi vardi (SADECE 9 config tipini kapsiyordu, TEK bir "kimlik alani"
// kontrol ediyordu) - artik TAMAMEN GENERIC: yukaridaki getMissingRequiredFields
// ile TUM formFields'taki TUM required/requiredIf alanlari kontrol ediliyor,
// yeni bir config tipi eklendiginde (veya bir alan required isaretlendiginde)
// bu fonksiyon otomatik olarak dogru calisir, elle bir harita guncellemesi
// gerekmez.
export function connectionKindFor(type) {
  const entry = catalogEntry(type);
  const hasRequiredField = (entry.formFields || []).some((ff) => ff.required || typeof ff.requiredIf === 'function');
  return hasRequiredField ? 'service' : 'settings';
}

export function connectionStatusFor(type, raw) {
  const missing = getMissingRequiredFields(type, raw);
  if (missing.length === 0) {
    return { ok: true, label: 'Yapilandirildi', detail: null };
  }
  return {
    ok: false,
    label: 'Eksik Alan',
    detail: `${missing.map((m) => m.label).join(', ')} bos`
  };
}

