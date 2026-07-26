// 输入面板：卦例库 + 测事类别 + 摇卦时间 + 六爻录入
import { YAO_META } from '../../lib/liuyao/engine';
import type { YaoValue } from '../../lib/liuyao/engine';
import { QUESTION_CATEGORIES } from '../../lib/liuyao/interpret';
import { LESSON_EXAMPLES } from '../../lib/liuyao/teaching';
import { YaoStroke } from './YaoStroke';
import { Dices, RotateCcw, LibraryBig } from 'lucide-react';

const POS = ['初爻（第1掷）', '二爻（第2掷）', '三爻（第3掷）', '四爻（第4掷）', '五爻（第5掷）', '上爻（第6掷）'];
const VALUES: YaoValue[] = [7, 8, 9, 6];

export function InputPanel({
  yaos, setYaos, datetime, setDatetime, category, setCategory, onLoadExample, activeExample,
}: {
  yaos: YaoValue[];
  setYaos: (v: YaoValue[]) => void;
  datetime: string;
  setDatetime: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  onLoadExample: (id: string) => void;
  activeExample: string;
}) {
  const randomCast = () => {
    const next: YaoValue[] = yaos.map(() => {
      let bei = 0;
      for (let i = 0; i < 3; i++) if (Math.random() < 0.5) bei++;
      return ([8, 7, 9, 6] as YaoValue[])[bei]; // 0背=交6 1背=单7 2背=拆8 3背=重9
    });
    setYaos(next);
  };

  const current = LESSON_EXAMPLES.find((e) => e.id === activeExample);

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

      {/* 测事类别 */}
      <div>
        <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">测事类别（定用神）</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
          style={{ fontFamily: '"Songti SC",serif' }}
        >
          {QUESTION_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* 摇卦时间 */}
      <div>
        <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">摇卦时间（定月建日辰）</label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#b03a2e]"
        />
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
