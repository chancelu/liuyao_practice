// AI 助教客户端：流式问答（通过 /api/tutor 代理，支持任意 OpenAI 兼容端点）
// 模型配置统一在右上角「设置」中填写，仅存浏览器 localStorage，随请求头发给代理，不落任何文件
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircleQuestion, X, Sparkles, RefreshCw, Settings } from 'lucide-react';

export interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }

// —— 助教模型配置（端点 / Key / Model ID）——
export const DEFAULT_ENDPOINT = 'https://api.kimi.com/coding/v1/chat/completions';
export const DEFAULT_MODEL = 'k3-256k';
const CFG_STORAGE = 'tutor_model_config';
const OLD_KEY_STORAGE = 'kimi_tutor_api_key'; // 旧版单 Key 存储键，读取时自动迁移

export interface TutorConfig { endpoint: string; apiKey: string; model: string }

export function getTutorConfig(): TutorConfig | null {
  try {
    const raw = localStorage.getItem(CFG_STORAGE);
    if (raw) {
      const c = JSON.parse(raw) as TutorConfig;
      if (c && c.endpoint && c.apiKey && c.model) return c;
    }
    // 迁移旧版：只有 Kimi Key 的情况
    const old = localStorage.getItem(OLD_KEY_STORAGE);
    if (old) {
      const cfg: TutorConfig = { endpoint: DEFAULT_ENDPOINT, apiKey: old, model: DEFAULT_MODEL };
      localStorage.setItem(CFG_STORAGE, JSON.stringify(cfg));
      localStorage.removeItem(OLD_KEY_STORAGE);
      return cfg;
    }
  } catch { /* ignore */ }
  return null;
}
export function setTutorConfig(c: TutorConfig | null) {
  try {
    if (c) localStorage.setItem(CFG_STORAGE, JSON.stringify(c));
    else localStorage.removeItem(CFG_STORAGE);
  } catch { /* ignore */ }
}

/** 组装一次助教请求的 headers + body 增量（自定义端点时带上 endpoint） */
function tutorRequest(messages: ChatMsg[]): { headers: Record<string, string>; body: Record<string, unknown> } {
  const cfg = getTutorConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const body: Record<string, unknown> = { model: cfg?.model ?? DEFAULT_MODEL, messages };
  if (cfg) {
    headers['x-api-key'] = cfg.apiKey;
    if (cfg.endpoint && cfg.endpoint !== DEFAULT_ENDPOINT) body.endpoint = cfg.endpoint;
  }
  return { headers, body };
}

/** 打开全局「助教设置」对话框（由 SettingsKey.tsx 监听） */
export function openTutorSettings() {
  window.dispatchEvent(new CustomEvent('open-tutor-settings'));
}

// —— 服务端 Key 探测：模块级缓存，全站只请求一次 ——
let serverKeyCache: boolean | null = null;
let serverKeyPromise: Promise<boolean> | null = null;
export function probeServerKey(): Promise<boolean> {
  if (serverKeyCache !== null) return Promise.resolve(serverKeyCache);
  if (!serverKeyPromise) {
    serverKeyPromise = fetch('/api/tutor', { method: 'GET' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { serverKeyCache = !!j?.serverKey; return serverKeyCache; })
      .catch(() => { serverKeyCache = false; return false; });
  }
  return serverKeyPromise;
}

/** 助教是否可用（服务端已配 Key 或本机已配置模型） */
export function useTutorReady(): boolean | null {
  const [ready, setReady] = useState<boolean | null>(serverKeyCache !== null ? (serverKeyCache || !!getTutorConfig()) : null);
  useEffect(() => {
    let alive = true;
    probeServerKey().then((sv) => { if (alive) setReady(sv || !!getTutorConfig()); });
    const onKeyChanged = () => probeServerKey().then((sv) => setReady(sv || !!getTutorConfig()));
    window.addEventListener('tutor-key-changed', onKeyChanged);
    return () => { alive = false; window.removeEventListener('tutor-key-changed', onKeyChanged); };
  }, []);
  return ready;
}

// —— 轻量 Markdown 渲染（助教回复用）：**粗体**、`代码`、# 标题、【分节】、列表 ——
function mdInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <b key={i} className="text-[#ecdfc0]">{p.slice(2, -2)}</b>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i} className="bg-[#292219] px-1 rounded text-[#d4b578] text-[11px]">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

