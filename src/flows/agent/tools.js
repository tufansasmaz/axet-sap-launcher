import { NODE_CATALOG, catalogEntry } from '../nodeCatalog.js';

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'list_node_types',
      description:
        'aXet.flows / Node-RED icin bilinen tum node tiplerini, kategorilerini ve config alanlarini listeler. Hangi node tipini kullanacagindan emin olmadiginda once bunu cagir.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_flow',
      description: 'Su anki flow un kompakt bir ozetini (node id/type/name/wires) dondurur. Bir sonraki adima gecmeden once mevcut durumu kontrol etmek icin kullan.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_node',
      description:
        'Canvas a yeni bir node ekler (input/function/output/audit/ai kategorileri). Config node eklemek icin add_config_node kullan. Basarili olursa yeni node un id sini dondurur; sonraki connect_nodes cagrilarinda bu id yi kullan.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Node tipi, orn: axetflows-http-in, http request, function, switch, change, http response, debug, enabler-llm, query, ms-graph-mail-send, e-mail, json-to-excel, excel-to-json, file, inject, catch, comment, use-case' },
          name: { type: 'string', description: 'Node uzerinde gorunecek isim (opsiyonel)' },
          config: {
            type: 'object',
            description: 'Node tipine ozel alanlar (orn function icin {func, outputs}; http in icin {method, url}; http request icin {url, method, ret}; e-mail icin {to, server, port}; use-case icin {userid, projectid, useCaseCategory, usecaseid, isAI, config})',
            additionalProperties: true
          }
        },
        required: ['type'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_config_node',
      description: 'Global config node ekler (axetflows-httpin-model-config, ms-graph-mail-config, audit-config, global-config). Bu node lar canvas ta gorunmez, diger node lardan referans alinir. Donen id yi ilgili node un config alaninda kullan.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Config node tipi' },
          config: { type: 'object', description: 'Config node a ozel alanlar', additionalProperties: true }
        },
        required: ['type'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_node',
      description: 'Var olan bir node un alanlarini (name, config alanlari, outputs sayisi vb.) guncelle.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          changes: { type: 'object', additionalProperties: true }
        },
        required: ['id', 'changes'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_node',
      description: 'Bir node u siler; ona giden tum baglantilar da temizlenir.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'connect_nodes',
      description: 'Bir node un cikisini (output_index, varsayilan 0) baska bir node a baglar (wire olusturur).',
      parameters: {
        type: 'object',
        properties: {
          from_id: { type: 'string' },
          to_id: { type: 'string' },
          output_index: { type: 'integer', default: 0 }
        },
        required: ['from_id', 'to_id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'disconnect_nodes',
      description: 'Iki node arasindaki mevcut baglantiyi (wire) kaldirir.',
      parameters: {
        type: 'object',
        properties: {
          from_id: { type: 'string' },
          to_id: { type: 'string' },
          output_index: { type: 'integer', default: 0 }
        },
        required: ['from_id', 'to_id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'auto_layout',
      description: 'Tum canvas node larinin x/y konumlarini akisin yonune gore otomatik yeniden hesaplar. Flow u olusturduktan/degistirdikten sonra cagir.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description:
        'Flow u dogru kurmak icin kullanicidan netlestirici bilgi gerektiginde bu tool u cagir ve turu bitir; kullanicinin cevabi bir sonraki mesaj olarak gelecek. Eger soru 2-4 net secenekten biri seklinde cevaplanabiliyorsa (evet/hayir, A/B/C secimi vb.) "options" ile kisa tiklanabilir secenekler oner - kullanici bunlara tek tikla cevap verebilir; serbest metinle de yazabilir.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Opsiyonel: 2-4 kisa (tek tikla secilebilecek) cevap secenegi. Sadece soru gercekten bu kalipta ise doldur, aksi halde bos birak.'
          }
        },
        required: ['question'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description: 'Flow tamamlandiginda (veya bu turda yapilabilecekler bittiginde) kisa bir ozet ile turu bitir.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
        additionalProperties: false
      }
    }
  }
];

export function createExecutor(model, bump) {
  function withBump(fn) {
    const res = fn();
    bump();
    return res;
  }

  return function executeTool(name, args = {}) {
    try {
      switch (name) {
        case 'list_node_types': {
          const summary = Object.entries(NODE_CATALOG).map(([type, meta]) => ({
            type,
            isConfig: Boolean(meta.isConfig),
            category: meta.category,
            fields: meta.fields
          }));
          return { text: JSON.stringify(summary) };
        }
        case 'get_flow': {
          return { text: JSON.stringify(model.compactSummary()) };
        }
        case 'add_node': {
          const id = withBump(() => model.addNode({ type: args.type, name: args.name, config: args.config || {} }));
          return { text: JSON.stringify({ id, type: args.type }), id };
        }
        case 'add_config_node': {
          const id = withBump(() => model.addNode({ type: args.type, config: args.config || {} }));
          return { text: JSON.stringify({ id, type: args.type }), id };
        }
        case 'update_node': {
          withBump(() => model.updateNode(args.id, args.changes || {}));
          return { text: `node ${args.id} guncellendi` };
        }
        case 'remove_node': {
          withBump(() => model.removeNode(args.id));
          return { text: `node ${args.id} silindi` };
        }
        case 'connect_nodes': {
          withBump(() => model.connect(args.from_id, args.to_id, args.output_index || 0));
          return { text: `${args.from_id} -> ${args.to_id} baglandi` };
        }
        case 'disconnect_nodes': {
          withBump(() => model.disconnect(args.from_id, args.to_id, args.output_index || 0));
          return { text: `${args.from_id} -> ${args.to_id} baglantisi kaldirildi` };
        }
        case 'auto_layout': {
          withBump(() => model.autoLayout());
          return { text: 'layout yeniden hesaplandi' };
        }
        case 'add_tab': {
          const id = withBump(() => model.addTab(args.name));
          return { text: JSON.stringify({ id, name: args.name || null }), id };
        }
        case 'switch_tab': {
          withBump(() => model.setActiveTab(args.id));
          return { text: `aktif sekme ${args.id} oldu` };
        }
        case 'create_subflow': {
          const id = withBump(() => model.createSubflow(args.name));
          return { text: JSON.stringify({ id, name: args.name || null }), id };
        }
        case 'exit_subflow': {
          withBump(() => model.exitSubflow());
          return { text: 'subflow duzenlemeden cikildi, onceki sekmeye donuldu' };
        }
        case 'ask_user': {
          const payload = { question: args.question, options: Array.isArray(args.options) ? args.options.slice(0, 4) : [] };
          return { text: `Kullaniciya soruldu: ${args.question}`, control: 'ask_user', payload };
        }
        case 'finish': {
          const summary = args.summary || 'Flow tamamlandi.';
          return { text: summary, control: 'finish', payload: summary };
        }
        default:
          return { text: `bilinmeyen tool: ${name}`, error: true };
      }
    } catch (err) {
      return { text: `HATA: ${err.message}`, error: true };
    }
  };
}

export function describeCatalogForPrompt() {
  return Object.entries(NODE_CATALOG)
    .map(([type, meta]) => {
      const cat = meta.isConfig ? 'config-node' : meta.category;
      const outputs = meta.isConfig ? '-' : meta.outputs;
      return `- ${type} [${cat}] outputs=${outputs} fields=${(meta.fields || []).join(',')}${
        meta.configType ? ` (config referansi: ${meta.configField} -> ${meta.configType})` : ''
      }`;
    })
    .join('\n');
}

export function entryFor(type) {
  return catalogEntry(type);
}
