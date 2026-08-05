// Kimi 助教客户端：流式问答（通过本地 dev 服务器代理 /api/tutor）
// API Key 由使用者手动填入，仅存浏览器 localStorage，随请求头发给本地代理，不落任何文件
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircleQuestion, X, KeyRound, Trash2, Sparkles, RefreshCw } from 'lucide-react';

export interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }

const KEY_STORAGE = 'kimi_tutor_api_key';

export function getTutorKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function setTutorKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}

// —— 轻量 Markdown 渲染（助教回复用）：**粗体**、`代码`、# 标题、【分节】、列表 ——
function mdInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <b key={i} className="text-[#2c3e57]">{p.slice(2, -2)}</b>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i} className="bg-[#eef2f8] px-1 rounded text-[#4a5d7e] text-[11px]">{p.slice(1, -1)}</code>;
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
        if (h) return <div key={i} className="font-bold text-[#2c3e57] mt-1.5">{mdInline(h[2])}</div>;
        if (/^【[^】]{2,12}】/.test(t)) {
          // 【标题】单独成行，或【标题】后接正文时标题加粗
          const m = t.match(/^【[^】]{2,12}】(.*)$/);
          return (
            <div key={i} className="mt-1.5">
              <span className="font-bold text-[#4a5d7e]">{t.match(/^【[^】]{2,12}】/)![0]}</span>
              {m?.[1] && <span>{mdInline(m[1])}</span>}
            </div>
          );
        }
        const li = t.match(/^([-*•]|\d+[.、])\s*(.*)$/);
        if (li) {
          return (
            <div key={i} className="pl-3.5 relative">
              <span className="absolute left-0 text-[#9aa7bd]">{li[1]}</span>
              <span>{mdInline(li[2])}</span>
            </div>
          );
        }
        return <div key={i}>{mdInline(raw)}</div>;
      })}
    </div>
  );
}

/** 调用助教（流式）。systemPrompt+guaContext 组成 system，history 为对话。 */
export async function askTutor(
  systemPrompt: string,
  guaContext: string,
  history: ChatMsg[],
  onDelta: (text: string) => void,
): Promise<string> {
  const apiKey = getTutorKey();
  const messages: ChatMsg[] = [
    { role: 'system', content: systemPrompt + '\n\n以下是当前卦局数据：\n' + guaContext },
    ...history,
  ];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-kimi-key'] = apiKey; // 不填则由服务器环境变量 KIMI_API_KEY 兜底
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: 'k3-256k', messages }),
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
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) { full += delta; onDelta(full); }
      } catch { /* 忽略半行 */ }
    }
  }
  return full;
}