export function Md({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split('\n').map((raw, i) => {
        const t = raw.trim();
        if (!t) return <div key={i} className="h-1.5" />;
        const h = t.match(/^(#{1,4})\s+(.*)$/);
        if (h) return <div key={i} className="font-bold text-[#ecdfc0] mt-1.5">{mdInline(h[2])}</div>;
        if (/^【[^】]{2,12}】/.test(t)) {
          // 【标题】单独成行，或【标题】后接正文时标题加粗
          const m = t.match(/^【[^】]{2,12}】(.*)$/);
          return (
            <div key={i} className="mt-1.5">
              <span className="font-bold text-[#c9a962]">{t.match(/^【[^】]{2,12}】/)![0]}</span>
              {m?.[1] && <span>{mdInline(m[1])}</span>}
            </div>
          );
        }
        const li = t.match(/^([-*•]|\d+[.、])\s*(.*)$/);
        if (li) {
          return (
            <div key={i} className="pl-3.5 relative">
              <span className="absolute left-0 text-[#8d8670]">{li[1]}</span>
              <span>{mdInline(li[2])}</span>
            </div>
          );
        }
        return <div key={i}>{mdInline(raw)}</div>;
      })}
    </div>
  );
}

/** 调用助教（流式）。systemPrompt+guaContext 组成 system，history 为对话。
 *  onReasoning 可选：推理模型（如 k3）先输出的思考过程会经此回调实时上报，便于界面展示进度 */
export async function askTutor(
  systemPrompt: string,
  guaContext: string,
  history: ChatMsg[],
  onDelta: (text: string) => void,
  onReasoning?: (text: string) => void,
): Promise<string> {
  const messages: ChatMsg[] = [
    { role: 'system', content: systemPrompt + '\n\n以下是当前卦局数据：\n' + guaContext },
    ...history,
  ];
  const { headers, body } = tutorRequest(messages);
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `请求失败（${res.status}）`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  let reasoning = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    for (const line of parts) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta ?? {};
        const rc: string = delta.reasoning_content ?? '';
        if (rc && onReasoning) { reasoning += rc; onReasoning(reasoning); }
        const c: string = delta.content ?? '';
        if (c) { full += c; onDelta(full); }
      } catch { /* 忽略半行 */ }
    }
  }
  return full;
}

/** 用 AI 助教把具体问题归类为测事类别（定用神）。返回 { categoryId, reason } */
export async function classifyQuestion(
  question: string,
  categories: { id: string; label: string; yongshen: string }[],
): Promise<{ categoryId: string; reason: string }> {
  const list = categories.map((c) => `${c.id}｜${c.label}｜用神取${c.yongshen}爻`).join('\n');
  const prompt = [
    '你是六爻「定用神」助教，教材为六爻课程卷四（用神卷）。',
    '学员问了一件具体的事，请判断它属于下列哪个测事类别，并说明取用神的理由（注明卷四依据，80字内）。',
    '注意：同一个问题表面用词与真实所测可能不同，要抓住「最终想知道什么」来取用（如问面试能否通过，实际测录取文书，取父母爻）。',
    '',
    '类别列表（id｜名称｜用神）：',
    list,
    '',
    `学员的问题：「${question}」`,
    '',
    '严格只输出一行 JSON，不要输出任何其他文字、不要用代码块：',
    '{"category":"<类别id>","reason":"<取用理由>"}',
  ].join('\n');

  const classifyReq = tutorRequest([{ role: 'user', content: prompt }]);
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: classifyReq.headers,
    body: JSON.stringify(classifyReq.body),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `请求失败（${res.status}）`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    for (const line of parts) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        full += json.choices?.[0]?.delta?.content ?? '';
      } catch { /* 忽略半行 */ }
    }
  }
  const m = full.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`助教未返回有效归类：${full.slice(0, 120)}`);
  const parsed = JSON.parse(m[0]) as { category?: string; reason?: string };
  const hit = categories.find((c) => c.id === parsed.category);
  if (!hit) throw new Error(`助教返回了未知类别「${parsed.category}」，请手动选择`);
  return { categoryId: hit.id, reason: parsed.reason ?? '' };
}

