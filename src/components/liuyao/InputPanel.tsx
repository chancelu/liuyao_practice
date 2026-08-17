// 输入面板：双 Tab——「选卦起盘」（卦例库 + 自选六十四卦 + 动爻）/「手动录入」（自初爻向上逐爻直排）
// 共享：具体问题（AI 定用神）+ 摇卦时间（真太阳时校正）
import { useState } from 'react';
import { YAO_META } from '../../lib/liuyao/engine';
import type { YaoValue } from '../../lib/liuyao/engine';
import { QUESTION_CATEGORIES } from '../../lib/liuyao/interpret';
import { LESSON_EXAMPLES } from '../../lib/liuyao/teaching';
import { TRIGRAM_BITS, BITS_TRIGRAM, TRIGRAM_NATURE } from '../../lib/liuyao/constants';
import { HEXAGRAMS_64 } from '../../data/hexagrams64';
import { YaoStroke } from './YaoStroke';
import { classifyQuestion } from './TutorChat';
import { SolarTimeInput, type PlaceSel } from '../geo/SolarTimeInput';
import { ScreenshotImport } from '../ScreenshotImport';
import { Dices, RotateCcw, LibraryBig, Sparkles, Loader2 } from 'lucide-react';

const POS = ['初爻（第1掷）', '二爻（第2掷）', '三爻（第3掷）', '四爻（第4掷）', '五爻（第5掷）', '上爻（第6掷）'];
const POS_SHORT = ['初', '二', '三', '四', '五', '上'];
const VALUES: YaoValue[] = [7, 8, 9, 6];
const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export function InputPanel({
  yaos, setYaos,
  date, setDate, time, setTime, place, setPlace,
  question, setQuestion,
  category, setCategory,
  onLoadExample, activeExample,
}: {
  yaos: YaoValue[];
  setYaos: (v: YaoValue[]) => void;
  date: string;
  setDate: (s: string) => void;
  time: string;
  setTime: (s: string) => void;
  place: PlaceSel | null; // null = 不填，按北京时间
  setPlace: (p: PlaceSel | null) => void;
  question: string;
  setQuestion: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  onLoadExample: (id: string) => void;
  activeExample: string;
}) {
  const [mode, setMode] = useState<'pick' | 'manual'>('pick');
  const [classifying, setClassifying] = useState(false);
  const [classifyMsg, setClassifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const randomCast = () => {
    const next: YaoValue[] = yaos.map(() => {
      let bei = 0;
      for (let i = 0; i < 3; i++) if (Math.random() < 0.5) bei++;
      return ([8, 7, 9, 6] as YaoValue[])[bei]; // 0背=交6 1背=单7 2背=拆8 3背=重9
    });
    setYaos(next);
  };

  // —— 选卦模式：从当前 yaos 派生上下卦与动爻（无本地状态，永远同步） ——
  const bits = yaos.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const lowerTrig = BITS_TRIGRAM[bits.slice(0, 3).join('')] ?? '乾';
  const upperTrig = BITS_TRIGRAM[bits.slice(3, 6).join('')] ?? '乾';
  const movingSet = yaos.map((v) => v === 6 || v === 9);
  const pickedGua = HEXAGRAMS_64.find((h) => h.lower === lowerTrig && h.upper === upperTrig);

  const applyPick = (newUpper: string, newLower: string, moving: boolean[]) => {
    const nb = [...TRIGRAM_BITS[newLower], ...TRIGRAM_BITS[newUpper]];
    setYaos(nb.map((b, i) => (moving[i] ? (b ? 9 : 6) : (b ? 7 : 8))) as YaoValue[]);
  };

  const aiClassify = async () => {
    const q = question.trim();
    if (!q || classifying) return;
    setClassifying(true);
    setClassifyMsg(null);
    try {
      const r = await classifyQuestion(q, QUESTION_CATEGORIES);
      setCategory(r.categoryId);
      setClassifyMsg({ ok: true, text: `AI 归类：${QUESTION_CATEGORIES.find((c) => c.id === r.categoryId)?.label}。${r.reason}` });
    } catch (e) {
      setClassifyMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setClassifying(false);
    }
  };

  const current = LESSON_EXAMPLES.find((e) => e.id === activeExample);
  const currentCategory = QUESTION_CATEGORIES.find((c) => c.id === category);

  const tabCls = (v: string) =>
    `text-sm py-2 rounded-lg border transition-colors ${mode === v ? 'border-[#c9a962] bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] font-bold' : 'border-[#3a2f1e] bg-[#131008] text-[#b0a78c] hover:border-[#c9a962]/60'}`;

  return (
    <div className="space-y-4">
      {/* 输入方式双 Tab */}
      <div>
        <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">起卦方式</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setMode('pick')} className={tabCls('pick')}>选卦起盘</button>
          <button onClick={() => setMode('manual')} className={tabCls('manual')}>手动录入</button>
        </div>
      </div>

      {/* 截图识别导入（Kimi K3 视觉） */}
      <ScreenshotImport
        kind="liuyao"
        onApplyLiuyao={({ yaos: y, date: d, time: t }) => {
          setYaos(y);
          if (d) setDate(d);
          if (t) setTime(t);
        }}
      />

      {mode === 'pick' ? (
        <>
          {/* 教学卦例库 */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-[#c8bd9c] mb-1.5">
              <LibraryBig size={12} /> 教学卦例库（课程原例·典型格局）
            </label>
            <select
              value={activeExample}
              onChange={(e) => onLoadExample(e.target.value)}
              className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60"
              style={{ fontFamily: '"Songti SC",serif' }}
            >
              <option value="">— 不使用卦例（自选卦象）—</option>
              {LESSON_EXAMPLES.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            {current && (
              <div className="mt-1.5 text-[10px] leading-relaxed text-[#a89f86] bg-[#201a12] border border-[#32281a] rounded px-2 py-1.5">
                <b>学习要点：</b>{current.point}
                <div className="text-[#7d7663] mt-0.5">出处：{current.source}</div>
              </div>
            )}
          </div>

          {/* 自选六十四卦 */}
          <div>
            <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">自选卦象（上卦 / 下卦组合，共 64 卦）</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={upperTrig} onChange={(e) => applyPick(e.target.value, lowerTrig, movingSet)}
                className="border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60">
                {TRIGRAMS.map((t) => <option key={t} value={t}>上卦 {t}（{TRIGRAM_NATURE[t]}）</option>)}
              </select>
              <select value={lowerTrig} onChange={(e) => applyPick(upperTrig, e.target.value, movingSet)}
                className="border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60">
                {TRIGRAMS.map((t) => <option key={t} value={t}>下卦 {t}（{TRIGRAM_NATURE[t]}）</option>)}
              </select>
            </div>
            <div className="mt-1.5 flex items-center justify-between border border-[#32281a] rounded-md bg-[#1d1912] px-3 py-1.5">
              <span className="text-sm font-bold text-[#c9a962]" style={{ fontFamily: '"Songti SC",serif' }}>{pickedGua?.name ?? `${upperTrig}${lowerTrig}`}</span>
              <span className="text-[10px] text-[#7d7663]">{pickedGua?.slogan}</span>
            </div>
            {/* 动爻选择 */}
            <div className="mt-2">
              <label className="block text-[10px] text-[#8d8670] mb-1">动爻（可多选，不选则六爻安静）</label>
              <div className="grid grid-cols-6 gap-1">
                {POS_SHORT.map((n, i) => (
                  <button key={n}
                    onClick={() => { const m = [...movingSet]; m[i] = !m[i]; applyPick(upperTrig, lowerTrig, m); }}
                    className={`py-1.5 rounded border text-[11px] transition-colors ${movingSet[i] ? 'border-[#d0604d] bg-[#d0604d] text-white font-bold' : 'border-[#3a2f1e] bg-[#131008] text-[#b0a78c] hover:border-[#d0604d]'}`}>
                    {n}{movingSet[i] ? '动' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 六爻录入（直排：自初爻向上） */
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#c8bd9c]">六爻卦象（自初爻向上录入）</label>
            <div className="flex gap-1">
              <button onClick={randomCast} title="模拟摇卦"
                className="btn-ghost text-xs px-2.5 py-1">
                <Dices size={12} /> 摇卦
              </button>
              <button onClick={() => setYaos([7, 7, 7, 7, 7, 7])} title="重置"
                className="btn-ghost text-xs px-2.5 py-1">
                <RotateCcw size={12} /> 重置
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {[...yaos].map((_, ri) => {
              const i = 5 - ri; // 上爻在上显示
              return (
                <div key={i} className="flex items-center gap-2 border border-[#32281a] rounded-md px-2 py-1.5 bg-[#1d1912]">
                  <span className="text-xs text-[#8d8670] w-20 shrink-0">{POS[i]}</span>
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {VALUES.map((v) => {
                      const meta = YAO_META[v];
                      const active = yaos[i] === v;
                      return (
                        <button
                          key={v}
                          onClick={() => {
                            const next = [...yaos] as YaoValue[];
                            next[i] = v;
                            setYaos(next);
                          }}
                          className={`flex flex-col items-center py-1 rounded border text-[10px] leading-tight transition-colors ${
                            active
                              ? 'border-[#d0604d] bg-[#d0604d] text-white'
                              : 'border-[#3a2f1e] bg-[#131008] text-[#b0a78c] hover:border-[#d0604d]'
                          }`}
                        >
                          <span className={active ? 'text-white' : 'text-[#e8e1cd]'}>
                            <YaoStroke yang={meta.yang} moving={meta.moving} size="sm" />
                          </span>
                          <span className="mt-0.5">{meta.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-[#6f6a58]">
            单＝一背二字（少阳·静）；拆＝两背一字（少阴·静）；重＝三背（老阳·动 O）；交＝三字（老阴·动 X）
          </p>
        </div>
      )}

      {/* 所问何事（AI 定用神） */}
      <div>
        <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">所问何事（具体问题）</label>
        <textarea
          value={question}
          onChange={(e) => { setQuestion(e.target.value); setClassifyMsg(null); }}
          rows={2}
          placeholder="如：下个月那场面试能通过吗？/ 借出去的钱年底能要回来吗？"
          className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60 resize-none"
        />
        <button
          onClick={aiClassify}
          disabled={classifying || !question.trim()}
          className="mt-1.5 btn-gold text-xs px-3.5 py-1.5"
        >
          {classifying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          AI 定用神（Kimi K3 归类）
        </button>
        {classifyMsg && (
          <div className={`mt-1.5 text-[10px] leading-relaxed rounded px-2 py-1.5 border ${
            classifyMsg.ok
              ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25'
              : 'text-red-300 bg-red-400/10 border-red-400/25'
          }`}>
            {classifyMsg.text}
          </div>
        )}
        <div className="mt-2">
          <label className="block text-[10px] text-[#8d8670] mb-1">测事类别（可手动校正）</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setClassifyMsg(null); }}
            className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-1.5 text-xs text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60"
          >
            {QUESTION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {currentCategory && (
            <p className="mt-1 text-[10px] text-[#6f6a58] leading-snug">
              用神取 <b>{currentCategory.yongshen}爻</b>：{currentCategory.basis}
            </p>
          )}
        </div>
      </div>

      {/* 摇卦时间与地点（地点选填，不填按北京时间） */}
      <div>
        <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">摇卦时间与地点（定月建日辰时柱）</label>
        <SolarTimeInput
          date={date} setDate={setDate} time={time} setTime={setTime}
          place={place} setPlace={setPlace}
          optional
          placeLabel="摇卦地点（选填，校正真太阳时）"
        />
      </div>
    </div>
  );
}
