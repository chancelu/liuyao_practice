// Kimi 助教客户端：流式问答（通过本地 dev 服务器代理 /api/tutor）
// API Key 由使用者手动填入，仅存浏览器 localStorage，随请求头发给本地代理，不落任何文件
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircleQuestion, X, KeyRound, Trash2 } from 'lucide-react';

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

/** 调用助教（流式）。systemPrompt+guaContext 组成 system，history 为对话。 */
export async function askTutor(
  systemPrompt: string,
  guaContext: string,
  history: ChatMsg[],
  onDelta: (text: string) => void,
): Promise<string> {
  const apiKey = getTutorKey();
  if (!apiKey) throw new Error('请先在上方填入你的 Kimi API Key（只存在本机浏览器里，随用随填）');
  const messages: ChatMsg[] = [
    { role: 'system', content: systemPrompt + '\n\n以下是当前卦局数据：\n' + guaContext },
    ...history,
  ];
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-kimi-key': apiKey },
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
            Key 只保存在你本机浏览器的 localStorage，随请求头发给本地代理，不会写入任何文件或代码仓库。到 kimi.com 控制台可获取。
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
          <div key={i} className={`text-xs leading-relaxed rounded-lg px-3 py-2 whitespace-pre-wrap ${
            m.role === 'user' ? 'bg-[#dce8f8] text-[#2c3e57] ml-8' : 'bg-white border border-[#dbe4ef] text-[#33404f] mr-4'
          }`}>
            {m.content || (streaming && i === history.length - 1 ? '思考中…' : '')}
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