/** 未配置 Key 时的引导条（全站统一去右上角设置） */
function KeyGuide() {
  return (
    <button
      onClick={openTutorSettings}
      className="w-full flex items-center justify-center gap-1.5 border-b border-[#3a2f1e] bg-[#1d1912] px-3 py-2 text-[11px] text-[#d4b578] hover:bg-[#2c2417] transition-colors"
    >
      <Settings size={12} /> 尚未配置助教模型 —— 点这里或右上角「设置」完成配置后即可提问
    </button>
  );
}

/** 单个提问面板（每步内嵌 / 全局共用）。Key 相关 UI 已全部收敛到全局设置 */
export function TutorPanel({
  systemPrompt, guaContext, placeholder, height = 'max-h-72',
}: {
  systemPrompt: string;
  guaContext: string;
  placeholder: string;
  height?: string;
}) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const ready = useTutorReady();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  // 卦局变化时清空对话，避免张冠李戴
  const ctxKey = guaContext.slice(0, 200);
  const prevKey = useRef(ctxKey);
  useEffect(() => {
    if (prevKey.current !== ctxKey) {
      prevKey.current = ctxKey;
      setHistory([]);
      setError('');
    }
  }, [ctxKey]);

  const send = async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setInput('');
    setError('');
    const newHistory: ChatMsg[] = [...history, { role: 'user', content: q }, { role: 'assistant', content: '' }];
    setHistory(newHistory);
    setStreaming(true);
    try {
      const answer = await askTutor(systemPrompt, guaContext, [...history, { role: 'user', content: q }], (partial) => {
        setHistory((h) => {
          const next = [...h];
          next[next.length - 1] = { role: 'assistant', content: partial };
          return next;
        });
      });
      setHistory((h) => {
        const next = [...h];
        next[next.length - 1] = { role: 'assistant', content: answer || '（助教未返回内容）' };
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHistory((h) => h.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="border border-[#3a2f1e] bg-[#17140f] rounded-xl overflow-hidden">
      {ready === false && <KeyGuide />}
      <div ref={scrollRef} className={`${height} overflow-y-auto px-3 py-2 space-y-2`}>
        {history.length === 0 && (
          <p className="text-[11px] text-[#8d8670] leading-relaxed">
            我是六爻助教（AI 驱动），通读卷一~卷四教材，也知道你当前这盘卦的全部细节。有什么不懂直接问，例如：「为什么这爻是真空不是假空」「世爻为什么是三爻」「这卦求财怎么看」。
          </p>
        )}
        {history.map((m, i) => (
          <div key={i} className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
            m.role === 'user' ? 'bg-[#2c2417] text-[#ecdfc0] ml-8 whitespace-pre-wrap' : 'bg-[#131008] border border-[#352b1c] text-[#d8d0b8] mr-4'
          }`}>
            {m.role === 'assistant'
              ? (m.content ? <Md text={m.content} /> : (streaming && i === history.length - 1 ? '思考中…' : ''))
              : m.content}
          </div>
        ))}
        {error && (
          <div className="text-[11px] text-red-300 bg-red-400/10 border border-red-400/25 rounded px-2 py-1.5 whitespace-pre-wrap">
            {error}
            {/API Key|401|未提供/.test(error) && (
              <button onClick={openTutorSettings} className="block mt-1 text-[#d4b578] underline underline-offset-2">
                去右上角「设置」配置助教模型 →
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[#3a2f1e] bg-[#131008] px-2 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }}
          placeholder={placeholder}
          className="flex-1 text-xs px-2 py-1.5 bg-transparent border-b border-[#352b1c] focus:outline-none focus:border-[#c9a962] placeholder:text-[#6b6353] transition-colors"
        />
        <button onClick={send} disabled={streaming || !input.trim()}
          className="p-1.5 rounded-full bg-gradient-to-b from-[#dcc084] to-[#b08d48] text-[#1a1408] disabled:opacity-30 hover:brightness-110 transition">
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

/** 每步内嵌的「对此步提问」折叠区 */
export function StepAsk({ stepTitle, systemPrompt, guaContext }: {
  stepNo: number; stepTitle: string; systemPrompt: string; guaContext: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-[#c9a962] border border-[#c9a962]/30 bg-transparent hover:bg-[#c9a962]/10 rounded-full px-3.5 py-1.5 transition-colors">
          <MessageCircleQuestion size={13} /> 对此步有疑问？问助教
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#c9a962] tracking-wider">针对「{stepTitle}」提问</span>
            <button onClick={() => setOpen(false)} className="text-[#8d8670] hover:text-[#c9a962]"><X size={14} /></button>
          </div>
          <TutorPanel systemPrompt={systemPrompt} guaContext={guaContext} placeholder={`就「${stepTitle}」提问，如：这一步为什么这么定？`} />
        </div>
      )}
    </div>
  );
}

/** AI 综合断卦/解读：完整分析（流式，面向小白）。文案可通过 props 覆盖以复用于八字 */
export function AiVerdict({ systemPrompt, guaContext, title, intro, buttonText, askText }: {
  systemPrompt: string;
  guaContext: string;
  title?: string;
  intro?: string;
  buttonText?: string;
  askText?: string;
}) {
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = useTutorReady();

  // 卦局变化时清空旧断卦，避免张冠李戴
  const ctxKey = guaContext.slice(0, 200);
  const prevKey = useRef(ctxKey);
  useEffect(() => {
    if (prevKey.current !== ctxKey) {
      prevKey.current = ctxKey;
      setText('');
      setReasoning('');
      setError('');
    }
  }, [ctxKey]);

  // 计时：让等待有感知（推理模型先想后答，长文可能需一两分钟）
  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setText('');
    setReasoning('');
    try {
      const ans = await askTutor(
        systemPrompt,
        guaContext,
        [{ role: 'user', content: askText ?? '请基于以上卦局数据，对我所问之事做完整综合断卦。' }],
        (partial) => setText(partial),
        (r) => setReasoning(r),
      );
      setText(ans || '（助教未返回内容）');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-xl border border-[#9a86c8]/35 bg-gradient-to-br from-[#1c1626] to-[#17140f] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#9a86c8]/25 bg-[#9a86c8]/10">
        <span className="text-xs font-bold flex items-center gap-1.5 text-[#cbbbea] tracking-wider">
          <Sparkles size={13} /> {title ?? 'AI 完整断卦（结论 / 应期 / 决策 / 化解）'}
        </span>
        {text && !busy && (
          <button onClick={run} className="flex items-center gap-1 text-[11px] text-[#cbbbea] hover:text-white rounded-full border border-[#9a86c8]/40 px-2.5 py-0.5 transition-colors">
            <RefreshCw size={11} /> 重新断
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        {ready === false && <div className="mb-2"><KeyGuide /></div>}
        {!text && !busy && !error && (
          <div className="text-center py-2">
            <p className="text-[11px] text-[#a79cc8] mb-2.5 leading-relaxed">
              {intro ?? '上面是规则引擎按教材条文的逐项判定。点击下方按钮，AI 会把整盘卦串起来，用大白话讲：所问之事结果如何、什么时候应验、该怎么决策、如何趋避化解。'}
            </p>
            <button onClick={run}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-full bg-gradient-to-b from-[#b6a0e0] to-[#8a76bd] text-[#17101f] hover:brightness-110 shadow-[0_2px_16px_rgba(154,134,200,0.35)] transition">
              <Sparkles size={15} /> {buttonText ?? '生成 AI 完整断卦'}
            </button>
          </div>
        )}
        {busy && !text && (
          <div className="py-2 space-y-2">
            <p className="text-xs text-[#a79cc8]">
              助教正在通盘推演，先思考再作答（已用时 {elapsed} 秒；推理模型长文生成约需 1-2 分钟，属正常，请稍候）…
            </p>
            {reasoning && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#9a86c8]/20 bg-[#120e1a] px-3 py-2">
                <p className="text-[10px] text-[#8f86a8] mb-1 tracking-wider">思考过程（实时）</p>
                <p className="text-[11px] leading-relaxed text-[#8f86a8] whitespace-pre-wrap">{reasoning}</p>
              </div>
            )}
          </div>
        )}
        {text && (
          <div className="text-xs leading-relaxed text-[#ddd6ea]">
            <Md text={text} />
            {busy && <span className="inline-block w-1.5 h-3.5 bg-[#9a86c8] animate-pulse ml-0.5 align-middle" />}
          </div>
        )}
        {error && (
          <div className="text-[11px] text-red-300 bg-red-400/10 border border-red-400/25 rounded px-2 py-1.5 whitespace-pre-wrap">
            {error}
            {/API Key|401|未提供/.test(error) && (
              <button onClick={openTutorSettings} className="block mt-1 text-[#d4b578] underline underline-offset-2">
                去右上角「设置」配置助教模型 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
