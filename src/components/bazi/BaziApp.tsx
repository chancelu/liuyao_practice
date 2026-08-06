// 八字教学页：排盘 + 十三步教学流程 + 领域速查 + 互洽清单 + 歌诀 + AI 助教
import { useMemo, useState } from 'react';
import { paipanBazi, ELEMENTS, STEM_NATURE } from '../../lib/bazi/engine';
import type { BaZiChart, RelationItem } from '../../lib/bazi/engine';
import { analyzeYongshen, analyzeDayun, analyzeLiunian, analyzeLiuyue } from '../../lib/bazi/forecast';
import type { Element5 } from '../../lib/liuyao/constants';
import { buildBaziContext, buildBaziSystemPrompt, buildBaziReadingPrompt, BAZI_BOOKS } from '../../lib/bazi/tutorContext';
import { StepAsk, TutorPanel, AiVerdict } from '../liuyao/TutorChat';
import { SolarTimeInput, type PlaceSel } from '../geo/SolarTimeInput';
import { DEFAULT_PLACE, cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf } from '../../lib/geo/solarTime';
import { ChevronDown, ChevronRight, GraduationCap, X, BookOpen, ScrollText } from 'lucide-react';

const ELEM_COLOR: Record<Element5, string> = { 木: '#6fbf73', 火: '#e57373', 土: '#d4a24e', 金: '#c9c9c9', 水: '#64b5f6' };

const SHISHEN_MEANING: Record<string, string> = {
  比肩: '同我者·同性：兄弟朋友、自立、竞争', 劫财: '同我者·异性：合作分财、破耗、魄力',
  食神: '我生者·同性：才华口福、温和表达', 伤官: '我生者·异性：聪明锋芒、艺术、傲气',
  偏财: '我克者·同性：流动之财、父亲、人缘', 正财: '我克者·异性：正当收入、妻子（男命）、勤俭',
  七杀: '克我者·同性：压力权威、胆识、小人', 正官: '克我者·异性：官职名誉、丈夫（女命）、自律',
  偏印: '生我者·同性：偏门学问、直觉、孤独', 正印: '生我者·异性：学业庇护、母亲、贵人',
};

/** 宫位含义（教学简版） */
const GONG_WEI = [
  ['年柱', '祖辈 · 早年（1-15岁）', '看原生家庭与少年境遇'],
  ['月柱', '父母 · 职场（16-30岁）', '看父母缘、青年运程、事业平台'],
  ['日支', '内心 · 配偶（夫妻宫）', '看内心世界与婚姻状态'],
  ['时柱', '子女 · 晚年（48岁后）', '看子女缘、下属、晚景归宿'],
] as const;

/** 领域速查表 */
const DOMAIN_TABLE = [
  ['事业', '格局类型 + 用神五行 + 官杀状态', '格局定行业类型，用神定方位行业，官杀运定升迁期'],
  ['财运', '财星强弱/透藏/空亡 + 求财结构', '食伤生财=技艺变现；财空=待运填实；身旺财弱=财运年发力'],
  ['婚姻', '男看财/女看官 + 日支夫妻宫 + 合冲', '夫妻宫逢合逢冲之年=婚恋应期；伏吟=矛盾反复'],
  ['健康', '五行偏枯处 + 刑冲部位', '过旺过弱的五行对应脏腑；刑冲年应验'],
  ['六亲', '宫位 + 对应十神（印=母/偏财=父/官杀=子女）', '十神旺衰透藏看缘分深浅'],
  ['学业才华', '印星 + 食伤 + 文昌华盖', '印=吸收力，食伤=输出力'],
] as const;

/** 互洽检查清单 */
const CROSS_CHECK = [
  '用神结论与格局结论是否互洽？（扶抑与格局两派推出同一味药才稳）',
  '十神读出的性格与神煞读出的细节是否一致？',
  '大运走势图与十神宫位（如杀在时柱=晚成）是否互证？',
  '用过去流年反推验证（应期机制是否对得上已发生的事）',
];

/** 背诵歌诀 */
const VERSE = [
  '定盘：年看立春月看节，时辰要校真太阳',
  '强弱：得令得地又得势，根重干浮看地支',
  '用神：先扶抑后调候，通关顺势做补充',
  '格局：月令透干来定格，相神配合定成败',
  '读人：十神落宫加生克，干透支藏内外分',
  '机关：合冲刑害查一遍，紧贴力大遥力轻',
  '神煞：只润色不定性，组合有根才显灵',
  '大运：干支分看各五年，喜忌定调合冲找点',
  '流年：原局为库岁为引，逢冲逢合即应期',
];

function Teach({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 mb-3">
      <div className="flex items-center gap-1 text-xs font-bold text-emerald-300 mb-1"><BookOpen size={12} /> {title}</div>
      <div className="text-xs leading-relaxed text-[#9fc3ae] space-y-1.5">{children}</div>
    </div>
  );
}

function Basis({ text }: { text: string }) {
  return (
    <div className="rounded border border-[#283050] bg-[#1d2440] px-3 py-1.5 text-[11px] leading-relaxed text-[#a89f86]">
      <ScrollText size={11} className="inline mr-1 -mt-0.5" /><b>依据：</b>{text}
    </div>
  );
}

