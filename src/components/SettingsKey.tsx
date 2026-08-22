// 全局助教设置：右上角 ⚙ 入口，全站唯一的助教模型配置处
// 支持任意 OpenAI 兼容端点（端点 URL + API Key + Model ID）；配置只存本机 localStorage
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, KeyRound, Trash2, CheckCircle2, ShieldCheck, Globe, Cpu } from 'lucide-react';
import {
  getTutorConfig, setTutorConfig, probeServerKey,
  DEFAULT_ENDPOINT, DEFAULT_MODEL,
  type TutorConfig,
} from './liuyao/TutorChat';

const PRESETS: { name: string; endpoint: string; model: string; hint: string }[] = [
  { name: 'Kimi K3（默认）', endpoint: DEFAULT_ENDPOINT, model: DEFAULT_MODEL, hint: 'kimi.com 控制台获取 Key，支持视觉' },
  { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', hint: 'platform.deepseek.com 获取 Key' },
  { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', hint: 'platform.openai.com 获取 Key，gpt-4o 系支持视觉' },
  { name: '自定义', endpoint: '', model: '', hint: '任意 OpenAI 兼容端点' },
];

function maskKey(k: string): string {
  if (k.length <= 8) return '****';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function TutorSettings() {
  const [open, setOpen] = useState(false);
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<TutorConfig | null>(() => getTutorConfig());
  const [editing, setEditing] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

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

  const startEdit = (preset?: typeof PRESETS[number]) => {
    setEditing(true);
    if (preset) {
      setEndpoint(preset.endpoint);
      setModel(preset.model);
      // 编辑已有配置时保留已存 Key，避免重复填写
      if (!apiKey && saved && preset.endpoint === saved.endpoint) setApiKey(saved.apiKey);
    } else if (saved) {
      setEndpoint(saved.endpoint);
      setApiKey(saved.apiKey);
      setModel(saved.model);
    }
  };

  const save = () => {
    const ep = endpoint.trim();
    const key = apiKey.trim();
    const m = model.trim();
    if (!ep || !key || !m) return;
    if (!/^https:\/\/.+/.test(ep)) return;
    setTutorConfig({ endpoint: ep, apiKey: key, model: m });
    setSaved(getTutorConfig());
    setEditing(false);
    setEndpoint(''); setApiKey(''); setModel('');
    window.dispatchEvent(new CustomEvent('tutor-key-changed'));
  };
  const clear = () => {
    setTutorConfig(null);
    setSaved(null);
    setEditing(false);
    setEndpoint(''); setApiKey(''); setModel('');
    window.dispatchEvent(new CustomEvent('tutor-key-changed'));
  };

  const inputCls = 'w-full text-xs px-3 py-2 bg-[#0f0d09] border border-[#3a2f1e] rounded-lg focus:outline-none focus:border-[#c9a962] text-[#e8e1cd] placeholder:text-[#6b6353] transition-colors';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="助教模型设置"
        className="flex items-center justify-center w-9 h-9 rounded-full border border-[#c9a962]/35 text-[#c9a962] hover:bg-[#c9a962]/10 hover:border-[#c9a962]/60 transition-colors"
      >
        <Settings size={16} />
      </button>

      {/* 弹窗挂到 body，避免顶栏 backdrop-filter 形成包含块导致 fixed 定位失效、被页面内容压层 */}
      {open && createPortal(
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
                <Cpu size={16} className="text-[#c9a962]" />
                <span className="font-bold tracking-[0.2em] text-[#ecdfc0]" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
                  助教模型设置
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#8d8670] hover:text-[#c9a962] transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 站点默认模型状态 */}
              {serverKey === null ? (
                <p className="text-xs text-[#8d8670]">正在探测站点配置…</p>
              ) : serverKey ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-3">
                  <CheckCircle2 size={15} className="text-emerald-300 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed text-[#9fc3ae]">
                    <b className="text-emerald-300">站点默认模型已就绪</b>（Kimi K3 · 站长配置）—— 不配任何东西，全站「问助教」直接可用。
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-[#c9a962]/20 bg-[#c9a962]/5 px-3.5 py-3">
                  <KeyRound size={15} className="text-[#c9a962] mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed text-[#d4c294]">
                    本站未统一配置模型。使用助教前，请在下方配置一个你自己的模型（端点 URL + API Key + Model ID）。
                  </div>
                </div>
              )}

              {/* 自定义模型：已保存摘要 / 编辑表单 */}
              {saved && !editing ? (
                <div className="rounded-lg border border-[#3a2f1e] bg-[#1d1912] px-3.5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <ShieldCheck size={13} /> 本机已配置自定义模型{serverKey ? '（优先于站点默认）' : ''}
                    </span>
                    <span className="flex items-center gap-3">
                      <button onClick={() => startEdit()} className="text-[11px] text-[#c9a962] hover:underline underline-offset-2">更换</button>
                      <button onClick={clear} className="flex items-center gap-0.5 text-[11px] text-red-400 hover:underline underline-offset-2">
                        <Trash2 size={11} /> 清除
                      </button>
                    </span>
                  </div>
                  <div className="text-[11px] text-[#a89f8a] space-y-0.5">
                    <p className="flex items-center gap-1.5"><Globe size={11} className="shrink-0" /><span className="break-all">{saved.endpoint}</span></p>
                    <p className="flex items-center gap-1.5"><Cpu size={11} className="shrink-0" />{saved.model}</p>
                    <p className="flex items-center gap-1.5"><KeyRound size={11} className="shrink-0" />{maskKey(saved.apiKey)}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold text-[#c9a962] tracking-wider">自定义模型（可选，优先于站点默认）</p>
                  {/* 预设快捷按钮 */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => startEdit(p)}
                        title={p.hint}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          editing && endpoint === p.endpoint && p.endpoint
                            ? 'border-[#c9a962] text-[#ecdfc0] bg-[#c9a962]/15'
                            : 'border-[#3a2f1e] text-[#a89f8a] hover:border-[#c9a962]/50 hover:text-[#d4b578]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="端点 URL（https://…/chat/completions）" className={inputCls} />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API Key（sk-...）" className={inputCls} />
                  <div className="flex items-center gap-2">
                    <input value={model} onChange={(e) => setModel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
                      placeholder="Model ID（如 k3-256k / deepseek-chat）" className={inputCls} />
                    <button
                      onClick={save}
                      disabled={!endpoint.trim() || !apiKey.trim() || !model.trim() || !endpoint.trim().startsWith('https://')}
                      className="shrink-0 text-sm px-4 py-2 rounded-lg bg-gradient-to-b from-[#dcc084] to-[#b08d48] text-[#1a1408] font-bold disabled:opacity-30 hover:brightness-110 transition"
                    >
                      保存
                    </button>
                    {editing && saved && (
                      <button onClick={() => setEditing(false)} className="shrink-0 text-[11px] text-[#8d8670] hover:underline underline-offset-2">取消</button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-[#6b6353] leading-relaxed border-t border-[#3a2f1e]/60 pt-3">
                说明：配置只保存在你本机浏览器的 localStorage，随请求头发给本站服务器代理转发，不会写入任何文件或代码仓库；站点环境变量 Key 只会发给 Kimi 官方端点，绝不会转发给你配置的第三方端点。截图识别功能需要视觉模型（如 Kimi K3、gpt-4o 系）。
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
