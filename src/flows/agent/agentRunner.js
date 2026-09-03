import { buildSystemPrompt } from './systemPrompt.js';

const MAX_ITERATIONS = 20;
const MAX_INVALID_RETRIES = 3;
const MAX_ACTIONS_PER_BATCH = 12;

export function createTranscript() {
  return [];
}

function extractJson(rawText) {
  const trimmed = (rawText || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
}

// axet-code run her cagrildiginda yeni bir CLI process baslatiyor (auth/model
// yukleme dahil) - bu tek basina saniyeler surebilir. Onceden her tek aksiyon
// (bir add_node, bir connect_nodes...) icin ayri bir cagri yapiliyordu, bu da
// akici bir flow olustururken belirgin bir yavasliga sebep oluyordu. Simdi
// model bir LLM cevabinda BIRDEN FAZLA aksiyonu ayni anda dondurebiliyor
// ({"actions": [...]}); henuz gercek id'si bilinmeyen yeni node'lara "ref"
// takma adi verip ayni batch icindeki sonraki aksiyonlarda kullanabiliyor -
// boylece ayni is icin gereken axet-code cagri sayisi cok azaliyor.
function normalizeActions(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (Array.isArray(parsed.actions)) {
    const valid = parsed.actions.filter((a) => a && typeof a.action === 'string');
    return valid.length ? valid : null;
  }
  if (typeof parsed.action === 'string') return [parsed];
  return null;
}

function resolveRefs(value, aliasMap) {
  if (typeof value === 'string') {
    return aliasMap.has(value) ? aliasMap.get(value) : value;
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, aliasMap));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // "type" alani asla bir id/ref degeri tasimaz (node tipi string'i);
      // yanlislikla resolve edilmesin diye korunuyor.
      out[k] = k === 'type' ? v : resolveRefs(v, aliasMap);
    }
    return out;
  }
  return value;
}

function buildPrompt({ transcript, flowSummary, uiContext }) {
  const hasContext =
    uiContext && (uiContext.selectedNode || (uiContext.selectedCount || 0) > 1 || uiContext.validationIssues?.length);
  return [
    buildSystemPrompt(),
    '',
    'MEVCUT FLOW DURUMU (JSON):',
    JSON.stringify(flowSummary),
    '',
    ...(hasContext
      ? [
          'KULLANICI ARAYUZU BAGLAMI (su an ekranda ne var - JSON):',
          JSON.stringify(uiContext),
          '(selectedNode: kullanicinin canvas ta secili tuttugu node, varsa; validationIssues: deploy oncesi kontrolde bulunan sorunlar, varsa. Kullanici "bunu", "su node u", "hatayi duzelt" gibi belirsiz bir ifade kullanirsa bu baglami kullan.)',
          ''
        ]
      : []),
    'SOHBET / YAPILAN AKSIYONLARIN GECMISI:',
    transcript.length ? transcript.join('\n') : '(henuz yok)',
    '',
    'Simdi bir sonraki aksiyonu/aksiyonlari don: {"action":"...","args":{...}} VEYA {"actions":[{"action":"...","args":{...},"ref":"..."}, ...]}.'
  ].join('\n');
}

export async function runAgentTurn({ flowModel, model, transcript, userMessage, uiContext, executeTool, onEvent }) {
  if (userMessage) {
    transcript.push(`KULLANICI: ${userMessage}`);
    onEvent?.({ kind: 'user', text: userMessage });
  }

  // Baglayici karari icin kullanilacak metin. `userMessage` bos gelebilir
  // (ajan kendiliginden devam ediyor) — o zaman transcript'teki SON kullanici
  // satiri kullaniliyor, cunku konu hala o.
  const connectorText =
    userMessage || [...transcript].reverse().find((line) => line.startsWith('KULLANICI: ')) || '';

  let invalidRetries = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const prompt = buildPrompt({ transcript, flowSummary: flowModel.compactSummary(), uiContext });

    let raw;
    try {
      // Kullanicinin KENDI cumlesi ayrica geciyor: bagli Outlook/SharePoint
      // araclarinin bu turda acilip acilmayacagina o karar veriyor (bkz.
      // app-electron/main/connectorPolicy.ts). `prompt` gonderilemez —
      // icinde node katalogu var ve orada gecen "mail" her turu bosuna ~8 sn
      // yavaslatirdi. Turun HER iterasyonunda ayni metin gidiyor ki karar tur
      // ortasinda degismesin.
      const stepResult = await window.api.flowsAgentStep(prompt, model || null, connectorText);
      if (!stepResult.ok) throw new Error(stepResult.error || 'axet-code çağrısı başarısız oldu.');
      raw = stepResult.text || '';
    } catch (err) {
      onEvent?.({ kind: 'error', text: err.message || String(err) });
      return { stopped: 'error' };
    }

    const parsed = extractJson(raw);
    const actions = normalizeActions(parsed);
    if (!actions) {
      invalidRetries += 1;
      onEvent?.({ kind: 'error', text: `Gecersiz cikti (JSON action bulunamadi):\n${raw}` });
      if (invalidRetries > MAX_INVALID_RETRIES) {
        return { stopped: 'invalid_output' };
      }
      transcript.push(
        `SISTEM: onceki cevap gecersizdi, sadece {"action":"...","args":{...}} veya {"actions":[...]} formatinda JSON don. Alinan cikti: ${raw.slice(0, 300)}`
      );
      continue;
    }

    const aliasMap = new Map();
    let control = null;

    for (const act of actions.slice(0, MAX_ACTIONS_PER_BATCH)) {
      const resolvedArgs = resolveRefs(act.args || {}, aliasMap);
      onEvent?.({ kind: 'tool_call', name: act.action, args: resolvedArgs });
      const result = executeTool(act.action, resolvedArgs);
      onEvent?.({ kind: 'tool_result', name: act.action, text: result.text, error: Boolean(result.error) });
      transcript.push(`AKSIYON: ${act.action}(${JSON.stringify(resolvedArgs)}) => SONUC: ${result.text}`);

      if (act.ref && result.id) aliasMap.set(act.ref, result.id);

      if (result.control === 'ask_user') {
        control = { kind: 'ask_user', payload: result.payload };
        break;
      }
      if (result.control === 'finish') {
        control = { kind: 'finish', payload: result.payload };
        break;
      }
    }

    if (control?.kind === 'ask_user') {
      onEvent?.({ kind: 'question', text: control.payload.question, options: control.payload.options });
      return { stopped: 'ask_user', question: control.payload.question };
    }
    if (control?.kind === 'finish') {
      onEvent?.({ kind: 'finish', text: control.payload });
      return { stopped: 'finish', summary: control.payload };
    }
  }

  onEvent?.({ kind: 'error', text: 'Maksimum adim sayisina ulasildi, tur durduruldu.' });
  return { stopped: 'max_iterations' };
}
