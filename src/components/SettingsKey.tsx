// 全局助教设置：右上角 ⚙ 入口，全站唯一的 Kimi Key 填写处
// 站长已在服务器配置 KIMI_API_KEY 时，只显示「已就绪」，不再出现任何填 Key 输入框
import { useEffect, useState } from 'react';
import { Settings, X, KeyRound, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getTutorKey, setTutorKey, probeServerKey } from './liuyao/TutorChat';

export function TutorSettings() {
  const [open, setOpen] = useState(false);
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  const [localKey, setLocalKey] = useState(() => !!getTutorKey());
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-tutor-settings', onOpen);
    return () => window.removeEventListener('open-tutor-settings', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    probeServerKey().then((sv) => { if (alive) setServerKey(sv); });
    return () => { alive = false; };
  }, [open]);

  const save = () => {
    const k = input.trim();
    if (!k) return;
    setTutorKey(k);
    setLocalKey(true);
    setInput('');
    setShowInput(false);
    window.dispatchEvent(new CustomEvent('tutor-key-changed'));
  };
  const clear = () => {
    setTutorKey('');
    setLocalKey(false);
    window.dispatchEvent(new CustomEvent('tutor-key-changed'));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="助教设置（Kimi Key）"
        className="flex items-center justify-center w-9 h-9 rounded-full border border-[#c9a962]/35 text-[#c9a962] hover:bg-[#c9a962]/10 hover:border-[#c9a962]/60 transition-colors"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#c9a962]/25 bg-[#14110c] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c9a962]/15">
              <div className="flex items-center gap-2.5">
                <KeyRound size={16} className="text-[#c9a962]" />
                <span className="font-bold tracking-[0.2em] text-[#ecdfc0]" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
                  助教设置
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#8d8670] hover:text-[#c9a962] transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 状态区 */}
              {serverKey === null ? (
                <p className="text-xs text-[#8d8670]">正在探测站点配置…</p>
              ) : serverKey ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-3">
                  <CheckCircle2 size={15} className="text-emerald-300 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed text-[#9fc3ae]">
                    <b className="text-emerald-300">助教已就绪</b> —— 站长已在服务器统一配置 Kimi Key，全站所有「问助教」直接可用，无需任何填写。
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-[#c9a962]/20 bg-[#c9a962]/5 px-3.5 py-3">
                  <KeyRound size={15} className="text-[#c9a962] mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed text-[#d4c294]">
                    本站未统一配置 Kimi Key。使用助教前，请在下方填入你自己的 Key（到 <span className="text-[#c9a962]">kimi.com</span> 控制台获取）。
                  </div>
                </div>
              )}

              {/* 本机 Key 状态 */}
              {localKey && !showInput ? (
                <div className="flex items-center justify-between rounded-lg border border-[#3a2f1e] bg-[#1d1912] px-3.5 py-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <ShieldCheck size={13} /> 本机已保存个人 Key{serverKey ? '（优先于站点配置使用）' : ''}
                  </span>
                  <span className="flex items-center gap-3">
                    <button onClick={() => setShowInput(true)} className="text-[11px] text-[#c9a962] hover:underline underline-offset-2">更换</button>
                    <button onClick={clear} className="flex items-center gap-0.5 text-[11px] text-red-400 hover:underline underline-offset-2">
                      <Trash2 size={11} /> 清除
                    </button>
                  </span>
                </div>
              ) : (!serverKey || showInput) ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
                      placeholder="Kimi API Key（sk-...）"
                      className="flex-1 text-sm px-3 py-2 bg-[#0f0d09] border border-[#3a2f1e] rounded-lg focus:outline-none focus:border-[#c9a962] text-[#e8e1cd] placeholder:text-[#6b6353] transition-colors"
                    />
                    <button
                      onClick={save}
                      disabled={!input.trim()}
                      className="text-sm px-4 py-2 rounded-lg bg-gradient-to-b from-[#dcc084] to-[#b08d48] text-[#1a1408] font-bold disabled:opacity-30 hover:brightness-110 transition"
                    >
                      保存
                    </button>
                    {showInput && (
                      <button onClick={() => setShowInput(false)} className="text-[11px] text-[#8d8670] hover:underline underline-offset-2 shrink-0">取消</button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 站长已配 Key 且本机未填时，给一个低调的「使用自己的 Key」入口 */}
              {serverKey && !localKey && !showInput && (
                <button onClick={() => setShowInput(true)} className="text-[11px] text-[#8d8670] hover:text-[#c9a962] transition-colors">
                  高级：改用自己的 Kimi Key →
                </button>
              )}

              <p className="text-[10px] text-[#6b6353] leading-relaxed border-t border-[#3a2f1e]/60 pt-3">
                安全说明：Key 只保存在你本机浏览器的 localStorage，随请求头发给本站服务器代理转发给 Kimi，不会写入任何文件或代码仓库。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
