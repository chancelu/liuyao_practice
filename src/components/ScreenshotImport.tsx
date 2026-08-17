// 截图识别导入：上传/粘贴截图 → 识别 → 人工核对弹窗 → 填入盘面
// 双引擎：在线·Kimi K3 视觉（默认，能读图形爻画/模糊图）｜ 离线·本机 OCR（Tesseract WASM，断网/无 Key 兜底，仅文字版式）
import { useRef, useState } from 'react';
import { preprocessImage, recognizeLiuyao, recognizeBazi } from '../lib/vision';
import { ocrImage, parseLiuyaoText, parseBaziText } from '../lib/ocr';
import type { LiuyaoOcr, BaziOcr } from '../lib/vision';
import { YAO_META } from '../lib/liuyao/engine';
import type { YaoValue } from '../lib/liuyao/engine';
import { STEMS, BRANCHES } from '../lib/liuyao/constants';
import { YaoStroke } from './liuyao/YaoStroke';
import { openTutorSettings } from './liuyao/TutorChat';
import { ImageUp, Loader2, X, AlertTriangle } from 'lucide-react';

const POS_SHORT = ['初', '二', '三', '四', '五', '上'];
const VALUES: YaoValue[] = [7, 8, 9, 6];
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'] as const;

type Engine = 'online' | 'offline';

interface Props {
  kind: 'liuyao' | 'bazi';
  onApplyLiuyao?: (r: { yaos: YaoValue[]; date?: string; time?: string }) => void;
  onApplyBazi?: (r: { pillars: [string, string, string, string]; gender?: 'male' | 'female' }) => void;
}

