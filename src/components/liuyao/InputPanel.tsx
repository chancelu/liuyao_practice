// 输入面板：卦例库 + 具体问题（AI 定用神）+ 摇卦日期时辰 + 六爻录入
import { useState } from 'react';
import { YAO_META } from '../../lib/liuyao/engine';
import type { YaoValue } from '../../lib/liuyao/engine';
import { QUESTION_CATEGORIES } from '../../lib/liuyao/interpret';
import { LESSON_EXAMPLES } from '../../lib/liuyao/teaching';
import { YaoStroke } from './YaoStroke';
import { classifyQuestion } from './TutorChat';
import { Dices, RotateCcw, LibraryBig, Sparkles, Loader2 } from 'lucide-react';

const POS = ['初爻（第1掷）', '二爻（第2掷）', '三爻（第3掷）', '四爻（第4掷）', '五爻（第5掷）', '上爻（第6掷）'];
const VALUES: YaoValue[] = [7, 8, 9, 6];

// 十二时辰：四柱最小时间单位（卷一·干支历法），分钟不影响排盘
export const SHICHEN = [
  { branch: '子', range: '23:00–01:00' }, { branch: '丑', range: '01:00–03:00' },
  { branch: '寅', range: '03:00–05:00' }, { branch: '卯', range: '05:00–07:00' },
  { branch: '辰', range: '07:00–09:00' }, { branch: '巳', range: '09:00–11:00' },
  { branch: '午', range: '11:00–13:00' }, { branch: '未', range: '13:00–15:00' },
  { branch: '申', range: '15:00–17:00' }, { branch: '酉', range: '17:00–19:00' },
  { branch: '戌', range: '19:00–21:00' }, { branch: '亥', range: '21:00–23:00' },
];

export function InputPanel({
  yaos, setYaos,
  date, setDate, shichen, setShichen,
  question, setQuestion,
  category, setCategory,
  onLoadExample, activeExample,
}: {
  yaos: YaoValue[];
  setYaos: (v: YaoValue[]) => void;
  date: string;
  setDate: (s: string) => void;
  shichen: number;
  setShichen: (n: number) => void;
  question: string;
  setQuestion: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  onLoadExample: (id: string) => void;
  activeExample: string;
}) {
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

  return (
    <div className="space-y-4">
      {/* 教学卦例库 */}
      <div>
        <label className="flex items-center gap-1 text-xs font-semibold text-[#6b5f4a] mb-1.5">
          <LibraryBig size={12} /> 教学卦例库（课程原例·典型格局）
        </label>
        <select
          value={activeExample}
          onChange={(e) => onLoadExample(e.target.value)}
          className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
          style={{ fontFamily: '"Songti SC",serif' }}
        >
          <option value="">— 自选卦象（手动录入/摇卦）—</option>
          {LESSON_EXAMPLES.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        {current && (
          <div className="mt-1.5 text-[10px] leading-relaxed text-[#7a6a48] bg-[#fbf5e8] border border-[#e8ddc0] rounded px-2 py-1.5">
            <b>学习要点：</b>{current.point}
            <div className="text-[#9a8a68] mt-0.5">出处：{current.source}</div>
          </div>
        )}
      </div>

      {/* 所问何事（AI 定用神） */}
      <div>
        <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">所问何事（具体问题）</label>
        <textarea
          value={question}
          onChange={(e) => { setQuestion(e.target.value); setClassifyMsg(null); }}
          rows={2}
          placeholder="如：下个月那场面试能通过吗？/ 借出去的钱年底能要回来吗？"
          className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e] resize-none"
        />
        <button
          onClick={aiClassify}
          disabled={classifying || !question.trim()}
          className="mt-1.5 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#4a5d7e] text-white disabled:opacity-40 hover:bg-[#3a4d6e]"
        >
          {classifying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          AI 定用神（Kimi K3 归类）
        </button>
        {classifyMsg && (
          <div className={`mt-1.5 text-[10px] leading-relaxed rounded px-2 py-1.5 border ${
            classifyMsg.ok
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}>
            {classifyMsg.text}
          </div>
        )}
        <div className="mt-2">
          <label className="block text-[10px] text-[#8a7f6a] mb-1">测事类别（可手动校正）</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setClassifyMsg(null); }}
            className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-1.5 text-xs text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
          >
            {QUESTION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {currentCategory && (
            <p className="mt-1 text-[10px] text-[#9a8f78] leading-snug">
              用神取 <b>{currentCategory.yongshen}爻</b>：{currentCategory.basis}
            </p>
          )}
        </div>
      </div>

      {/* 摇卦时间：日期 + 时辰 */}
      <div>
        <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">摇卦时间（定月建日辰时柱）</label>
        <div className="flex gap-1.5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 min-w-0 border border-[#d8cdb4] rounded-md bg-white px-2 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
          />
          <select
            value={shichen}
            onChange={(e) => setShichen(Number(e.target.value))}
            className="w-[7.5rem] shrink-0 border border-[#d8cdb4] rounded-md bg-white px-2 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
          >
            {SHICHEN.map((s, i) => (
              <option key={s.branch} value={i}>{s.branch}时（{s.range}）</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-[10px] text-[#9a8f78] leading-snug">
          四柱最小单位是时辰（两小时一柱），分钟不影响排盘——这正是「定时定局」只精确到时辰的原因（卷一·干支历法）。
        </p>
      </div>

      {/* 六爻录入 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[#6b5f4a]">六爻卦象（自初爻向上录入）</label>
          <div className="flex gap-1">
            <button onClick={randomCast} title="模拟摇卦"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#d8cdb4] text-[#8a6d3b] hover:bg-[#f5ecd7]">
              <Dices size={12} /> 摇卦
            </button>
            <button onClick={() => setYaos([7, 7, 7, 7, 7, 7])} title="重置"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#d8cdb4] text-[#8a6d3b] hover:bg-[#f5ecd7]">
              <RotateCcw size={12} /> 重置
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          {[...yaos].map((_, ri) => {
            const i = 5 - ri; // 上爻在上显示
            return (
              <div key={i} className="flex items-center gap-2 border border-[#e8dfc8] rounded-md px-2 py-1.5 bg-[#fdfaf3]">
                <span className="text-xs text-[#8a7f6a] w-20 shrink-0">{POS[i]}</span>
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
                            ? 'border-[#b03a2e] bg-[#b03a2e] text-white'
                            : 'border-[#d8cdb4] bg-white text-[#6b6152] hover:border-[#b03a2e]'
                        }`}
                      >
                        <span className={active ? 'text-white' : 'text-[#3d3428]'}>
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
        <p className="mt-1.5 text-[10px] text-[#9a8f78]">
          单＝一背二字（少阳·静）；拆＝两背一字（少阴·静）；重＝三背（老阳·动 O）；交＝三字（老阴·动 X）
        </p>
      </div>
    </div>
  );
}