/** 用 Kimi K3 把具体问题归类为测事类别（定用神）。返回 { categoryId, reason } */
export async function classifyQuestion(
  question: string,
  categories: { id: string; label: string; yongshen: string }[],
): Promise<{ categoryId: string; reason: string }> {
  const apiKey = getTutorKey();
  const list = categories.map((c) => `${c.id}｜${c.label}｜用神取${c.yongshen}爻`).join('\n');
  const prompt = [
    '你是六爻「定用神」助教，教材为《云笈书院六爻卷》卷四（用神卷）。',
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

  const classifyHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) classifyHeaders['x-kimi-key'] = apiKey;
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: classifyHeaders,
    body: JSON.stringify({ model: 'k3-256k', messages: [{ role: 'user', content: prompt }] }),
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

/** 单个提问面板（每步内嵌 / 全局共用） */
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

  const [hasKey, setHasKey] = useState(() => !!getTutorKey());
  const [keyInput, setKeyInput] = useState('');
  const [showKeyBox, setShowKeyBox] = useState(false);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    setTutorKey(k);
    setHasKey(true);
    setKeyInput('');
    setShowKeyBox(false);
  };
  const clearKey = () => {
    setTutorKey('');
    setHasKey(false);
  };

  const keyBar = (
    <div className="border-b border-[#dbe4ef] bg-white px-2 py-1.5">
      {hasKey && !showKeyBox ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-emerald-700">
            <KeyRound size={12} /> Kimi Key 已配置（仅存本机浏览器）
          </span>
          <span className="flex items-center gap-2">
            <button onClick={() => setShowKeyBox(true)} className="text-[11px] text-[#4a5d7e] hover:underline">更换</button>
            <button onClick={clearKey} className="flex items-center gap-0.5 text-[11px] text-red-600 hover:underline">
              <Trash2 size={11} /> 清除
            </button>
          </span>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5">
            <KeyRound size={12} className="text-[#4a5d7e] shrink-0" />
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveKey(); }}
              placeholder="填入 Kimi API Key（sk-...）"
              className="flex-1 text-xs px-2 py-1 border border-[#dbe4ef] rounded focus:outline-none focus:border-[#4a5d7e]"
            />
            <button onClick={saveKey} disabled={!keyInput.trim()}
              className="text-xs px-2 py-1 rounded bg-[#4a5d7e] text-white disabled:opacity-40 hover:bg-[#3a4d6e]">
              保存
            </button>
          </div>
          <p className="mt-1 text-[10px] text-[#8a97a8] leading-snug">
            Key 只保存在你本机浏览器的 localStorage，随请求头发给服务器代理，不会写入任何文件或代码仓库（到 kimi.com 控制台获取）。若站长已在服务器配置 KIMI_API_KEY，则无需填写，直接提问即可。
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="border border-[#b8c9e0] bg-[#f4f8fd] rounded-lg overflow-hidden">
      {keyBar}
      <div ref={scrollRef} className={`${height} overflow-y-auto px-3 py-2 space-y-2`}>
        {history.length === 0 && (
          <p className="text-[11px] text-[#7a8aa0] leading-relaxed">
            我是云笈书院六爻助教（Kimi K3 驱动），通读卷一~卷四教材，也知道你当前这盘卦的全部细节。有什么不懂直接问，例如：「为什么这爻是真空不是假空」「世爻为什么是三爻」「这卦求财怎么看」。
          </p>
        )}
        {history.map((m, i) => (
          <div key={i} className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
            m.role === 'user' ? 'bg-[#dce8f8] text-[#2c3e57] ml-8 whitespace-pre-wrap' : 'bg-white border border-[#dbe4ef] text-[#33404f] mr-4'
          }`}>
            {m.role === 'assistant'
              ? (m.content ? <Md text={m.content} /> : (streaming && i === history.length - 1 ? '思考中…' : ''))
              : m.content}
          </div>
        ))}
        {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 whitespace-pre-wrap">{error}</div>}
      </div>
      <div className="flex items-center gap-1.5 border-t border-[#dbe4ef] bg-white px-2 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }}
          placeholder={placeholder}
          className="flex-1 text-xs px-2 py-1.5 border border-[#dbe4ef] rounded focus:outline-none focus:border-[#4a5d7e]"
        />
        <button onClick={send} disabled={streaming || !input.trim()}
          className="p-1.5 rounded bg-[#4a5d7e] text-white disabled:opacity-40 hover:bg-[#3a4d6e]">
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
          className="flex items-center gap-1.5 text-xs text-[#4a5d7e] border border-[#b8c9e0] bg-[#f4f8fd] hover:bg-[#e8f0fb] rounded-full px-3 py-1.5">
          <MessageCircleQuestion size={13} /> 对此步有疑问？问助教
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#4a5d7e]">针对「{stepTitle}」提问</span>
            <button onClick={() => setOpen(false)} className="text-[#8a97a8] hover:text-[#4a5d7e]"><X size={14} /></button>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 卦局变化时清空旧断卦，避免张冠李戴
  const ctxKey = guaContext.slice(0, 200);
  const prevKey = useRef(ctxKey);
  useEffect(() => {
    if (prevKey.current !== ctxKey) {
      prevKey.current = ctxKey;
      setText('');
      setError('');
    }
  }, [ctxKey]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setText('');
    try {
      const ans = await askTutor(
        systemPrompt,
        guaContext,
        [{ role: 'user', content: askText ?? '请基于以上卦局数据，对我所问之事做完整综合断卦。' }],
        (partial) => setText(partial),
      );
      setText(ans || '（助教未返回内容）');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-lg border-2 border-[#7c5cd6] bg-gradient-to-br from-[#f7f3ff] to-[#fdfbf7] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#7c5cd6] text-white">
        <span className="text-xs font-bold flex items-center gap-1.5">
          <Sparkles size={13} /> {title ?? 'AI 完整断卦 · Kimi K3（结论 / 应期 / 决策 / 化解）'}
        </span>
        {text && !busy && (
          <button onClick={run} className="flex items-center gap-1 text-[11px] bg-white/15 hover:bg-white/25 rounded px-2 py-0.5">
            <RefreshCw size={11} /> 重新断
          </button>
        )}
      </div>
      <div className="px-3 py-2.5">
        {!text && !busy && !error && (
          <div className="text-center py-2">
            <p className="text-[11px] text-[#7a6a92] mb-2 leading-relaxed">
              {intro ?? '上面是规则引擎按教材条文的逐项判定。点击下方按钮，Kimi K3 会把整盘卦串起来，用大白话讲：所问之事结果如何、什么时候应验、该怎么决策、如何趋避化解。'}
            </p>
            <button onClick={run}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg bg-[#7c5cd6] text-white hover:bg-[#6a4cc0] shadow">
              <Sparkles size={15} /> {buttonText ?? '生成 AI 完整断卦'}
            </button>
          </div>
        )}
        {busy && !text && <p className="text-xs text-[#7a6a92] py-2">助教正在通盘推演，先思考再作答，约需十几秒…</p>}
        {text && (
          <div className="text-xs leading-relaxed text-[#3d3352]">
            <Md text={text} />
            {busy && <span className="inline-block w-1.5 h-3.5 bg-[#7c5cd6] animate-pulse ml-0.5 align-middle" />}
          </div>
        )}
        {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 whitespace-pre-wrap">{error}</div>}
      </div>
    </div>
  );
}