interface StepDef { no: number; title: string; subtitle: string }
const STEPS: StepDef[] = [
  { no: 1, title: '日主定性', subtitle: '十天干性情 · 天赋底色' },
  { no: 2, title: '月令环境', subtitle: '季节寒暖 · 调候伏笔' },
  { no: 3, title: '强弱判断', subtitle: '得令50 · 得地30 · 得势20' },
  { no: 4, title: '取用神', subtitle: '扶抑 → 调候 → 通关 → 顺势' },
  { no: 5, title: '用神质检', subtitle: '局里有吗 · 有根吗 · 受伤吗' },
  { no: 6, title: '定格局', subtitle: '月令透干取格 · 相神成败' },
  { no: 7, title: '十神读人', subtitle: '十神 × 宫位 · 内外分看' },
  { no: 8, title: '刑冲合害', subtitle: '机关引线 · 紧贴力大' },
  { no: 9, title: '神煞标注', subtitle: '应象润色 · 不定吉凶' },
  { no: 10, title: '排大运', subtitle: '阳男阴女顺 · 三天折一年' },
  { no: 11, title: '大运分析', subtitle: '喜忌定调 · 合冲找引爆点' },
  { no: 12, title: '流年应期', subtitle: '逢值冲动合动 · 填实凑齐' },
  { no: 13, title: '流月细化', subtitle: '应期到月' },
  { no: 14, title: '综合论命', subtitle: 'AI 完整解读 · 过去与未来' },
];

function StepCard({ step, open, onToggle, ask, children }: {
  step: StepDef; open: boolean; onToggle: () => void; ask: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#151b31] border border-[#2e375c] rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#252c4e]">
        <span className="w-6 h-6 rounded-full bg-[#b08a44] text-white text-xs font-bold flex items-center justify-center shrink-0">{step.no}</span>
        <span className="flex-1 min-w-0">
          <span className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{step.title}</span>
          <span className="text-[11px] text-[#6f6a58] ml-2">{step.subtitle}</span>
        </span>
        {open ? <ChevronDown size={16} className="text-[#6f6a58]" /> : <ChevronRight size={16} className="text-[#6f6a58]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#283050] pt-3">
          {children}
          {ask}
        </div>
      )}
    </div>
  );
}

const TONE_CLS = { 吉: 'bg-emerald-400/15 text-emerald-300', 忌: 'bg-red-400/15 text-red-300', 平: 'bg-[#242b49] text-[#b0a78c]' } as const;
const SEASON_OF: Record<string, string> = { 寅: '春', 卯: '春', 辰: '春末', 巳: '夏', 午: '夏', 未: '夏末', 申: '秋', 酉: '秋', 戌: '秋末', 亥: '冬', 子: '冬', 丑: '冬末' };

