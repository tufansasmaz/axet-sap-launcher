// Hazir senaryo sablonlari — aXet.flows egitim dokumanlarindan ve kullanicidan
// alinan ornek flow JSON'undan cikarilan, gercekci ve calisir konfigurasyonlu
// tek-tikla eklenebilir flow parcalari. Her sablon, bos bir FlowModel container'i
// (yeni bir tab) uzerinde addNode/connect/autoLayout cagirarak kendini kurar.

function addHttpEndpoint(model, { method, url, summary, description }) {
  const configId = model.addNode({
    type: 'axetflows-httpin-model-config',
    config: {
      summary,
      description,
      tags: '',
      consumes: 'application/json',
      produces: 'application/json',
      parameters: [],
      responses: { 200: { description: 'OK' } },
      deprecated: false
    }
  });
  const httpInId = model.addNode({
    type: 'axetflows-http-in',
    name: `${method.toUpperCase()} ${url}`,
    config: { url, method, upload: false, modelSchema: configId, associatedLocalStorageDatabaseId: '' },
    x: 80,
    y: 120
  });
  return { httpInId, configId };
}

export const TEMPLATES = [
  {
    id: 'http-ai-query',
    name: 'HTTP + AI Sorgu',
    category: 'AI',
    description:
      'POST endpoint acar, gelen mesaji enabler-llm ile AI modeline sorar, cevabi HTTP response olarak doner. Hata olursa catch+error handling+500 doner.',
    build(model) {
      const { httpInId } = addHttpEndpoint(model, {
        method: 'post',
        url: '/api/v1/agent-task',
        summary: 'Agent task endpoint',
        description: 'Receives a task and forwards it to the AI model.'
      });
      const prepId = model.addNode({
        type: 'function',
        name: 'Prompt Hazirla',
        config: {
          func: "msg.messages = [\n  { role: 'system', content: 'You are a helpful assistant.' },\n  { role: 'user', content: msg.payload && msg.payload.task ? msg.payload.task : String(msg.payload) }\n];\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const aiId = model.addNode({
        type: 'enabler-llm',
        name: 'AI',
        config: { model: 'gpt-4o-mini', slug: 'ntt', projectid: '' },
        x: 560,
        y: 120
      });
      const extractId = model.addNode({
        type: 'function',
        name: 'Cevabi Cikart',
        config: { func: 'msg.payload = msg.payload.choices[0].message.content;\nreturn msg;', outputs: 1 },
        x: 800,
        y: 120
      });
      const okId = model.addNode({ type: 'http response', name: 'ok response', config: { statusCode: '200', headers: {} }, x: 1040, y: 120 });
      const catchId = model.addNode({ type: 'catch', name: 'catch errors', config: { scope: null, uncaught: false }, x: 560, y: 320 });
      const errId = model.addNode({
        type: 'function',
        name: 'error handling',
        config: { func: 'msg.payload = { error: "server error" };\nreturn msg;', outputs: 1 },
        x: 800,
        y: 320
      });
      const koId = model.addNode({ type: 'http response', name: 'ko response', config: { statusCode: '500', headers: {} }, x: 1040, y: 320 });

      model.connect(httpInId, prepId);
      model.connect(prepId, aiId);
      model.connect(aiId, extractId);
      model.connect(extractId, okId);
      model.connect(catchId, errId);
      model.connect(errId, koId);
    }
  },
  {
    id: 'excel-export',
    name: 'Excel Export',
    category: 'Excel',
    description:
      'GET endpoint acar, gelen JSON veriyi json-to-excel ile .xlsx buffer\'a cevirip HTTP response olarak (binary) doner.',
    build(model) {
      const { httpInId } = addHttpEndpoint(model, {
        method: 'get',
        url: '/api/v1/export-excel',
        summary: 'Export data to Excel',
        description: 'Returns a generated Excel file as a binary buffer.'
      });
      const prepId = model.addNode({
        type: 'function',
        name: 'Excel Verisini Hazirla',
        config: {
          func:
            "const incoming = msg.payload && msg.payload.data ? msg.payload.data : msg.payload;\nmsg.payload = { data: { Sheet1: Array.isArray(incoming) ? incoming : [] } };\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const excelId = model.addNode({
        type: 'json-to-excel',
        config: { kind: 'auto', bufferProp: 'payload.buffer', payloadProp: 'payload.data' },
        x: 560,
        y: 120
      });
      const respId = model.addNode({ type: 'http response', name: 'ok response', config: { statusCode: '200', headers: {} }, x: 800, y: 120 });

      model.connect(httpInId, prepId);
      model.connect(prepId, excelId);
      model.connect(excelId, respId);
    }
  },
  {
    id: 'excel-import',
    name: 'Excel Import (Upload → JSON)',
    category: 'Excel',
    description:
      'multipart/form-data ile yuklenen bir .xlsx dosyasini alir, excel-to-json ile JSON\'a cevirip HTTP response olarak doner.',
    build(model) {
      const configId = model.addNode({
        type: 'axetflows-httpin-model-config',
        config: {
          summary: 'Convert an Excel file to JSON',
          description: 'Receives an XLSX file as multipart/form-data and returns worksheet data as JSON.',
          tags: '',
          consumes: 'multipart/form-data',
          produces: 'application/json',
          parameters: [{ name: 'file', in: 'formData', description: 'Excel XLSX dosyasi', required: true, type: 'file' }],
          responses: { 200: { description: 'OK' } },
          deprecated: false
        }
      });
      const httpInId = model.addNode({
        type: 'axetflows-http-in',
        name: 'POST /api/v1/excel-to-json',
        config: { url: '/api/v1/excel-to-json', method: 'post', upload: true, modelSchema: configId, associatedLocalStorageDatabaseId: '' },
        x: 80,
        y: 120
      });
      const extractId = model.addNode({
        type: 'function',
        name: 'Yuklenen Dosyayi Cikart',
        config: {
          func:
            "const request = msg.req || {};\nlet file = request.file;\nif (!file && Array.isArray(request.files)) file = request.files[0];\nif (!file) { msg.statusCode = 400; msg.payload = { error: 'Dosya bulunamadi' }; return msg; }\nmsg.payload = file.buffer || file.data;\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const convertId = model.addNode({ type: 'excel-to-json', name: 'Excel -> JSON', x: 560, y: 120 });
      const respPrepId = model.addNode({
        type: 'function',
        name: 'JSON Cevabi Hazirla',
        config: {
          func: "if (msg.payload && msg.payload.data) msg.payload = msg.payload.data;\nreturn msg;",
          outputs: 1
        },
        x: 800,
        y: 120
      });
      const respId = model.addNode({ type: 'http response', name: 'Return JSON', config: { statusCode: '200', headers: {} }, x: 1040, y: 120 });

      model.connect(httpInId, extractId);
      model.connect(extractId, convertId);
      model.connect(convertId, respPrepId);
      model.connect(respPrepId, respId);
    }
  },
  {
    id: 'email-notification',
    name: 'Email Bildirimi (Outlook)',
    category: 'Bildirim',
    description:
      'Bir tetikleyiciden (inject) baslar, mail icerigini hazirlar, ms-graph-mail-send ile Outlook uzerinden gonderir ve audit icin use-case node ekler.',
    build(model) {
      const startId = model.addNode({
        type: 'inject',
        name: 'Start Flow',
        config: { props: [{ p: 'payload' }, { p: 'topic', vt: 'str' }], payloadType: 'date', once: false, onceDelay: 0.1, topic: 'Bildirim gonder' },
        x: 80,
        y: 120
      });
      const prepId = model.addNode({
        type: 'function',
        name: 'Mail Verisini Hazirla',
        config: {
          func:
            "msg.payload = {\n  subject: 'Notification from Axet Flows',\n  toRecipients: [{ emailAddress: { name: 'Alici', address: 'alici@example.com' } }],\n  body: { contentType: 'text', content: 'Bu otomatik bir bildirimdir.' }\n};\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const mailConfigId = model.addNode({
        type: 'ms-graph-mail-config',
        config: { authType: 'DELEGATED', optionalScopes: 'no', fromMail: '', tenant: '' }
      });
      const mailId = model.addNode({
        type: 'ms-graph-mail-send',
        name: 'Send Outlook Email',
        config: { to: '', subject: '', saveToSentItems: true, config: mailConfigId },
        x: 560,
        y: 120
      });
      const auditConfigId = model.addNode({ type: 'audit-config', config: { name: 'Audit Credentials', credentialname: '' } });
      const auditId = model.addNode({
        type: 'use-case',
        name: 'Audit Send Email Flow',
        config: {
          userid: '',
          projectid: '',
          useCaseCategory: 'AUDIT',
          usecaseid: 'UC-SEND-EMAIL',
          isAI: 'false',
          config: auditConfigId
        },
        x: 800,
        y: 120
      });

      model.connect(startId, prepId);
      model.connect(prepId, mailId);
      model.connect(mailId, auditId);
    }
  },
  {
    id: 'scheduled-task',
    name: 'Zamanlanmis Gorev (Cron)',
    category: 'Otomasyon',
    description: 'Belirli araliklarla (crontab) tetiklenen, bir function ile is yapan ve debug ile izlenen basit bir zamanlanmis gorev iskeleti.',
    build(model) {
      const cronId = model.addNode({
        type: 'inject',
        name: 'Her Gun 09:00',
        config: { crontab: '0 9 * * *', once: false, onceDelay: 0.1, payloadType: 'date' },
        x: 80,
        y: 120
      });
      const workId = model.addNode({
        type: 'function',
        name: 'Gorev Kodu',
        config: { func: '// Buraya periyodik calisacak isi yaz\nmsg.payload = { ranAt: new Date().toISOString() };\nreturn msg;', outputs: 1 },
        x: 320,
        y: 120
      });
      const debugId = model.addNode({ type: 'debug', name: 'Sonuc', config: { active: true, tosidebar: true, console: true, complete: 'payload' }, x: 560, y: 120 });

      model.connect(cronId, workId);
      model.connect(workId, debugId);
    }
  },
  {
    id: 'error-handling-skeleton',
    name: 'Hata Yonetimi Iskeleti',
    category: 'Otomasyon',
    description: 'Flow icindeki yakalanmamis hatalari yakalayan catch node + hata mesajini formatlayan function + 500 http response iskeleti.',
    build(model) {
      const catchId = model.addNode({ type: 'catch', name: 'Tum Hatalari Yakala', config: { scope: null, uncaught: true }, x: 80, y: 120 });
      const errId = model.addNode({
        type: 'function',
        name: 'Hata Formatla',
        config: {
          func: "msg.payload = { error: msg.error ? msg.error.message : 'bilinmeyen hata' };\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const debugId = model.addNode({ type: 'debug', name: 'Hata Detayi', config: { active: true, tosidebar: true, console: true, complete: 'payload' }, x: 560, y: 120 });
      const respId = model.addNode({ type: 'http response', name: 'ko response', config: { statusCode: '500', headers: {} }, x: 560, y: 260 });

      model.connect(catchId, errId);
      model.connect(errId, debugId);
      model.connect(errId, respId);
    }
  },
  {
    id: 'soap-excel-mail',
    name: 'Web Servisi -> Excel -> Mail',
    category: 'Entegrasyon',
    description:
      'Bir inject ile baslar, GERCEK Node-RED core "http request" node\'u ile dis bir XML/SOAP web servisini cagirir, yaniti obje dizisine donusturur, json-to-excel ile GERCEK bir .xlsx uretir ve gercek aXet.flows "e-mail" node\'u ile eke ekleyip mail gonderir (mail gonderme adimi bu masaustu ortaminda SIMULATE edilir - gercek SMTP/kurumsal relay kimlik bilgisi gerektirir). Ornek olarak oorsprong CountryInfoService doviz listesi endpoint\'i ile kurulmustur - kendi servisinle/mail bilgilerinle degistir.',
    build(model) {
      const startId = model.addNode({
        type: 'inject',
        name: 'Baslat',
        config: { payloadType: 'date', once: false, onceDelay: 0.1, topic: '' },
        x: 80,
        y: 140
      });
      const fetchId = model.addNode({
        type: 'http request',
        name: 'Doviz Listesini Cek',
        config: {
          url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso/ListOfCurrenciesByName',
          method: 'GET',
          ret: 'xml',
          headers: {},
          timeout: 15000
        },
        x: 320,
        y: 140
      });
      const reshapeId = model.addNode({
        type: 'function',
        name: 'Excel Icin Reshape Et',
        config: {
          func:
            "const list = (msg.payload.ArrayOftCurrency && msg.payload.ArrayOftCurrency.tCurrency) || [];\nmsg.payload = list.map((c) => ({ ISOKodu: c.sISOCode, DovizAdi: c.sName }));\nreturn msg;",
          outputs: 1
        },
        x: 560,
        y: 140
      });
      const excelId = model.addNode({
        type: 'json-to-excel',
        name: 'Excele Cevir',
        config: { kind: 'auto', bufferProp: 'payload.buffer', payloadProp: 'payload' },
        x: 800,
        y: 140
      });
      const mailId = model.addNode({
        type: 'e-mail',
        name: 'Mail Gonder',
        config: { to: '', server: '', port: '465', secure: true, tls: true },
        x: 1040,
        y: 140
      });
      const debugId = model.addNode({ type: 'debug', name: 'Mail Sonucu', config: { active: true, tosidebar: true, console: true, complete: 'payload' }, x: 1280, y: 140 });
      const catchId = model.addNode({ type: 'catch', name: 'Hata Yakala', config: { scope: null, uncaught: false }, x: 560, y: 320 });
      const errDebugId = model.addNode({ type: 'debug', name: 'Hata Detayi', config: { active: true, tosidebar: true, console: true, complete: 'error' }, x: 800, y: 320 });

      model.connect(startId, fetchId);
      model.connect(fetchId, reshapeId);
      model.connect(reshapeId, excelId);
      model.connect(excelId, mailId);
      model.connect(mailId, debugId);
      model.connect(catchId, errDebugId);
    }
  },
  // Kullanıcının bilfiil çalışan/host ettiği gerçek axet.flows Designer
  // instance'ından (v6.5.2, http://localhost:49275) Node-RED admin API'si
  // ile (`GET /flow/02a0271f8d7b944d`) BİREBİR çekilip buraya aktarılan
  // gerçek bir flow — hiçbir alan/config uydurulmadı, tamamı fetch edilen
  // JSON'daki değerlerin (fonksiyon kodları, config id referansları,
  // audit/agent ayarları dahil) doğrudan kopyası. Sadece node ID'leri
  // `model.addNode` tarafından yeniden üretiliyor (kaynaktaki ID'lerle
  // çakışmasın diye) — mantık/veri birebir aynı.
  {
    id: 'nosql-query-agent-summary',
    name: 'NoSQL Sorgu + AI Ozet + Audit',
    category: 'AI',
    description:
      "Gercek axet.flows Designer'dan (host edilen canli instance, v6.5.2) birebir aktarildi: GET /api/v1/query endpoint'i acar, 'documents' koleksiyonunu (opsiyonel status filtresiyle) nosql-query ile paginator'lu sorgular, sonuclari aXet Agent'a (gpt-5-mini, 'Data Analyst' rolu) ozetletir ve use-case node'u ile audit log'a kaydeder.",
    build(model) {
      const httpConfigId = model.addNode({
        type: 'axetflows-httpin-model-config',
        config: {
          summary: 'Query documents endpoint',
          description: 'Returns documents matching an optional status filter.',
          tags: 'query,api,documents',
          consumes: 'application/json',
          produces: 'application/json',
          parameters: [
            {
              in: 'query',
              name: 'status',
              type: 'string',
              required: false,
              description: 'Optional status filter for documents.',
              collectionFormat: 'csv'
            }
          ],
          responses: {
            200: {
              description: 'Successful summarized response.',
              schema: { properties: { summary: { type: 'string', name: 'summary' } } },
              code: '200'
            },
            400: {
              description: 'Bad request.',
              schema: { properties: { error: { type: 'string', name: 'error' } } },
              code: '400'
            }
          },
          deprecated: false
        }
      });
      const httpInId = model.addNode({
        type: 'axetflows-http-in',
        name: 'GET /api/v1/query',
        config: {
          url: '/api/v1/query',
          method: 'get',
          upload: false,
          modelSchema: httpConfigId,
          associatedLocalStorageDatabaseId: ''
        },
        x: 80,
        y: 120
      });
      const prepQueryId = model.addNode({
        type: 'function',
        name: 'Prepare Query Params',
        config: {
          func:
            "msg.collection = 'documents';\nmsg.pageNumber = 1;\nmsg.itemsPerPage = 10;\nmsg.searchFilter = msg.req && msg.req.query && msg.req.query.status ? { status: msg.req.query.status } : {};\nreturn msg;",
          outputs: 1
        },
        x: 320,
        y: 120
      });
      const queryId = model.addNode({
        type: 'nosql-query',
        name: 'Query Documents',
        config: {
          collectionProperty: '',
          collectionPropertyType: 'str',
          sort: false,
          paginator: true,
          searchFilterProperty: '',
          searchFilterPropertyType: 'msg',
          bindingProperty: '',
          bindingPropertyType: 'msg',
          sortProperty: '',
          sortPropertyType: 'json',
          pageNumberProperty: 'submission.paginator.pageNumber',
          pageNumberPropertyType: 'msg',
          itemsPerPageProperty: 'submission.paginator.itemsPerPage',
          itemsPerPagePropertyType: 'msg',
          totalItemsCountProperty: 'submission.paginator.totalResults',
          totalItemsCountPropertyType: 'msg'
        },
        x: 560,
        y: 120
      });
      const prepAgentId = model.addNode({
        type: 'function',
        name: 'Prepare Agent Task',
        config: {
          func: "msg.topic = 'Summarize the following documents: ' + JSON.stringify(msg.queryResults);\nreturn msg;",
          outputs: 1
        },
        x: 800,
        y: 120
      });
      const agentConfigId = model.addNode({
        type: 'axet-agent-config',
        config: { credentialname: 'DelegatedAuth-Credential' }
      });
      const agentId = model.addNode({
        type: 'aXet Agent',
        name: 'Summarize Documents',
        config: {
          config: agentConfigId,
          model: 'gpt-5-mini',
          slug: '',
          projectid: '',
          agent_role: 'Data Analyst',
          agent_goal: 'Summarize retrieved documents concisely and highlight key insights.',
          agent_tools: '',
          agent_backstory: 'You are an expert analyst who summarizes database query results into clear, actionable insights.'
        },
        x: 1040,
        y: 120
      });
      const auditConfigId = model.addNode({
        type: 'audit-config',
        config: { name: 'Audit Credentials', credentialname: 'AuthType=Delegated' }
      });
      const useCaseId = model.addNode({
        type: 'use-case',
        name: 'Log Query Use Case',
        config: {
          config: auditConfigId,
          userid: '00ubcugrl2mDtVQXE417',
          projectid: '',
          useCaseCategory: '',
          usecaseid: '',
          isAI: true
        },
        x: 1280,
        y: 120
      });

      model.connect(httpInId, prepQueryId);
      model.connect(prepQueryId, queryId);
      model.connect(queryId, prepAgentId);
      model.connect(prepAgentId, agentId);
      model.connect(agentId, useCaseId);
    }
  }
];

export function applyTemplate(model, templateId) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`applyTemplate: sablon bulunamadi (${templateId})`);
  template.build(model);
  model.autoLayout();
}
