import { useMemo, useState } from 'react';
import { paipan } from './lib/liuyao/engine';
import type { YaoValue } from './lib/liuyao/engine';
import { computeGanZhi } from './lib/liuyao/calendar';
import { interpret } from './lib/liuyao/interpret';
import { LESSON_EXAMPLES } from './lib/liuyao/teaching';
import { InputPanel } from './components/liuyao/InputPanel';
import { PaiPanBoard } from './components/liuyao/PaiPanBoard';
import { WorkflowSteps } from './components/liuyao/WorkflowSteps';
import { GeyueReference } from './components/liuyao/GeyueReference';
import { TutorPanel } from './components/liuyao/TutorChat';
import { buildGuaContext, buildSystemPrompt } from './lib/liuyao/tutorContext';
import { GraduationCap, X } from 'lucide-react';

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 当前小时 → 时辰序号（子=0…亥=11，与 InputPanel.SHICHEN 一致）
function currentShichen(): number {
  const h = new Date().getHours();
  return h === 23 ? 0 : Math.floor((h + 1) / 2) % 12;
}

export default function App() {
  const [yaos, setYaosRaw] = useState<YaoValue[]>([9, 8, 8, 9, 7, 6]); // 默认：卷三例卦 泽雷随之风地观
  const [date, setDate] = useState(todayLocal());
  const [shichen, setShichen] = useState(currentShichen());
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('caiyun');
  const [activeExample, setActiveExample] = useState('sui_zhiguan');
  const [tutorOpen, setTutorOpen] = useState(false);

  const setYaos = (v: YaoValue[]) => { setYaosRaw(v); setActiveExample(''); };

  const loadExample = (id: string) => {
    setActiveExample(id);
    const ex = LESSON_EXAMPLES.find((e) => e.id === id);
    if (ex) {
      setYaosRaw(ex.yaos as YaoValue[]);
      setCategory(ex.category);
    }
  };

  const result = useMemo(() => {
    try {
      // 时辰 → 代表小时：子=0、丑=2 … 亥=22（分钟不影响四柱）
      const hour = shichen === 0 ? 0 : shichen * 2;
      const d = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
      if (isNaN(d.getTime())) return null;
      const gz = computeGanZhi(d);
      const p = paipan(yaos, gz);
      const it = interpret(p, category);
      return { p, it };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [yaos, date, shichen, category]);

  const yaoNames = yaos.map((v) => {
    const m = { 7: '单（一背二字）少阳', 8: '拆（两背一字）少阴', 9: '重（三背）老阳·动', 6: '交（三字）老阴·动' } as const;
    return m[v];
  });

  return (
    <div className="min-h-screen bg-[#f3eedf] text-[#3d3428]" style={{ fontFamily: '"PingFang SC","Songti SC",serif' }}>
      {/* 顶栏 */}
      <header className="border-b border-[#d8cdb4] bg-[#faf6ea]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
              云笈六爻 · 教学研习工作流
            </h1>
            <p className="text-xs text-[#8a7f6a] mt-0.5">
              从摇卦到装卦到排盘到解读：九步推演步步讲透「怎么推、为何如此、出自何卷」，配课程原例卦库与必背歌诀
            </p>
          </div>
          <div className="hidden md:block text-right text-xs text-[#8a7f6a]">
            <div>京房纳甲体系 · 以钱代蓍</div>
            <div>教材：卷一易理 / 卷二卦理 / 卷三装卦 / 卷四用神</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* 左：输入 */}
        <aside className="lg:sticky lg:top-4 self-start bg-[#faf6ea] border border-[#d8cdb4] rounded-lg p-4">
          <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>一、起卦输入</h2>
          <InputPanel
            yaos={yaos} setYaos={setYaos}
            date={date} setDate={setDate}
            shichen={shichen} setShichen={setShichen}
            question={question} setQuestion={setQuestion}
            category={category} setCategory={setCategory}
            onLoadExample={loadExample} activeExample={activeExample}
          />
        </aside>

        {/* 右：排盘 + 教学工作流 + 歌诀 */}
        <div className="space-y-5 min-w-0">
          {result ? (
            <>
              <section className="bg-[#faf6ea] border border-[#d8cdb4] rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <h2 className="text-sm font-bold" style={{ fontFamily: '"Songti SC",serif' }}>
                    二、排盘 · {result.p.benGua.info.name}
                    {result.p.bianGua ? ` 之 ${result.p.bianGua.info.name}` : '（六爻安静）'}
                  </h2>
                  <div className="text-xs text-[#8a7f6a]">
                    {result.p.ganzhi.year}年 {result.p.ganzhi.month}月 {result.p.ganzhi.day}日 {result.p.ganzhi.hour}时 · {result.p.kong.join('')}空
                  </div>
                </div>
                {question.trim() && (
                  <div className="mb-3 text-xs text-[#6b5f4a] bg-[#fbf5e8] border border-[#e8ddc0] rounded px-3 py-1.5">
                    <b>所问：</b>{question.trim()}
                    <span className="text-[#9a8a68]">　·　类别：{result.it.category.label}（用神 {result.it.category.yongshen}爻）</span>
                  </div>
                )}
                <PaiPanBoard p={result.p} />
              </section>

              <section>
                <h2 className="text-sm font-bold mb-1" style={{ fontFamily: '"Songti SC",serif' }}>三、九步研习工作流</h2>
                <p className="text-[10px] text-[#9a8f78] mb-3">每步三块内容：「这一步怎么推/想」绿色教学框 · 「规则·歌诀」黄色原文框 · 「依据」课程出处</p>
                <WorkflowSteps p={result.p} it={result.it} yaoNames={yaoNames} question={question} />
              </section>

              <section>
                <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>四、必背歌诀速查（卷一/卷三/卷四）</h2>
                <GeyueReference />
              </section>

              {/* 全局助教 */}
              {tutorOpen ? (
                <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#b8c9e0]">
                  <div className="flex items-center justify-between bg-[#4a5d7e] text-white px-3 py-2">
                    <span className="text-xs font-bold flex items-center gap-1.5"><GraduationCap size={14} /> 六爻助教 · Kimi K3</span>
                    <button onClick={() => setTutorOpen(false)}><X size={15} /></button>
                  </div>
                  <TutorPanel
                    systemPrompt={buildSystemPrompt()}
                    guaContext={buildGuaContext(result.p, result.it, question)}
                    placeholder="就当前卦局或课程知识自由提问…"
                    height="h-80"
                  />
                </section>
              ) : (
                <button onClick={() => setTutorOpen(true)}
                  className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#4a5d7e] hover:bg-[#3a4d6e] text-white text-sm font-bold rounded-full px-4 py-2.5 shadow-lg">
                  <GraduationCap size={16} /> 问助教
                </button>
              )}

              <footer className="text-[10px] text-[#9a8f78] leading-relaxed border-t border-[#d8cdb4] pt-3 pb-6">
                说明：本工具排盘规则（纳甲、世应、六亲、六神、旬空、月破日破暗动、化进化退、伏神、卦身）与断卦总纲均出自《云笈书院六爻卷》课程；
                节气换月采用通用近似公式（误差±1天），交节当日请自行核对月建。六爻断事明阴阳、示吉凶，反映事物发展趋势，具体抉择还需结合现实条件（卷三·第三课：六爻有条件性、模糊性、阶段性）。
              </footer>
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              输入有误，无法排盘，请检查摇卦时间与六爻输入。
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