export function BaziApp() {
  const [date, setDate] = useState('2000-01-01');
  const [time, setTime] = useState('12:00'); // 钟表时间（北京时间）
  const [place, setPlace] = useState<PlaceSel>(DEFAULT_PLACE);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [focus, setFocus] = useState('');
  const [openSteps, setOpenSteps] = useState<number[]>([1, 3, 4, 14]);
  const [tutorOpen, setTutorOpen] = useState(false);
  const nowYear = new Date().getFullYear();

  const chart: BaZiChart | null = useMemo(() => {
    try {
      const d = dateTimeOf(date, time);
      if (!d) return null;
      // 真太阳时校正：出生地经度修正 + 均时差
      const corrected = solarCorrection(d, cityAt(place.prov, place.city).lng).corrected;
      return paipanBazi(corrected, gender);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [date, time, place, gender]);

  const analysis = useMemo(() => {
    if (!chart) return null;
    const yong = analyzeYongshen(chart);
    const dy = analyzeDayun(chart, yong, nowYear);
    const ln = analyzeLiunian(chart, yong, dy, nowYear);
    const ly = analyzeLiuyue(chart, nowYear);
    return { yong, dy, ln, ly };
  }, [chart, nowYear]);

  const toggle = (n: number) => setOpenSteps((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const isOpen = (n: number) => openSteps.includes(n);

  if (!chart || !analysis) {
    return <div className="bg-red-400/10 border border-red-400/25 text-red-700 rounded-lg p-4 text-sm">出生时间有误，无法排盘。</div>;
  }
  const { yong, dy, ln, ly } = analysis;

  const ctx = buildBaziContext(chart, focus);
  const askFor = (n: number) => (
    <StepAsk stepNo={n} stepTitle={STEPS[n - 1].title} systemPrompt={buildBaziSystemPrompt(n)} guaContext={ctx} />
  );

  const dm = chart.dayMasterElement;
  const strong = chart.strength.label === '从强倾向' || chart.strength.label === '偏强';
  // 忌神之地支集合（供刑冲喜忌判断）
  const jiBranches = new Set(chart.pillars.filter((p) => yong.jishen.includes(p.branchElement)).map((p) => p.branch));
  const relationNote = (r: RelationItem): string | null => {
    if (r.kind !== '六冲' && r.kind !== '相刑') return null;
    const branches = r.pair.match(/[子丑寅卯辰巳午未申酉戌亥]/g) ?? [];
    const hitJi = branches.some((b) => jiBranches.has(b));
    return hitJi ? '被冲刑之支属忌神一方——冲去忌神，反凶为吉' : '被冲刑之支涉喜用一方——喜用受伤，须防';
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* 左：输入 */}
        <aside className="bg-[#151b31] border border-[#2e375c] rounded-lg p-4 lg:h-full lg:overflow-y-auto">
          <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>一、生辰输入</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">性别（定乾造/坤造与大运顺逆）</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([['male', '男 · 乾造'], ['female', '女 · 坤造']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setGender(v)}
                    className={`text-sm py-2 rounded-md border ${gender === v ? 'border-[#b08a44] bg-[#b08a44] text-white' : 'border-[#2e375c] bg-[#11162b] text-[#b0a78c] hover:border-[#b08a44]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SolarTimeInput date={date} setDate={setDate} time={time} setTime={setTime} place={place} setPlace={setPlace} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#c8bd9c] mb-1.5">想了解的方面（选填，AI 解读会侧重）</label>
              <input value={focus} onChange={(e) => setFocus(e.target.value)}
                placeholder="如：事业方向 / 财运 / 婚姻感情 / 学业"
                className="w-full border border-[#2e375c] rounded-md bg-[#11162b] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#b08a44]" />
            </div>
          </div>
        </aside>

        {/* 右：命盘 + 教学流程 */}
        <div className="space-y-5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
          {/* 命盘表 */}
          <section className="bg-[#151b31] border border-[#2e375c] rounded-lg p-4">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-bold" style={{ fontFamily: '"Songti SC",serif' }}>
                二、命盘 · {chart.genderLabel} · 日主 {chart.dayMaster}{chart.dayMasterElement}（{chart.strength.label}）
                <span className="ml-2 text-xs font-bold bg-[#b08a44] text-white rounded px-1.5 py-0.5 align-middle">{chart.geju.name}</span>
              </h2>
              <div className="text-xs text-[#8d8670]">胎元{chart.taiyuan} · {chart.kong.join('')}空 · 大运{chart.dayunDir} · 约 {chart.qiyunAge} 岁起运</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ fontFamily: '"Songti SC",serif' }}>
                <thead>
                  <tr className="text-xs text-[#8d8670]">
                    <th className="text-left py-1 w-16"></th>
                    {chart.pillars.map((p) => <th key={p.name} className="py-1">{p.name}</th>)}
                  </tr>
                </thead>
                <tbody className="text-center">
                  <tr className="text-xs text-[#c8bd9c]">
                    <td className="text-left py-1">十神</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.shiShen}</td>)}
                  </tr>
                  <tr className="text-xl font-bold">
                    <td className="text-left text-xs text-[#c8bd9c] py-1">天干</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1" style={{ color: ELEM_COLOR[p.stemElement] }}>{p.stem}</td>
                    ))}
                  </tr>
                  <tr className="text-xl font-bold">
                    <td className="text-left text-xs text-[#c8bd9c] py-1">地支</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1" style={{ color: ELEM_COLOR[p.branchElement] }}>
                        {p.branch}{p.kong && <span className="text-[10px] text-red-400 align-top"> 空</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="text-xs text-[#c8bd9c]">
                    <td className="text-left py-1">藏干</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1">{p.canggan.map((x) => `${x.stem}${x.shiShen}`).join(' ')}</td>
                    ))}
                  </tr>
                  <tr className="text-xs text-[#c8bd9c]">
                    <td className="text-left py-1">地势</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.dishi}</td>)}
                  </tr>
                  <tr className="text-xs text-[#c8bd9c]">
                    <td className="text-left py-1">自坐</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.zizuo}</td>)}
                  </tr>
                  <tr className="text-xs text-[#c8bd9c]">
                    <td className="text-left py-1">神煞</td>
                    {chart.pillars.map((p) => (
                      <td key={p.name} className="py-1">
                        {p.shensha.length
                          ? p.shensha.map((s) => {
                              const good = /贵人|文昌|禄神|金舆|天医|十灵/.test(s);
                              const bad = /羊刃|劫煞|亡神|孤辰|寡宿|阴阳差错/.test(s);
                              const love = /桃花|红艳|红鸾|天喜/.test(s);
                              const cls = good ? 'bg-emerald-400/15 text-emerald-300'
                                : bad ? 'bg-red-400/15 text-red-300'
                                : love ? 'bg-pink-400/15 text-pink-300'
                                : s.includes('魁罡') ? 'bg-purple-400/15 text-purple-300'
                                : 'bg-[#242b49] text-[#b0a78c]';
                              return <span key={s} className={`inline-block rounded px-1 mr-0.5 mb-0.5 ${cls}`}>{s}</span>;
                            })
                          : <span className="text-[#55513f]">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="text-xs text-[#8d8670]">
                    <td className="text-left py-1">纳音</td>
                    {chart.pillars.map((p) => <td key={p.name} className="py-1">{p.nayin}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-[#6f6a58] leading-snug">
              神煞图例：<span className="text-emerald-400">绿＝吉神</span>　<span className="text-pink-700">粉＝姻缘</span>　<span className="text-red-700">红＝凶煞</span>　紫＝魁罡　灰＝中性。查法以《三命通会》为准，神煞只作应象润色，不可喧宾夺主盖过五行生克。
            </p>
            {/* 格局 + 刑冲合害速览 */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2.5">
                <div className="text-xs font-bold text-[#c8bd9c] mb-1.5">
                  月令取格：<span className="text-sm text-[#b08a44]" style={{ fontFamily: '"Songti SC",serif' }}>{chart.geju.name}</span>
                  {chart.geju.touGan && <span className="ml-1 font-normal text-[#6f6a58]">（{chart.geju.touGan}透干）</span>}
                </div>
                <ul className="space-y-1">
                  {chart.geju.steps.map((s, i) => <li key={i} className="text-[11px] text-[#a89f86] leading-snug">· {s}</li>)}
                </ul>
                {chart.geju.note && <p className="mt-1.5 text-[11px] text-[#d4b578] leading-snug border-t border-[#232a49] pt-1.5"><b>喜忌：</b>{chart.geju.note}</p>}
              </div>
              <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2.5">
                <div className="text-xs font-bold text-[#c8bd9c] mb-1.5">干支关系 · 合冲刑害（详见第 8 步）</div>
                {chart.relations.length ? (
                  <div className="flex flex-wrap gap-1">
                    {chart.relations.map((r, i) => (
                      <span key={i} className={`text-[11px] rounded px-1.5 py-0.5 ${r.tone === 'good' ? 'bg-emerald-400/15 text-emerald-300' : r.tone === 'bad' ? 'bg-red-400/15 text-red-300' : 'bg-[#242b49] text-[#b0a78c]'}`}>
                        {r.kind}·{r.pair}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#6f6a58] leading-snug">四柱干支无合冲刑害，是为「静局」——命局安定少波澜，吉凶多待岁运引动。</p>
                )}
              </div>
            </div>
            {/* 五行力量条 */}
            <div className="mt-3 space-y-1">
              {ELEMENTS.map((e) => (
                <div key={e} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-bold" style={{ color: ELEM_COLOR[e] }}>{e}</span>
                  <div className="flex-1 h-2.5 bg-[#232a49] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(chart.wuxingCount[e] / chart.totalPower) * 100}%`, background: ELEM_COLOR[e] }} />
                  </div>
                  <span className="w-6 text-right text-[#8d8670]">{chart.wuxingCount[e]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 十三步教学流程 + 综合论命 */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold" style={{ fontFamily: '"Songti SC",serif' }}>三、十三步研习工作流</h2>

            {/* ① 日主定性 */}
            <StepCard step={STEPS[0]} open={isOpen(1)} onToggle={() => toggle(1)} ask={askFor(1)}>
              <Teach title="命主的天赋底色是什么？">
                <p>日干「{chart.dayMaster}」即命主自己。{chart.dayMaster}者，<b>{chart.dayMasterElement}之{['甲','丙','戊','庚','壬'].includes(chart.dayMaster) ? '阳' : '阴'}</b>——{STEM_NATURE[chart.dayMaster]}。</p>
                <p>十天干性情速览：</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {Object.entries(STEM_NATURE).map(([s, v]) => (
                    <div key={s} className={`text-[11px] border rounded px-2 py-1 ${s === chart.dayMaster ? 'border-[#b08a44] bg-[#252c4e]' : 'border-[#283050] bg-[#1a2140]'}`}><b>{s}</b>：{v}</div>
                  ))}
                </div>
              </Teach>
              <Basis text="《滴天髓》论十天干本性：「五阳从气不从势，五阴从势无情义」——阳干刚健、阴干柔顺，本性是读盘的第一印象。" />
            </StepCard>

            {/* ② 月令环境 */}
            <StepCard step={STEPS[1]} open={isOpen(2)} onToggle={() => toggle(2)} ask={askFor(2)}>
              <Teach title="命主出生在什么气候里？">
                <p>月支「{chart.ganzhi.monthBranch}」为<b>{SEASON_OF[chart.ganzhi.monthBranch]}季</b>，五行属{chart.pillars[1].branchElement}——月令是全局的司令，定了整个命盘的寒暖燥湿背景。</p>
                <p>日主{chart.dayMaster}{dm}在月令的十二长生状态为「<b>{chart.pillars[1].dishi}</b>」，四季旺衰为「<b>{chart.strength.deling.verdict.split('，').pop()}</b>」。</p>
                <p><b>调候伏笔</b>：{yong.channels[1].verdict}</p>
              </Teach>
              <Basis text="《子平真诠》：月令者，命中之枢纽；《穷通宝鉴》：夏生需水润、冬生需火暖——季节寒暖是调候用神的伏笔，到第 4 步兑现。" />
            </StepCard>

            {/* ③ 强弱判断 */}
            <StepCard step={STEPS[2]} open={isOpen(3)} onToggle={() => toggle(3)} ask={askFor(3)}>
              <div className="flex items-center gap-4 mb-3 border border-[#283050] rounded-lg bg-[#1a2140] px-4 py-3">
                <div className="text-center shrink-0">
                  <div className="text-2xl font-bold" style={{ fontFamily: '"Songti SC",serif' }}>{chart.strength.total}<span className="text-xs text-[#6f6a58]">/100</span></div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${strong ? 'bg-red-400/15 text-red-300' : chart.strength.label === '中和' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-blue-400/15 text-blue-300'}`}>{chart.strength.label}</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {([['得令（月令气候·50）', chart.strength.deling], ['得地（通根根气·30）', chart.strength.dedi], ['得势（天干帮扶·20）', chart.strength.deshi]] as const).map(([name, f]) => (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <span className="w-36 shrink-0 text-[#c8bd9c]">{name}</span>
                      <div className="flex-1 h-2.5 bg-[#232a49] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#b08a44]" style={{ width: `${(f.score / f.max) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right text-[#8d8670]">{f.score}/{f.max}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {([['① 得令（权重 50）', chart.strength.deling], ['② 得地（权重 30，禄刃＞墓库＞余气）', chart.strength.dedi], ['③ 得势（权重 20，天干为浮、地支为实）', chart.strength.deshi]] as const).map(([name, f]) => (
                  <div key={name} className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2">
                    <div className="text-xs font-bold text-[#c8bd9c] mb-1">{name} <span className="font-normal text-[#6f6a58]">{f.score}/{f.max} 分</span></div>
                    <p className="text-xs text-[#e8e1cd] mb-1">{f.verdict}</p>
                    <ul className="space-y-0.5">
                      {f.items.map((it, i) => <li key={i} className="text-[11px] text-[#a89f86] leading-snug">· {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#d4b578] mb-3 leading-relaxed">{chart.strength.summary}</p>
              <Basis text="《滴天髓》：「能知衰旺之真机，其于三命之奥，思过半矣」。判分模型：得令50（旺50/相40/休25/囚15/死6）、得地30（本气禄刃12/中气8/余气墓库4）、得势20（比劫干7/印枭干5）；75 以上从强倾向、60 偏强、45 中和、30 偏弱、以下从弱倾向。" />
            </StepCard>

            {/* ④ 取用神（四通道） */}
            <StepCard step={STEPS[3]} open={isOpen(4)} onToggle={() => toggle(4)} ask={askFor(4)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {yong.channels.map((ch) => (
                  <div key={ch.name} className={`border rounded-lg px-3 py-2 ${ch.active ? 'border-[#b08a44] bg-[#252c4e]' : 'border-[#283050] bg-[#1a2140]'}`}>
                    <div className="text-xs font-bold text-[#c8bd9c] mb-1">
                      {ch.name} <span className="font-normal text-[#6f6a58]">{ch.book}</span>
                      {ch.active && <span className="ml-1 text-[10px] bg-[#b08a44] text-white rounded px-1">主用</span>}
                    </div>
                    <p className="text-[11px] text-[#a89f86] leading-snug">{ch.verdict}</p>
                    {ch.elem.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {ch.elem.map((e) => <span key={e} className="text-[11px] font-bold rounded px-1.5" style={{ color: ELEM_COLOR[e], background: '#232a49' }}>{e}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* 用喜忌闲分级表 */}
              <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2 mb-3">
                <div className="text-xs font-bold text-[#c8bd9c] mb-1.5">用神分级表</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[11px]">
                  <div className="rounded bg-emerald-400/10 border border-emerald-400/25 px-2 py-1.5"><b className="text-emerald-300">用神</b>（治命之药）<br />{yong.yongshen.join('、')}</div>
                  <div className="rounded bg-[#16241c] border border-[#2f4a3c] px-2 py-1.5"><b className="text-[#7db58f]">喜神</b>（生扶用神）<br />{yong.xishen.join('、') || '—'}</div>
                  <div className="rounded bg-red-400/10 border border-red-400/25 px-2 py-1.5"><b className="text-red-700">忌神</b>（助病坏药）<br />{yong.jishen.join('、') || '—'}</div>
                  <div className="rounded bg-[#242b49] border border-[#2e375c] px-2 py-1.5"><b className="text-[#8d8670]">闲神</b>（吉凶不显）<br />{yong.xianshen.join('、') || '—'}</div>
                </div>
                <p className="mt-1.5 text-[11px] text-[#d4b578] leading-snug">{yong.summary}</p>
              </div>
              <Basis text="四通道校验：扶抑（《滴天髓》强者抑之弱者扶之）→ 调候（《穷通宝鉴》冬火夏水优先）→ 通关（《神峰通考》两军交战取和解）→ 顺势（《子平真诠》从格不可逆性）。裁定优先级：调候急迫＞从格顺势＞两强通关＞常规扶抑。" />
            </StepCard>

            {/* ⑤ 用神质检 */}
            <StepCard step={STEPS[4]} open={isOpen(5)} onToggle={() => toggle(5)} ask={askFor(5)}>
              <div className="space-y-2 mb-3">
                {yong.quality.map((q) => (
                  <div key={q.q} className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2 flex gap-2">
                    <span className={`shrink-0 text-[11px] font-bold rounded px-1.5 h-5 ${q.ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'}`}>{q.ok ? '过关' : '未过'}</span>
                    <div>
                      <div className="text-xs font-bold text-[#c8bd9c]">{q.q}</div>
                      <p className="text-[11px] text-[#a89f86] leading-snug mt-0.5">{q.a}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Teach title="为什么要质检用神？">
                <p>取出来的用神只是「药方」——药在不在药柜里（局里有吗）、是药材还是药渣（有根吗）、有没有受潮（受伤吗），决定了这个命能兑现几分。<b>透干＞藏支，有根＞虚浮，远克＞贴克</b>：三关全过，格局清亮；三关尽失，则须等待岁运把药用出来。</p>
              </Teach>
              <Basis text="《滴天髓》通根透干之辨；《子平真诠》论相神：「月令既得用神，则别位亦必有相，若君之有相」。质检三问即格局高低的初判。" />
            </StepCard>

            {/* ⑥ 定格局 */}
            <StepCard step={STEPS[5]} open={isOpen(6)} onToggle={() => toggle(6)} ask={askFor(6)}>
              <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2 mb-3">
                <div className="text-xs font-bold text-[#c8bd9c] mb-1.5">
                  本盘格局：<span className="text-sm text-[#b08a44]" style={{ fontFamily: '"Songti SC",serif' }}>{chart.geju.name}</span>
                  {chart.geju.touGan && <span className="ml-1 text-[11px] font-normal text-[#6f6a58]">（{chart.geju.touGan}透干）</span>}
                </div>
                <ul className="space-y-1">
                  {chart.geju.steps.map((s, i) => <li key={i} className="text-[11px] text-[#a89f86] leading-snug">· {s}</li>)}
                </ul>
                {chart.geju.note && <p className="mt-1.5 text-[11px] text-[#d4b578] leading-snug border-t border-[#232a49] pt-1.5"><b>成格喜忌：</b>{chart.geju.note}</p>}
              </div>
              <Teach title="取格的优先级与雷区">
                <p>取格优先级：<b>本气透 ＞ 中气透 ＞ 余气透 ＞ 本气伏</b>——透出天干者「清」，伏藏不透者「浊而待透」。</p>
                <p>取格之后找<b>相神</b>（辅佐成格之字）：如正官格得财星生官、食神制杀格得食神通根——相神得力则格成而高；再查<b>破格雷区</b>：格神逢冲、被合化他物、喜忌混杂（如官杀混杂），皆是破格信号，须回到第 5 步质检核对。</p>
              </Teach>
              <Basis text="《子平真诠·论用神》「八字用神，专求月令」；同书〈论用神成败救应〉：成中有败、败中有成，全在相神配合。" />
            </StepCard>

            {/* ⑦ 十神读人 */}
            <StepCard step={STEPS[6]} open={isOpen(7)} onToggle={() => toggle(7)} ask={askFor(7)}>
              <Teach title="十神 × 宫位怎么读人？">
                <p><b>干透 = 外显行为</b>（别人看得见的样子），<b>支藏 = 内在动机</b>（藏在心里的算盘）。十神落在哪个宫位，就应验在哪个领域：</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {GONG_WEI.map(([g, w, note]) => (
                    <div key={g} className="text-[11px] border border-[#283050] rounded px-2 py-1 bg-[#1a2140]"><b>{g}</b>＝{w}：{note}</div>
                  ))}
                </div>
                <p>本盘速读：{chart.pillars.map((p) => `${p.name}「${p.shiShen}」`).join('，')}——日主坐{chart.pillars[2].branch}（{chart.pillars[2].canggan[0].shiShen}），内心世界以{chart.pillars[2].canggan[0].shiShen}为主导。</p>
              </Teach>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-3">
                {Object.entries(SHISHEN_MEANING).map(([k, v]) => (
                  <div key={k} className="text-[11px] border border-[#283050] rounded px-2 py-1.5 bg-[#1a2140]"><b>{k}</b>：{v}</div>
                ))}
              </div>
              <Basis text="《渊海子平》：以日干为主论十神六亲——正印为母、偏财为父、男命正财为妻、女命正官为夫、食伤为子女、比劫为兄弟；宫位配年月日时四限（《千里命稿》）。" />
            </StepCard>

            {/* ⑧ 刑冲合害 */}
            <StepCard step={STEPS[7]} open={isOpen(8)} onToggle={() => toggle(8)} ask={askFor(8)}>
              {chart.relations.length ? (
                <div className="space-y-1.5 mb-3">
                  {chart.relations.map((r, i) => {
                    const extra = relationNote(r);
                    return (
                      <div key={i} className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2 text-[11px] leading-snug">
                        <span className={`inline-block rounded px-1 mr-1 font-bold ${r.tone === 'good' ? 'bg-emerald-400/15 text-emerald-300' : r.tone === 'bad' ? 'bg-red-400/15 text-red-300' : 'bg-[#242b49] text-[#b0a78c]'}`}>{r.kind}</span>
                        <span className="font-bold text-[#e8e1cd]">{r.pair}</span>
                        <span className="block text-[#a89f86] mt-0.5">{r.detail}</span>
                        {extra && <span className="block text-[#d4b578] mt-0.5"><b>喜忌视角：</b>{extra}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#6f6a58] mb-3">四柱干支无合冲刑害，是为「静局」——命局安定少波澜，吉凶多待岁运引动。</p>
              )}
              <Teach title="查关系的三个要领">
                <p>① <b>紧贴力大、遥隔力微</b>：相邻两柱的冲合力道最足，年与时遥隔则力减三分。</p>
                <p>② <b>冲喜则凶、冲忌则吉</b>：冲本身无吉凶——冲去忌神是「冲开束缚」，冲去喜用是「釜底抽薪」。上方每条已按本盘喜忌标注。</p>
                <p>③ <b>冲库则开</b>：辰戌丑未为四库，逢冲如开库门，库中所藏（财库/印库）得以取用。半合/缺一脚的三合是「伏笔」，岁运补齐之年即是应期（到第 12 步兑现）。</p>
              </Teach>
              <Basis text="《三命通会》论干支刑冲合害；《渊海子平》：「太岁伤日干，有祸必轻；日犯岁君，灾殃必重」——关系是机关引线，原局为库、岁运为引。" />
            </StepCard>

            {/* ⑨ 神煞标注 */}
            <StepCard step={STEPS[8]} open={isOpen(9)} onToggle={() => toggle(9)} ask={askFor(9)}>
              <Teach title="神煞怎么用才不跑偏？">
                <p>神煞是<b>应象的润色笔，不是定吉凶的判官</b>——「只润色不定性，组合有根才显灵」。如天乙贵人须身旺有根方能得力；桃花本身无吉凶，落在夫妻宫逢合才应婚恋。</p>
                <p>本盘神煞分布：{chart.pillars.map((p) => `${p.name}【${p.shensha.join('、') || '无'}】`).join('；')}。</p>
                <p>空亡{chart.kong.join('')}：空者，虚而不实——喜神逢空减力、忌神逢空反吉；空亡之字待流年「填实」（值年）或「冲实」而应事。</p>
              </Teach>
              <Basis text="《三命通会》神煞总论：「凡看命，以五行生克为主，神煞为辅」；驿马主动、桃花主人缘、华盖主孤高、魁罡主果断，皆作剧情素材看。" />
            </StepCard>

            {/* ⑩ 排大运 */}
            <StepCard step={STEPS[9]} open={isOpen(10)} onToggle={() => toggle(10)} ask={askFor(10)}>
              <Teach title="大运怎么排？">
                <p>① <b>定顺逆</b>：阳年生男、阴年生女<b>顺行</b>；阴年生男、阳年生女<b>逆行</b>。本造年干「{chart.ganzhi.year[0]}」（{['甲','丙','戊','庚','壬'].includes(chart.ganzhi.year[0]) ? '阳' : '阴'}）· {chart.gender === 'male' ? '男' : '女'}命 → <b>{chart.dayunDir}</b>。</p>
                <p>② <b>起运数</b>：{chart.qiyunNote}。</p>
                <p>③ <b>排运</b>：自月柱「{chart.ganzhi.month}」{chart.dayunDir === '顺行' ? '顺数' : '逆数'}六十甲子，每运管十年。</p>
              </Teach>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
                {chart.dayun.map((d) => (
                  <div key={d.gz} className="border border-[#283050] rounded px-2 py-1.5 bg-[#1a2140] text-center">
                    <div className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{d.gz} <span className="text-[10px] font-normal text-[#8d8670]">{d.shiShen}</span></div>
                    <div className="text-[10px] text-[#8d8670]">{d.startAge}–{d.startAge + 9} 岁（约 {d.startYear} 年起）</div>
                  </div>
                ))}
              </div>
              <Basis text="《千里命稿·起运篇》：阳男阴女顺行、阴男阳女逆行，三日折一年起运；《三命通会》「命好不如运好」，命为车、运为路。" />
            </StepCard>

            {/* ⑪ 大运分析 */}
            <StepCard step={STEPS[10]} open={isOpen(11)} onToggle={() => toggle(11)} ask={askFor(11)}>
              <Teach title="每步运过五关（教学简化版）">
                <p>① 干支分看（干主事、支主力）→ ② 翻十神（定十年主题）→ ③ 对喜忌（定吉凶基调）→ ④ 与原局合冲（找引爆点）→ ⑤ 叠神煞（润色应象）。下方已按本盘用神（{yong.yongshen.join('、')}）逐运分析：</p>
              </Teach>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {dy.map((d) => (
                  <div key={d.gz} className={`border rounded-lg px-3 py-2 ${d.current ? 'border-[#b08a44] bg-[#252c4e]' : 'border-[#283050] bg-[#1a2140]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{d.gz}</span>
                      <span className="text-[10px] text-[#8d8670]">{d.shiShen} · {d.startAge}–{d.startAge + 9}岁（{d.startYear}–{d.startYear + 9}）</span>
                      <span className={`text-[10px] font-bold rounded px-1 ${TONE_CLS[d.tone]}`}>{d.tone}</span>
                      {d.current && <span className="text-[10px] bg-[#b08a44] text-white rounded px-1">当前</span>}
                    </div>
                    <p className="text-[11px] text-[#a89f86] leading-snug">主题：{d.theme}。运干{d.stem}{d.stemElem}主外显之事、运支{d.branch}{d.branchElem}主实际力量。</p>
                    {d.hits.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {d.hits.map((h, i) => <li key={i} className="text-[10px] text-[#d4b578] leading-snug">⚡ {h}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <Basis text="吉凶看喜忌，应象看十神+作用（《三命通会》论大运）。运逢喜用为吉运，逢忌神为逆运，平运守成；「引爆点」即运与原局冲合之字，是该运应事的阀门。" />
            </StepCard>

            {/* ⑫ 流年应期 */}
            <StepCard step={STEPS[11]} open={isOpen(12)} onToggle={() => toggle(12)} ask={askFor(12)}>
              <Teach title="七大触发机制（原局为库，岁运为引）">
                <p><b>逢值</b>（流年干支=原局干支，伏吟引动）· <b>冲动</b>（岁支冲原局支）· <b>合动</b>（岁支合原局支）· <b>填实空亡</b>（空字逢值则实）· <b>凑齐刑合</b>（补齐三刑/三合缺脚）· <b>岁运并临 / 天克地冲</b>（大事信号）· <b>流年十神</b>（定当年主题）。剧情要看连续几年的起承转合，灰色为过去年份——可用来反推验证。</p>
              </Teach>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 mb-3">
                {ln.map((y) => (
                  <div key={y.year} className={`border rounded px-1.5 py-1 text-center ${y.current ? 'border-[#b08a44] bg-[#252c4e]' : 'border-[#283050]'} ${y.past ? 'opacity-55 bg-[#181d33]' : 'bg-[#1a2140]'}`}>
                    <div className="text-[11px] font-bold">{y.year} {y.current && '◀'}</div>
                    <div className="text-xs font-bold" style={{ fontFamily: '"Songti SC",serif' }}>{y.gz}</div>
                    <div className="text-[10px] text-[#8d8670]">{y.shiShen} <span className={`inline-block rounded px-0.5 ${TONE_CLS[y.tone]}`}>{y.tone}</span></div>
                    {y.triggers.length > 0 && <div className="text-[9px] text-red-700 leading-tight mt-0.5">{y.triggers.length} 个触发</div>}
                  </div>
                ))}
              </div>
              <div className="space-y-1 mb-3">
                {ln.filter((y) => y.triggers.length > 0).map((y) => (
                  <div key={y.year} className={`text-[11px] border border-[#283050] rounded px-2 py-1.5 ${y.past ? 'bg-[#181d33] text-[#7d7663]' : 'bg-[#1a2140] text-[#e8e1cd]'}`}>
                    <b>{y.year} {y.gz}（{y.shiShen}年{y.past ? '·已过' : ''}）</b>：{y.triggers.join('；')}
                  </div>
                ))}
              </div>
              <Basis text="《渊海子平》「太岁乃一年之主宰」；应期核心：原局有的，岁运引动则发。过去年份可对照已发生之事反推验证——对得上，说明强弱用神判对了。" />
            </StepCard>

            {/* ⑬ 流月细化 */}
            <StepCard step={STEPS[12]} open={isOpen(13)} onToggle={() => toggle(13)} ask={askFor(13)}>
              <Teach title="应期到月就够了">
                <p>流年定下当年主题后，年内再找<b>冲合应事之字的月份</b>——月支冲动/合动原局或太岁之支的月份，就是事情兑现的月份。以下是 {nowYear} 年（{ly.length ? '有引动的月份' : '无引动'}）：</p>
              </Teach>
              {ly.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
                  {ly.map((m) => (
                    <div key={m.month} className="border border-[#283050] rounded px-2 py-1.5 bg-[#1a2140] text-center">
                      <div className="text-xs font-bold">{m.month} 月 <span style={{ fontFamily: '"Songti SC",serif' }}>{m.gz}</span></div>
                      <div className="text-[10px] text-[#d4b578]">{m.trigger}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6f6a58] mb-3">{nowYear} 年十二月支与原局、太岁均无冲合，年内平顺少波澜。</p>
              )}
              <Basis text="流月以节气换月（每月 15 日近似取月建，误差±1天）；应期到月即可，流日流时过细，教学从略。" />
            </StepCard>

            {/* ⑭ 综合论命 */}
            <StepCard step={STEPS[13]} open={isOpen(14)} onToggle={() => toggle(14)} ask={askFor(14)}>
              <AiVerdict
                systemPrompt={buildBaziReadingPrompt()}
                guaContext={ctx}
                title="AI 完整命理解读 · Kimi K3（旺衰 / 格局 / 过去验证 / 未来预测）"
                intro="前面十三步是排盘与规则的逐项推演。点击下方按钮，Kimi K3 会以八部典籍为依据，把整个命盘串成小白能懂的完整解读：性格天赋、格局用神、过去关键年份回顾、未来几年预测、大运走势、建议趋避。"
                buttonText="生成 AI 命理解读"
                askText="请基于以上命盘数据，结合我想了解的方面，做完整命理解读（含过去关键大运流年的回顾验证与未来几年的预测）。"
              />
              <Basis text="AI 解读依据：《四柱预测学》《千里命稿》《渊海子平》《子平真诠》《滴天髓》《穷通宝鉴》《三命通会》《神峰通考》八部典籍的论命体系（模型按典籍方法解读，原文未内置）。" />
            </StepCard>
          </section>

          {/* 领域速查 */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>四、领域速查（看事公式）</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {DOMAIN_TABLE.map(([domain, look, formula]) => (
                <div key={domain} className="border border-[#283050] rounded px-3 py-2 bg-[#1a2140]">
                  <div className="text-xs font-bold text-[#c8bd9c]">{domain}</div>
                  <div className="text-[11px] text-[#a89f86] mt-0.5 leading-snug"><b>看什么：</b>{look}</div>
                  <div className="text-[11px] text-[#d4b578] leading-snug"><b>速查：</b>{formula}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 互洽清单 */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>五、下断语前的互洽清单</h2>
            <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-3 py-2.5 space-y-1.5">
              {CROSS_CHECK.map((c, i) => (
                <div key={i} className="text-[11px] text-[#a89f86] leading-snug">□ {c}</div>
              ))}
              <div className="text-[11px] text-[#d4b578] leading-snug border-t border-[#232a49] pt-1.5">
                → 全部互洽 → 可以下断语；互相矛盾 → 回查第 ③④ 步（强弱与用神判错了最常见）。
              </div>
            </div>
          </section>

          {/* 歌诀 */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>六、流程背诵歌诀</h2>
            <div className="border border-[#283050] rounded-lg bg-[#1a2140] px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
              {VERSE.map((v) => (
                <div key={v} className="text-xs text-[#e8e1cd] leading-relaxed" style={{ fontFamily: '"Songti SC",serif' }}>{v}</div>
              ))}
            </div>
          </section>

          {/* 典籍速查 */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ fontFamily: '"Songti SC",serif' }}>七、八字典籍速查（解读依据）</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {BAZI_BOOKS.map((b) => (
                <div key={b.name} className="border border-[#283050] rounded px-3 py-2 bg-[#1a2140]">
                  <div className="text-xs font-bold text-[#c8bd9c]">{b.name} <span className="font-normal text-[#6f6a58]">{b.author}</span></div>
                  <div className="text-[11px] text-[#a89f86] mt-0.5 leading-snug">{b.use}</div>
                </div>
              ))}
            </div>
          </section>

          <footer className="text-[10px] text-[#6f6a58] leading-relaxed border-t border-[#2e375c] pt-3 pb-6">
            说明：本模块排盘规则（真太阳时经度修正与均时差、立春换年、节气换月、五虎遁五鼠遁、十神、藏干、地势自坐、神煞、胎元、纳音、旬空、月令取格、刑冲合害、大运顺逆与起运、流年流月引动）均出自子平法传统体系；
            旺衰为得令50/得地30/得势20的教学量化模型，用神四通道与应期触发为教学简化判定，细论须人工参看合化、通关与调候。八字是传统术数的趋势参考，命好不如运好，运好不如心态好，具体人生抉择以现实努力与专业意见为准。
          </footer>

          {/* 全局助教 */}
          {tutorOpen ? (
            <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#2e375c]">
              <div className="flex items-center justify-between bg-[#5b6b9e] text-white px-3 py-2">
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
              className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#5b6b9e] hover:bg-[#48578a] text-white text-sm font-bold rounded-full px-4 py-2.5 shadow-lg">
              <GraduationCap size={16} /> 问助教
            </button>
          )}
        </div>
      </main>
    </>
  );
}
