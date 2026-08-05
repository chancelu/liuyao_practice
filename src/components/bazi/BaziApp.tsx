// 八字教学页：排盘 + 六步教学流程 + 典籍依据 + AI 助教
import { useMemo, useState } from 'react';
import { paipanBazi, ELEMENTS, CANGGAN } from '../../lib/bazi/engine';
import type { BaZiChart } from '../../lib/bazi/engine';
import { SHENG, KE } from '../../lib/liuyao/constants';
import type { Element5 } from '../../lib/liuyao/constants';
import { buildBaziContext, buildBaziSystemPrompt, buildBaziReadingPrompt, BAZI_BOOKS } from '../../lib/bazi/tutorContext';
import { StepAsk, TutorPanel, AiVerdict } from '../liuyao/TutorChat';
import { SHICHEN } from '../liuyao/InputPanel';
import { ChevronDown, ChevronRight, GraduationCap, X, BookOpen, ScrollText } from 'lucide-react';

const ELEM_COLOR: Record<Element5, string> = { 木: '#2e7d32', 火: '#c62828', 土: '#b8860b', 金: '#8a8a8a', 水: '#1565c0' };

const SHISHEN_MEANING: Record<string, string> = {
  比肩: '同我者·同性：兄弟朋友、自立、竞争', 劫财: '同我者·异性：合作分财、破耗、魄力',
  食神: '我生者·同性：才华口福、温和表达', 伤官: '我生者·异性：聪明锋芒、艺术、傲气',
  偏财: '我克者·同性：流动之财、父亲、人缘', 正财: '我克者·异性：正当收入、妻子（男命）、勤俭',
  七杀: '克我者·同性：压力权威、胆识、小人', 正官: '克我者·异性：官职名誉、丈夫（女命）、自律',
  偏印: '生我者·同性：偏门学问、直觉、孤独', 正印: '生我者·异性：学业庇护、母亲、贵人',
};

function Teach({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 mb-3">
      <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 mb-1"><BookOpen size={12} /> {title}</div>
      <div className="text-xs leading-relaxed text-[#33503f] space-y-1.5">{children}</div>
    </div>
  );
}

function Basis({ text }: { text: string }) {
  return (
    <div className="rounded border border-[#e8ddc0] bg-[#fbf5e8] px-3 py-1.5 text-[11px] leading-relaxed text-[#7a6a48]">
      <ScrollText size={11} className="inline mr-1 -mt-0.5" /><b>依据：</b>{text}
    </div>
  );
}

interface StepDef { no: number; title: string; subtitle: string }
const STEPS: StepDef[] = [
  { no: 1, title: '排四柱', subtitle: '年月日时 · 五虎遁五鼠遁' },
  { no: 2, title: '定日主与十神', subtitle: '以日干为我 · 论六亲心性' },
  { no: 3, title: '五行旺衰', subtitle: '得令得地得势 · 判身强身弱' },
  { no: 4, title: '取用神', subtitle: '旺衰 · 格局 · 调候 · 病药' },
  { no: 5, title: '排大运', subtitle: '阳男阴女顺 · 三天折一年' },
  { no: 6, title: '综合论命', subtitle: 'AI 完整解读 · 给小白的话' },
];

function StepCard({ step, open, onToggle, ask, children }: {
  step: StepDef; open: boolean; onToggle: () => void; ask: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#faf6ea] border border-[#d8cdb4] rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f5efe0]">
        <span className="w-6 h-6 rounded-full bg-[#7a5c2e] text-white text-xs font-bold flex items-center justify-center shrink-0">{step.no}</span>
        <span className="flex-1 min-w-0">
          <span className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{step.title}</span>
          <span className="text-[11px] text-[#9a8f78] ml-2">{step.subtitle}</span>
        </span>
        {open ? <ChevronDown size={16} className="text-[#9a8f78]" /> : <ChevronRight size={16} className="text-[#9a8f78]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#e8ddc0] pt-3">
          {children}
          {ask}
        </div>
      )}
    </div>
  );
}