export function ScreenshotImport({ kind, onApplyLiuyao, onApplyBazi }: Props) {
  const [engine, setEngine] = useState<Engine>('online');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [imgUrl, setImgUrl] = useState(''); // 预处理后的图，供人工比对
  const [ly, setLy] = useState<LiuyaoOcr | null>(null);
  const [bz, setBz] = useState<BaziOcr | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | Blob | null>(null);

  const run = async (file: File | Blob, useEngine?: Engine) => {
    const eg = useEngine ?? engine;
    if (busy) return;
    lastFile.current = file;
    setBusy(true);
    setError('');
    setProgress('');
    setLy(null);
    setBz(null);
    try {
      const dataUrl = await preprocessImage(file);
      setImgUrl(dataUrl);
      if (eg === 'online') {
        if (kind === 'liuyao') setLy(await recognizeLiuyao(dataUrl));
        else setBz(await recognizeBazi(dataUrl));
      } else {
        const text = await ocrImage(dataUrl, (pct, stage) => setProgress(`${stage} ${pct}%`));
        if (kind === 'liuyao') setLy(parseLiuyaoText(text));
        else setBz(parseBaziText(text));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const close = () => { setLy(null); setBz(null); setImgUrl(''); setError(''); };

  const apply = () => {
    if (kind === 'liuyao' && ly) {
      onApplyLiuyao?.({ yaos: ly.yaos, date: ly.date, time: ly.time });
    } else if (kind === 'bazi' && bz) {
      onApplyBazi?.({ pillars: bz.pillars, gender: bz.gender });
    }
    close();
  };

  const result = kind === 'liuyao' ? ly : bz;
  const engineBtn = (v: Engine) =>
    `text-[10px] px-2 py-1 rounded border transition-colors ${engine === v
      ? 'border-[#c9a962] text-[#c9a962] bg-[#c9a962]/10'
      : 'border-[#3a2f1e] text-[#6f6a58] hover:border-[#c9a962]/50'}`;

  return (
    <div
      className="border border-dashed border-[#c9a962]/35 rounded-lg bg-[#17140f]/60 px-3 py-2.5 outline-none focus:border-[#c9a962]/70"
      tabIndex={0}
      onPaste={(e) => {
        const item = [...e.clipboardData.items].find((it) => it.type.startsWith('image/'));
        const f = item?.getAsFile();
        if (f) { e.preventDefault(); run(f); }
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ''; }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="btn-ghost text-xs px-3 py-1.5 !border-[#c9a962]/40 !text-[#c9a962]">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <ImageUp size={12} />}
          {busy ? (progress || (engine === 'online' ? '识别中（Kimi K3 视觉）…' : '加载离线引擎…')) : '截图识别导入'}
        </button>
        <div className="flex gap-1">
          <button onClick={() => setEngine('online')} disabled={busy} className={engineBtn('online')}>在线 · Kimi 视觉</button>
          <button onClick={() => setEngine('offline')} disabled={busy} className={engineBtn('offline')} title="断网/未配 Key 时用；仅识别文字版式，读不了图形爻画">离线 · 本机 OCR</button>
        </div>
        <span className="text-[10px] text-[#6f6a58] leading-snug">
          上传或在此框内 Ctrl+V 粘贴{kind === 'liuyao' ? '卦象' : '命盘'}截图，识别后核对确认才填入 · 图片已做放大增清处理
        </span>
      </div>

      {error && (
        <div className="mt-2 text-[11px] text-red-300 bg-red-400/10 border border-red-400/25 rounded px-2 py-1.5 whitespace-pre-wrap">
          {error}
          {/API Key|401|未提供/.test(error) && (
            <button onClick={openTutorSettings} className="block mt-1 text-[#d4b578] underline underline-offset-2">
              去右上角「设置」填入 Kimi Key →
            </button>
          )}
          {engine === 'online' && lastFile.current && (
            <button onClick={() => run(lastFile.current!, 'offline')}
              className="block mt-1 text-[#d4b578] underline underline-offset-2">
              在线识别失败 —— 改用「离线 · 本机 OCR」重试这张图 →
            </button>
          )}
          {engine === 'offline' && (
            <button onClick={() => { setEngine('online'); if (lastFile.current) run(lastFile.current, 'online'); }}
              className="block mt-1 text-[#d4b578] underline underline-offset-2">
              离线读不出 —— 改用「在线 · Kimi 视觉」重试这张图 →
            </button>
          )}
        </div>
      )}

      {/* 识别结果：人工核对 */}
      {result && (
        <div className="mt-2.5 border border-[#c9a962]/40 rounded-lg bg-[#0f0d09] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#c9a962] tracking-wider">识别结果 · 请核对后填入</span>
            <button onClick={close} className="text-[#8d8670] hover:text-[#c9a962]"><X size={14} /></button>
          </div>
          <div className="flex gap-3 items-start flex-wrap">
            {imgUrl && (
              <img src={imgUrl} alt="预处理后的截图"
                className="w-36 max-h-44 object-contain rounded border border-[#3a2f1e] bg-black/40 shrink-0" />
            )}
            <div className="flex-1 min-w-[220px] space-y-1.5">
              {kind === 'liuyao' && ly && (
                <>
                  {[5, 4, 3, 2, 1, 0].map((i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8d8670] w-6 shrink-0">{POS_SHORT[i]}</span>
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        {VALUES.map((v) => {
                          const meta = YAO_META[v];
                          const active = ly.yaos[i] === v;
                          return (
                            <button key={v}
                              onClick={() => setLy({ ...ly, yaos: ly.yaos.map((x, xi) => (xi === i ? v : x)) as YaoValue[] })}
                              className={`flex items-center justify-center gap-1 py-0.5 rounded border text-[10px] transition-colors ${
                                active ? 'border-[#d0604d] bg-[#d0604d] text-white' : 'border-[#3a2f1e] bg-[#131008] text-[#b0a78c] hover:border-[#d0604d]'
                              }`}>
                              <YaoStroke yang={meta.yang} moving={meta.moving} size="sm" />
                              {meta.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {(ly.date || ly.time) && (
                    <p className="text-[10px] text-[#8d8670]">同时识别到时间：{ly.date ?? ''} {ly.time ?? ''}（填入时一并覆盖摇卦时间）</p>
                  )}
                </>
              )}
              {kind === 'bazi' && bz && (
                <>
                  {PILLAR_LABELS.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8d8670] w-8 shrink-0">{label}</span>
                      <select value={bz.pillars[i][0] ?? ''}
                        onChange={(e) => {
                          const p = [...bz.pillars] as [string, string, string, string];
                          p[i] = e.target.value + p[i][1];
                          setBz({ ...bz, pillars: p });
                        }}
                        className="flex-1 border border-[#3a2f1e] rounded bg-[#131008] px-1.5 py-1 text-xs text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]">
                        {STEMS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={bz.pillars[i][1] ?? ''}
                        onChange={(e) => {
                          const p = [...bz.pillars] as [string, string, string, string];
                          p[i] = p[i][0] + e.target.value;
                          setBz({ ...bz, pillars: p });
                        }}
                        className="flex-1 border border-[#3a2f1e] rounded bg-[#131008] px-1.5 py-1 text-xs text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]">
                        {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <span className="text-xs font-bold w-9 text-[#c9a962]" style={{ fontFamily: '"Songti SC",serif' }}>{bz.pillars[i]}</span>
                    </div>
                  ))}
                  {bz.gender && (
                    <p className="text-[10px] text-[#8d8670]">识别到：{bz.gender === 'male' ? '乾造（男）' : '坤造（女）'}（填入时一并设置）</p>
                  )}
                  {bz.invalid.length > 0 && (
                    <p className="text-[10px] text-amber-300 flex items-center gap-1">
                      <AlertTriangle size={11} /> {bz.invalid.map((i) => PILLAR_LABELS[i]).join('、')} 不在六十甲子内，请手动改正
                    </p>
                  )}
                </>
              )}
              {result.note && <p className="text-[10px] text-[#6f6a58] leading-snug">识别备注：{result.note}</p>}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={apply}
              disabled={kind === 'bazi' && !!bz && bz.invalid.length > 0}
              className="btn-gold text-xs px-4 py-1.5 disabled:opacity-40">
              核对无误，填入盘面
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-xs px-3 py-1.5">换一张</button>
          </div>
        </div>
      )}
    </div>
  );
}
