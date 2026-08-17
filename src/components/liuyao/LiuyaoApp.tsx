// 六爻教学页：起卦输入 + 排盘 + 九步研习 + 歌诀速查 + AI 助教
import { useMemo, useState } from 'react';
import { paipan } from '../../lib/liuyao/engine';
import type { YaoValue } from '../../lib/liuyao/engine';
import { computeGanZhi } from '../../lib/liuyao/calendar';
import { interpret } from '../../lib/liuyao/interpret';
import { LESSON_EXAMPLES } from '../../lib/liuyao/teaching';
import { InputPanel } from './InputPanel';
import { PaiPanBoard } from './PaiPanBoard';
import { WorkflowSteps } from './WorkflowSteps';
import { GeyueReference } from './GeyueReference';
import { TutorPanel } from './TutorChat';
import { buildGuaContext, buildSystemPrompt } from '../../lib/liuyao/tutorContext';
import { cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf } from '../../lib/geo/solarTime';
import type { PlaceSel } from '../geo/SolarTimeInput';
import { Notebook } from '../Notebook';
import type { NoteRecord, LiuyaoPayload } from '../../lib/notebook';
import { GraduationCap, X } from 'lucide-react';

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LiuyaoApp() {
  const [yaos, setYaosRaw] = useState<YaoValue[]>([9, 8, 8, 9, 7, 6]); // 默认：卷三例卦 泽雷随之风地观
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTime());
  const [place, setPlace] = useState<PlaceSel | null>(null); // 摇卦地点选填：null=按北京时间
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
      const d = dateTimeOf(date, time);
      if (!d) return null;
      // 真太阳时校正：填了摇卦地点才做经度修正 + 均时差，否则直接按北京时间
      const corrected = place ? solarCorrection(d, cityAt(place.prov, place.city).lng).corrected : d;
      const gz = computeGanZhi(corrected);
      const p = paipan(yaos, gz);
      const it = interpret(p, category);
      return { p, it };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [yaos, date, time, place, category]);

  const yaoNames = yaos.map((v) => {
    const m = { 7: '单（一背二字）少阳', 8: '拆（两背一字）少阴', 9: '重（三背）老阳·动', 6: '交（三字）老阴·动' } as const;
    return m[v];
  });

  // 复盘本：存当前卦 / 载回历史卦
  const makeNoteDraft = () =>
    result
      ? {
          type: 'liuyao' as const,
          title: question.trim() || `${result.p.benGua.info.name}${result.p.bianGua ? ` 之 ${result.p.bianGua.info.name}` : ''}`,
          summary: `${result.p.ganzhi.month}月${result.p.ganzhi.day}日 · ${result.p.benGua.info.name}${result.p.bianGua ? ` 之 ${result.p.bianGua.info.name}` : '（六爻安静）'} · 用神${result.it.category.yongshen}爻 · 断为「${result.it.verdict}」`,
          payload: { yaos, date, time, place, question, category } as LiuyaoPayload,
        }
      : null;

  const loadNote = (n: NoteRecord) => {
    if (n.type !== 'liuyao') return;
    const p = n.payload as LiuyaoPayload;
    setYaosRaw(p.yaos);
    setActiveExample('');
    setDate(p.date);
    setTime(p.time);
    setPlace(p.place);
    setQuestion(p.question);
    setCategory(p.category);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden w-full">
      {/* 左：输入（独立滚动） */}
      <aside className="panel p-4 lg:h-full lg:overflow-y-auto">
        <div className="section-head"><span className="num text-base">壹</span><span className="title">起卦输入</span></div>
        <InputPanel
          yaos={yaos} setYaos={setYaos}
          date={date} setDate={setDate}
          time={time} setTime={setTime}
          place={place} setPlace={setPlace}
          question={question} setQuestion={setQuestion}
          category={category} setCategory={setCategory}
          onLoadExample={loadExample} activeExample={activeExample}
        />
      </aside>

      {/* 右：排盘 + 教学工作流 + 歌诀（独立滚动） */}
      <div className="space-y-5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        {result ? (
          <>
            <section className="panel p-4">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <div className="section-head !mb-0">
                  <span className="num text-base">贰</span>
                  <span className="title">排盘 · {result.p.benGua.info.name}
                  {result.p.bianGua ? ` 之 ${result.p.bianGua.info.name}` : '（六爻安静）'}</span>
                </div>
                <div className="text-xs text-[#8d8670]">
                  {result.p.ganzhi.year}年 {result.p.ganzhi.month}月 {result.p.ganzhi.day}日 {result.p.ganzhi.hour}时 · {result.p.kong.join('')}空
                </div>
              </div>
              {question.trim() && (
                <div className="mb-3 text-xs text-[#c8bd9c] bg-[#201a12] border border-[#32281a] rounded px-3 py-1.5">
                  <b>所问：</b>{question.trim()}
                  <span className="text-[#7d7663]">　·　类别：{result.it.category.label}（用神 {result.it.category.yongshen}爻）</span>
                </div>
              )}
              <PaiPanBoard p={result.p} />
            </section>

            <section>
              <div className="section-head !mb-1"><span className="num text-base">叁</span><span className="title">九步研习工作流</span></div>
              <p className="text-[10px] text-[#6f6a58] mb-3">每步三块内容：「这一步怎么推/想」绿色教学框 · 「经典区」典籍原文+白话解读 · 「实战区」派别用法与课程外补充</p>
              <WorkflowSteps p={result.p} it={result.it} yaoNames={yaoNames} question={question} />
            </section>

            <section>
              <div className="section-head"><span className="num text-base">肆</span><span className="title">必背歌诀速查（卷一 / 卷三 / 卷四）</span></div>
              <GeyueReference />
            </section>

            <section className="panel p-4">
              <div className="section-head"><span className="num text-base">伍</span><span className="title">复盘本 · 应验追踪</span></div>
              <Notebook type="liuyao" makeCurrent={makeNoteDraft} onLoad={loadNote} />
            </section>

            <footer className="text-[10px] text-[#6f6a58] leading-relaxed border-t border-[#3a2f1e] pt-3 pb-6">
              说明：本工具排盘规则（纳甲、世应、六亲、六神、旬空、月破日破暗动、化进化退、伏神、卦身）与断卦总纲均出自六爻课程（卷一~卷四）教材；
              节气换月采用通用近似公式（误差±1天），交节当日请自行核对月建。六爻断事明阴阳、示吉凶，反映事物发展趋势，具体抉择还需结合现实条件（卷三·第三课：六爻有条件性、模糊性、阶段性）。
            </footer>

            {/* 全局助教 */}
            {tutorOpen ? (
              <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#c9a962]/30">
                <div className="flex items-center justify-between bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] px-3.5 py-2.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 tracking-wider"><GraduationCap size={14} /> 六爻助教 · Kimi K3</span>
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
                className="fixed bottom-4 right-4 z-50 btn-gold px-5 py-2.5 text-sm tracking-wider">
                <GraduationCap size={16} /> 问助教
              </button>
            )}
          </>
        ) : (
          <div className="bg-red-400/10 border border-red-400/25 text-red-700 rounded-lg p-4 text-sm">
            输入有误，无法排盘，请检查摇卦时间与六爻输入。
          </div>
        )}
      </div>
    </main>
  );
}