export function BaziApp() {
  const [date, setDate] = useState('2000-01-01');
  const [shichen, setShichen] = useState(6); // 午时
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [focus, setFocus] = useState('');
  const [openSteps, setOpenSteps] = useState<number[]>([1, 3, 4, 6]);
  const [tutorOpen, setTutorOpen] = useState(false);

  const chart: BaZiChart | null = useMemo(() => {
    try {
      const hour = shichen === 0 ? 0 : shichen * 2;
      const d = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
      if (isNaN(d.getTime())) return null;
      return paipanBazi(d, gender);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [date, shichen, gender]);

  const toggle = (n: number) => setOpenSteps((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const isOpen = (n: number) => openSteps.includes(n);

  if (!chart) {
    return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">出生时间有误，无法排盘。</div>;
  }

  const ctx = buildBaziContext(chart, focus);
  const askFor = (n: number) => (
    <StepAsk stepNo={n} stepTitle={STEPS[n - 1].title} systemPrompt={buildBaziSystemPrompt(n)} guaContext={ctx} />
  );

  // 喜忌提示（教学简化）：身强喜克泄耗，身弱喜生扶
  const dm = chart.dayMasterElement;
  const strong = chart.strengthLabel === '身强' || chart.strengthLabel === '中和偏强';
  const shengMe = (Object.keys(SHENG) as Element5[]).find((e) => SHENG[e] === dm)!;
  const keMe = (Object.keys(KE) as Element5[]).find((e) => KE[e] === dm)!;
  const xiYong = strong ? [KE[dm], keMe, SHENG[dm]] : [shengMe, dm];
  const xiYongLabel = strong ? '财、官杀、食伤（克泄耗）' : '印枭、比劫（生扶）';

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* 左：输入 */}
        <aside className="bg-[#faf6ea] border border-[#d8cdb4] rounded-lg p-4 lg:h-full lg:overflow-y-auto">
          <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>一、生辰输入</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">性别（定乾造/坤造与大运顺逆）</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([['male', '男 · 乾造'], ['female', '女 · 坤造']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setGender(v)}
                    className={`text-sm py-2 rounded-md border ${gender === v ? 'border-[#7a5c2e] bg-[#7a5c2e] text-white' : 'border-[#d8cdb4] bg-white text-[#6b6152] hover:border-[#7a5c2e]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">出生日期与时辰</label>
              <div className="flex gap-1.5">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="flex-1 min-w-0 border border-[#d8cdb4] rounded-md bg-white px-2 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#7a5c2e]" />
                <select value={shichen} onChange={(e) => setShichen(Number(e.target.value))}
                  className="w-[7.5rem] shrink-0 border border-[#d8cdb4] rounded-md bg-white px-2 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#7a5c2e]">
                  {SHICHEN.map((s, i) => <option key={s.branch} value={i}>{s.branch}时（{s.range}）</option>)}
                </select>
              </div>
              <p className="mt-1 text-[10px] text-[#9a8f78] leading-snug">
                四柱最小单位是时辰（两小时一柱），分钟不影响排盘；年份不明可只研学习得，日柱以公历推算。
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b5f4a] mb-1.5">想了解的方面（选填，AI 解读会侧重）</label>
              <input value={focus} onChange={(e) => setFocus(e.target.value)}
                placeholder="如：事业方向 / 财运 / 婚姻感情 / 学业"
                className="w-full border border-[#d8cdb4] rounded-md bg-white px-3 py-2 text-sm text-[#3d3428] focus:outline-none focus:border-[#7a5c2e]" />
            </div>
          </div>
        </aside>

        {/* 右：命盘 + 教学流程 */}
        <div className="space-y-5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
          {/* 命盘表 */}
          <section className="bg-[#faf6ea] border border-[#d8cdb4] rounded-lg p-4">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-bold" style={{ fontFamily: '"Songti SC",serif' }}>
                二、命盘 · {chart.genderLabel} · 日主 {chart.dayMaster}{chart.dayMasterElement}（{chart.strengthLabel}）
              </h2>
              <div className="text-xs text-[#8a7f6a]">{chart.kong.join('')}空 · 大运{chart.dayunDir} · 约 {chart.qiyunAge} 岁起运</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ fontFamily: '"Songti SC",serif' }}>
                <thead>
                  <tr className="text-xs text-[#8a7f6a]">
                    <th className="text-left py-1 w-16"></th>
                    {chart.pillars.map((p) => <th key={p.name} className="py-1">{p.name}</th>)}
                  </tr>
                </thead>
                <tbody className="text-center">
                  <tr className="text-xs text-[#6b5f4a]">
                    <td className="text-left py-1">十神</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.shiShen}</td>)}
                  </tr>
                  <tr className="text-xl font-bold">
                    <td className="text-left text-xs text-[#6b5f4a] py-1">天干</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1" style={{ color: ELEM_COLOR[p.stemElement] }}>{p.stem}</td>
                    ))}
                  </tr>
                  <tr className="text-xl font-bold">
                    <td className="text-left text-xs text-[#6b5f4a] py-1">地支</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1" style={{ color: ELEM_COLOR[p.branchElement] }}>
                        {p.branch}{p.kong && <span className="text-[10px] text-red-600 align-top"> 空</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="text-xs text-[#6b5f4a]">
                    <td className="text-left py-1">藏干</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1">{p.canggan.map((x) => `${x.stem}${x.shiShen}`).join(' ')}</td>
                    ))}
                  </tr>
                  <tr className="text-xs text-[#8a7f6a]">
                    <td className="text-left py-1">纳音</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.nayin}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            {/* 五行力量条 */}
            <div className="mt-3 space-y-1">
              {ELEMENTS.map((e) => (
                <div key={e} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-bold" style={{ color: ELEM_COLOR[e] }}>{e}</span>
                  <div className="flex-1 h-2.5 bg-[#efe8d5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(chart.wuxingCount[e] / chart.totalPower) * 100}%`, background: ELEM_COLOR[e] }} />
                  </div>
                  <span className="w-6 text-right text-[#8a7f6a]">{chart.wuxingCount[e]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 教学流程 */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold" style={{ fontFamily: '"Songti SC",serif' }}>三、六步研习工作流</h2>

            {/* 第 1 步：排四柱 */}
            <StepCard step={STEPS[0]} open={isOpen(1)} onToggle={() => toggle(1)} ask={askFor(1)}>
              <Teach title="四柱是怎么排出来的？">
                <p>① <b>年柱</b>：以<b>立春</b>为岁首（不是春节！），{(Number(date.slice(0, 4)))}年立春后属「{chart.ganzhi.year}」年。</p>
                <p>② <b>月柱</b>：以<b>节气</b>换月，当前为「{chart.ganzhi.jieqi}」节后，月建{chart.ganzhi.monthBranch}；月干按《五虎遁》由年干「{chart.ganzhi.year[0]}」起正月顺推，得月柱「{chart.ganzhi.month}」。</p>
                <p>③ <b>日柱</b>：六十甲子逐日循环不中断，只能查万年历或用锚点推算，今日柱「{chart.ganzhi.day}」。</p>
                <p>④ <b>时柱</b>：{SHICHEN[shichen].branch}时（{SHICHEN[shichen].range}），时干按《五鼠遁》由日干「{chart.dayMaster}」起子时顺推，得时柱「{chart.ganzhi.hour}」。</p>
              </Teach>
              <Basis text="《千里命稿·排八字篇》与《四柱预测学》排盘章：年以立春换、月以节气换、日以六十甲子循环、时以十二时辰配五鼠遁。" />
            </StepCard>

            {/* 第 2 步：定日主与十神 */}
            <StepCard step={STEPS[1]} open={isOpen(2)} onToggle={() => toggle(2)} ask={askFor(2)}>
              <Teach title="十神是怎么定的？">
                <p>以日干「{chart.dayMaster}{dm}」为<b>我</b>（日主/命主），其余干支按五行生克与阴阳同异配十神：</p>
                <p><b>同我</b>者比肩/劫财，<b>我生</b>者食神/伤官，<b>我克</b>者偏财/正财，<b>克我</b>者七杀/正官，<b>生我</b>者偏印/正印；阴阳同性为偏（比/食/偏财/杀/枭），异性为正（劫/伤/正财/官/印）。</p>
                <p>地支还要看<b>藏干</b>：如「{chart.pillars[3].branch}」中藏 {CANGGAN[chart.pillars[3].branch].join('、')}，各有十神，代表人事的隐藏层面。</p>
              </Teach>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-3">
                {Object.entries(SHISHEN_MEANING).map(([k, v]) => (
                  <div key={k} className="text-[11px] border border-[#e8dfc8] rounded px-2 py-1.5 bg-[#fdfaf3]"><b>{k}</b>：{v}</div>
                ))}
              </div>
              <Basis text="《渊海子平》：以日干为主，论十神六亲——正印为母、偏财为父、男命正财为妻、女命正官为夫、食伤为子女、比劫为兄弟。" />
            </StepCard>

            {/* 第 3 步：五行旺衰 */}
            <StepCard step={STEPS[2]} open={isOpen(3)} onToggle={() => toggle(3)} ask={askFor(3)}>
              <Teach title="这步怎么判？">
                {chart.strengthNotes.map((n, i) => <p key={i}>{['①', '②', '③'][i]} {n}</p>)}
                <p>判旺衰三字诀：<b>得令</b>（月支是否扶我，权重最大）、<b>得地</b>（地支有无根气通根）、<b>得势</b>（天干比劫印枭多寡）。本盘为教学简化计分，细论需看通根透干。</p>
              </Teach>
              <Basis text="《滴天髓》：「能知衰旺之真机，其于三命之奥，思过半矣」——旺衰是子平法的第一功夫；《子平真诠》：月令者，命中之枢纽。" />
            </StepCard>

            {/* 第 4 步：取用神 */}
            <StepCard step={STEPS[3]} open={isOpen(4)} onToggle={() => toggle(4)} ask={askFor(4)}>
              <Teach title="用神有哪几种取法？">
                <p>① <b>旺衰派</b>（《滴天髓》）：强者抑之、弱者扶之。本盘「{chart.strengthLabel}」，喜 <b>{xiYong.join('、')}</b> 之五行（{xiYongLabel}）。</p>
                <p>② <b>格局派</b>（《子平真诠》）：以月令透干取格（正官格、财格、食神格……），成格需相神辅佐，败格需救应。</p>
                <p>③ <b>调候派</b>（《穷通宝鉴》）：先看寒暖燥湿——夏生需水润、冬生需火暖，调候为先，不论格局旺衰。</p>
                <p>④ <b>病药说</b>（《神峰通考》）：「有病方为贵」——找出命局之「病」（过旺或过弱之神），以能治病的五行为「药」。</p>
                <p className="text-[#8a6a4a]">四派各有侧重，实战常互相参看。可用下方「问助教」让 AI 结合本盘具体分析喜用。</p>
              </Teach>
              <Basis text="《子平真诠·论用神》：「八字用神，专求月令」；《穷通宝鉴》十天干逐月调候宜忌；《神峰通考·病药说》。" />
            </StepCard>

            {/* 第 5 步：排大运 */}
            <StepCard step={STEPS[4]} open={isOpen(5)} onToggle={() => toggle(5)} ask={askFor(5)}>
              <Teach title="大运怎么排？">
                <p>① <b>定顺逆</b>：阳年生男、阴年生女<b>顺行</b>；阴年生男、阳年生女<b>逆行</b>。本造年干「{chart.ganzhi.year[0]}」（{['甲','丙','戊','庚','壬'].includes(chart.ganzhi.year[0]) ? '阳' : '阴'}）· {chart.gender === 'male' ? '男' : '女'}命 → <b>{chart.dayunDir}</b>。</p>
                <p>② <b>起运数</b>：{chart.qiyunNote}。</p>
                <p>③ <b>排运</b>：自月柱「{chart.ganzhi.month}」{chart.dayunDir === '顺行' ? '顺数' : '逆数'}六十甲子，每运管十年。</p>
              </Teach>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
                {chart.dayun.map((d) => (
                  <div key={d.gz} className="border border-[#e8dfc8] rounded px-2 py-1.5 bg-[#fdfaf3] text-center">
                    <div className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{d.gz} <span className="text-[10px] font-normal text-[#8a7f6a]">{d.shiShen}</span></div>
                    <div className="text-[10px] text-[#8a7f6a]">{d.startAge}–{d.startAge + 9} 岁（约 {d.startYear} 年起）</div>
                  </div>
                ))}
              </div>
              <Basis text="《千里命稿·起运篇》：阳男阴女顺行、阴男阳女逆行，三日折一年起运；《三命通会》论大运「命好不如运好」，命为车、运为路。" />
            </StepCard>

            {/* 第 6 步：综合论命 */}
            <StepCard step={STEPS[5]} open={isOpen(6)} onToggle={() => toggle(6)} ask={askFor(6)}>
              <AiVerdict
                systemPrompt={buildBaziReadingPrompt()}
                guaContext={ctx}
                title="AI 完整命理解读 · Kimi K3（旺衰 / 格局 / 大运 / 建议）"
                intro="前面五步是排盘与规则的逐项推演。点击下方按钮，Kimi K3 会以八部典籍为依据，把整个命盘串成小白能懂的完整解读：性格天赋、格局用神、大运走势、建议趋避。"
                buttonText="生成 AI 命理解读"
                askText="请基于以上命盘数据，结合我想了解的方面，做完整命理解读。"
              />
              <Basis text="AI 解读依据：《四柱预测学》《千里命稿》《渊海子平》《子平真诠》《滴天髓》《穷通宝鉴》《三命通会》《神峰通考》八部典籍的论命体系（模型按典籍方法解读，原文未内置）。" />
            </StepCard>
          </section>

          {/* 典籍速查 */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>四、八字典籍速查（解读依据）</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {BAZI_BOOKS.map((b) => (
                <div key={b.name} className="border border-[#e8dfc8] rounded px-3 py-2 bg-[#fdfaf3]">
                  <div className="text-xs font-bold text-[#6b5f4a]">{b.name} <span className="font-normal text-[#9a8f78]">{b.author}</span></div>
                  <div className="text-[11px] text-[#7a6a48] mt-0.5 leading-snug">{b.use}</div>
                </div>
              ))}
            </div>
          </section>

          <footer className="text-[10px] text-[#9a8f78] leading-relaxed border-t border-[#d8cdb4] pt-3 pb-6">
            说明：本模块排盘规则（立春换年、节气换月、五虎遁五鼠遁、十神、藏干、纳音、旬空、大运顺逆与起运）均出自子平法传统体系；
            五行旺衰为教学简化计分，细论需看通根透干。八字是传统术数的趋势参考，命好不如运好，运好不如心态好，具体人生抉择以现实努力与专业意见为准。
          </footer>

          {/* 全局助教 */}
          {tutorOpen ? (
            <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#b8c9e0]">
              <div className="flex items-center justify-between bg-[#4a5d7e] text-white px-3 py-2">
                <span className="text-xs font-bold flex items-center gap-1.5"><GraduationCap size={14} /> 八字助教 · Kimi K3</span>
                <button onClick={() => setTutorOpen(false)}><X size={15} /></button>
              </div>
              <TutorPanel
                systemPrompt={buildBaziSystemPrompt()}
                guaContext={ctx}
                placeholder="就当前命盘或典籍知识自由提问…"
                height="h-80"
              />
            </section>
          ) : (
            <button onClick={() => setTutorOpen(true)}
              className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#4a5d7e] hover:bg-[#3a4d6e] text-white text-sm font-bold rounded-full px-4 py-2.5 shadow-lg">
              <GraduationCap size={16} /> 问助教
            </button>
          )}
        </div>
      </main>
    </>
  );
}
