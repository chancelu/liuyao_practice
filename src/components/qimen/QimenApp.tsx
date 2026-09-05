// 奇门遁甲教学页：时间/报数起局 + 九宫盘 + 十一步研习工作流 + AI 综合断局 + 复盘本
// 体系：时家转盘奇门（拆补法定局），依据《烟波钓叟歌》《遁甲演义》《奇门遁甲统宗》《神奇之门》
import { useMemo, useState } from 'react';
import { paipanQimen } from '../../lib/qimen/engine';
import type { QimenChart, QimenPalace } from '../../lib/qimen/engine';
import {
  PALACE, STAR_OF, GATE_OF, GOD_DESC, QIMEN_YONGSHEN, QI_YI_LABEL, JU_SHU,
} from '../../lib/qimen/constants';
import { QIMEN_STEP_KNOWLEDGE } from '../../lib/qimen/knowledge';
import { buildQimenContext, buildQimenSystemPrompt, buildQimenReadingPrompt, QIMEN_BOOKS } from '../../lib/qimen/tutorContext';
import { STEM_ELEMENT } from '../../lib/liuyao/constants';
import type { Element5 } from '../../lib/liuyao/constants';
import { StepZones } from '../StepZones';
import { StepAsk, TutorPanel, AiVerdict, classifyQuestion } from '../liuyao/TutorChat';
import { SolarTimeInput, type PlaceSel } from '../geo/SolarTimeInput';
import { Notebook } from '../Notebook';
import type { NoteRecord, QimenPayload } from '../../lib/notebook';
import { cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf } from '../../lib/geo/solarTime';
import {
  ChevronDown, ChevronRight, GraduationCap, X, BookOpen, Sparkles, Loader2,
} from 'lucide-react';

const ELEM_COLOR: Record<Element5, string> = { 木: '#6fbf73', 火: '#e57373', 土: '#d4a24e', 金: '#c9c9c9', 水: '#64b5f6' };
const NATURE_CLS = { 吉: 'text-emerald-300', 凶: 'text-red-300', 平: 'text-[#b0a78c]' } as const;

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

function Teach({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 mb-3">
      <div className="flex items-center gap-1 text-xs font-bold text-emerald-300 mb-1"><BookOpen size={12} /> {title}</div>
      <div className="text-xs leading-relaxed text-[#9fc3ae] space-y-1.5">{children}</div>
    </div>
  );
}

interface StepDef { no: number; title: string; subtitle: string }
const STEPS: StepDef[] = [
  { no: 1, title: '定局', subtitle: '节气三元 · 阴阳遁 · 局数' },
  { no: 2, title: '布地盘', subtitle: '三奇六仪 · 阳顺阴逆' },
  { no: 3, title: '定值符值使', subtitle: '时柱旬首 · 六甲遁仪' },
  { no: 4, title: '转天盘', subtitle: '值符加时干 · 九星转宫' },
  { no: 5, title: '布八门', subtitle: '值使随时支 · 门迫' },
  { no: 6, title: '布八神', subtitle: '值符随星 · 阳顺阴逆' },
  { no: 7, title: '标注', subtitle: '空亡 · 马星 · 击刑 · 入墓' },
  { no: 8, title: '取用神', subtitle: '日干人 · 时干事 · 专项取用' },
  { no: 9, title: '看格局', subtitle: '吉凶格 · 伏反吟 · 五不遇时' },
  { no: 10, title: '门派拓展', subtitle: '阴盘 · 飞盘 · 江湖法' },
  { no: 11, title: '综合断局', subtitle: 'AI 完整解读 · 应期与决策' },
];

function StepCard({ step, open, onToggle, ask, children }: {
  step: StepDef; open: boolean; onToggle: () => void; ask: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="panel overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#c9a962]/5 transition-colors">
        <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] text-xs font-bold flex items-center justify-center shrink-0" style={{ fontFamily: '"Songti SC",serif' }}>{step.no}</span>
        <span className="flex-1 min-w-0">
          <span className="font-bold text-sm" style={{ fontFamily: '"Songti SC",serif' }}>{step.title}</span>
          <span className="text-[11px] text-[#6f6a58] ml-2">{step.subtitle}</span>
        </span>
        {open ? <ChevronDown size={16} className="text-[#6f6a58]" /> : <ChevronRight size={16} className="text-[#6f6a58]" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#32281a] pt-3">{children}{ask}</div>}
    </div>
  );
}

/** 单个宫格（九宫盘用） */
function PalaceCell({ p, center, diOnly }: { p: QimenPalace; center?: boolean; diOnly?: boolean }) {
  const def = PALACE[p.num];
  if (center) {
    return (
      <div className="rounded-lg border border-[#3a2f1e] bg-[#100d08] p-1.5 min-h-[92px] flex flex-col items-center justify-center text-center">
        <span className="text-[10px] text-[#6f6a58]">中五宫</span>
        <span className="text-sm font-bold" style={{ color: ELEM_COLOR[STEM_ELEMENT[p.diGan]] }}>{p.diGan}</span>
        <span className="text-[9px] text-[#6f6a58] leading-tight">寄坤二宫<br />随天禽转</span>
      </div>
    );
  }
  return (
    <div className={`rounded-lg border p-1.5 min-h-[92px] flex flex-col transition-colors ${
      p.kong ? 'border-dashed border-[#6b6353] bg-[#12100b]' : 'border-[#3a2f1e] bg-[#17140f]'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#6f6a58]">{def.gua}{p.num}</span>
        <span className={`text-[10px] ${GOD_DESC[p.god] ? NATURE_CLS[GOD_DESC[p.god].nature] : ''}`}>
          {diOnly ? '' : p.god}
        </span>
      </div>
      {!diOnly && (
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[11px] font-semibold ${NATURE_CLS[STAR_OF[p.star]?.nature ?? '平']}`}>{p.star}</span>
          <span className={`text-[11px] font-semibold ${NATURE_CLS[GATE_OF[p.gate]?.nature ?? '平']}`}>{p.gate}</span>
        </div>
      )}
      <div className="mt-auto pt-1 flex items-end justify-between border-t border-[#2a2214]">
        {!diOnly && (
          <span className="text-sm font-bold" style={{ color: ELEM_COLOR[STEM_ELEMENT[p.tianGan]] }}>
            {p.tianGan}
            {p.jiGan && <span className="text-[9px] font-normal text-[#8d8670]">寄{p.jiGan}</span>}
          </span>
        )}
        <span className="text-xs" style={{ color: ELEM_COLOR[STEM_ELEMENT[p.diGan]], opacity: 0.85 }}>{p.diGan}</span>
      </div>
      {(p.kong || p.horse || p.flags.length > 0) && !diOnly && (
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {p.kong && <span className="text-[8px] rounded px-1 bg-[#3a3527] text-[#a89f8a]">空亡</span>}
          {p.horse && <span className="text-[8px] rounded px-1 bg-[#27403a] text-emerald-300">马星</span>}
          {p.flags.map((f) => (
            <span key={f} className="text-[8px] rounded px-1 bg-red-400/15 text-red-300">{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 九宫盘：巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6 */
function PalaceBoard({ chart, diOnly = false }: { chart: QimenChart; diOnly?: boolean }) {
  const grid = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  return (
    <div className="grid grid-cols-3 gap-1.5 max-w-md mx-auto">
      {grid.map((num) => (
        <PalaceCell key={num} p={chart.palaces[num - 1]} center={num === 5} diOnly={diOnly} />
      ))}
    </div>
  );
}

const NINE_STARS_ROW = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'] as const;
const EIGHT_GATES_ROW = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'] as const;
const EIGHT_GODS_ROW = ['值符', '螣蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'] as const;

export function QimenApp() {
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTime());
  const [place, setPlace] = useState<PlaceSel | null>(null); // 起局地点选填
  const [juInput, setJuInput] = useState(''); // 报数定局（江湖法，选填 1-9）
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string>('zonghe');
  const [classifying, setClassifying] = useState(false);
  const [classifyMsg, setClassifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));
  const [tutorOpen, setTutorOpen] = useState(false);

  const chart = useMemo<QimenChart | null>(() => {
    try {
      const d = dateTimeOf(date, time);
      if (!d) return null;
      const corrected = place ? solarCorrection(d, cityAt(place.prov, place.city).lng).corrected : d;
      const juNum = /^\d$/.test(juInput.trim()) ? Number(juInput.trim()) : undefined;
      const ju = juNum && juNum >= 1 && juNum <= 9 ? juNum : undefined;
      return paipanQimen(corrected, ju);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [date, time, place, juInput]);

  const catDef = QIMEN_YONGSHEN.find((c) => c.id === category) ?? QIMEN_YONGSHEN[0];

  const ctx = useMemo(
    () => (chart ? buildQimenContext(chart, question, catDef.label, catDef.rule) : ''),
    [chart, question, catDef],
  );

  const aiClassify = async () => {
    const q = question.trim();
    if (!q || classifying) return;
    setClassifying(true);
    setClassifyMsg(null);
    try {
      const r = await classifyQuestion(
        q,
        QIMEN_YONGSHEN.map((c) => ({ id: c.id, label: c.label, yongshen: c.rule })),
        { name: '奇门遁甲', basis: '取用依据《遁甲演义》「日干为人、时干为事」总纲与转盘专项用神体系' },
      );
      setCategory(r.categoryId);
      setClassifyMsg({ ok: true, text: `已归类为「${QIMEN_YONGSHEN.find((c) => c.id === r.categoryId)?.label}」：${r.reason}` });
    } catch (e) {
      setClassifyMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setClassifying(false);
    }
  };

  const toggle = (no: number) =>
    setOpenSteps((s) => {
      const next = new Set(s);
      if (next.has(no)) next.delete(no); else next.add(no);
      return next;
    });
  const isOpen = (no: number) => openSteps.has(no);
  const askFor = (no: number) =>
    chart ? <StepAsk stepNo={no} stepTitle={STEPS[no - 1].title} systemPrompt={buildQimenSystemPrompt(no)} guaContext={ctx} /> : null;
  const zone = (no: number) => <StepZones knowledge={QIMEN_STEP_KNOWLEDGE[no]} />;

  /** 找某符号（门/星/天盘干/神）的落宫 */
  const findPalace = (kind: 'gate' | 'star' | 'tianGan' | 'diGan' | 'god', val: string): QimenPalace | undefined =>
    chart?.palaces.find((p) => p[kind] === val);

  // 复盘本
  const makeNoteDraft = () =>
    chart
      ? {
          type: 'qimen' as const,
          title: question.trim() || `${chart.jieqi}·${chart.dun}遁${chart.ju}局`,
          summary: `${chart.ganzhi.day}日${chart.ganzhi.hour}时 · ${chart.dun}遁${chart.ju}局 · 值符${chart.zhifuStar}值使${chart.zhifuGate} · ${catDef.label}${chart.geju.length ? ` · ${chart.geju[0].split('（')[0]}` : ''}`,
          payload: { date, time, place, juInput, question, category } as QimenPayload,
        }
      : null;
  const loadNote = (n: NoteRecord) => {
    if (n.type !== 'qimen') return;
    const p = n.payload as QimenPayload;
    setDate(p.date); setTime(p.time); setPlace(p.place);
    setJuInput(p.juInput); setQuestion(p.question); setCategory(p.category);
  };

  const gz = chart?.ganzhi;
  const dayStemPalace = chart ? chart.palaces.find((p) => p.tianGan === gz!.dayStem) : undefined;
  const hourStemPalace = chart ? chart.palaces.find((p) => p.tianGan === gz!.hour[0] || (gz!.hour[0] === '甲' && p.tianGan === chart.xunYi)) : undefined;

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden w-full">
      {/* 左：起局输入 */}
      <aside className="panel p-4 lg:h-full lg:overflow-y-auto space-y-3">
        <div className="section-head"><span className="num text-base">壹</span><span className="title">起局输入</span></div>

        <SolarTimeInput
          date={date} setDate={setDate} time={time} setTime={setTime}
          place={place} setPlace={setPlace}
          optional
          placeLabel="起局地点（选填，校正真太阳时）"
        />

        <div>
          <label className="block text-xs font-semibold text-[#c8bd9c] mb-1">报数定局（江湖法，选填 1-9；留空按节气定局）</label>
          <input
            value={juInput}
            onChange={(e) => setJuInput(e.target.value.replace(/[^1-9]/g, '').slice(0, 1))}
            placeholder="如：7"
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#c8bd9c] mb-1">所问何事（具体问题）</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="如：这次跳槽能成吗？ / 这笔货款什么时候能收回？"
            className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60 resize-none"
          />
          <button onClick={aiClassify} disabled={classifying || !question.trim()} className="mt-1.5 btn-gold text-xs px-3.5 py-1.5">
            {classifying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI 定用神（智能归类）
          </button>
          {classifyMsg && (
            <div className={`mt-1.5 text-[10px] leading-relaxed rounded px-2 py-1.5 border ${
              classifyMsg.ok ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' : 'text-red-300 bg-red-400/10 border-red-400/25'
            }`}>
              {classifyMsg.text}
            </div>
          )}
          <div className="mt-2">
            <label className="block text-[10px] text-[#8d8670] mb-1">测事类别（可手动校正）</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-1.5 text-xs text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60">
              {QIMEN_YONGSHEN.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-[#6f6a58] leading-relaxed">{catDef.rule}</p>
          </div>
        </div>

        <div className="border-t border-[#3a2f1e]/60 pt-2.5">
          <p className="text-[10px] text-[#6f6a58] leading-relaxed">
            体系：时家转盘奇门 · 拆补法定局。一局只断一事，问完一件重新起局。
          </p>
        </div>
      </aside>

      {/* 右：九宫盘 + 研习工作流 */}
      <div className="space-y-5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        {chart && gz ? (
          <>
            <section className="panel p-4">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <div className="section-head !mb-0">
                  <span className="num text-base">贰</span>
                  <span className="title">奇门盘 · {chart.dun}遁{chart.ju}局</span>
                </div>
                <div className="text-xs text-[#8d8670]">
                  {gz.year}年 {gz.month}月 {gz.day}日 {gz.hour}时 · {chart.jieqi} · 值符{chart.zhifuStar} 值使{chart.zhifuGate}
                </div>
              </div>
              {question.trim() && (
                <div className="mb-3 text-xs text-[#c8bd9c] bg-[#201a12] border border-[#32281a] rounded px-3 py-1.5">
                  <b>所问：</b>{question.trim()}
                  <span className="text-[#7d7663]">　·　类别：{catDef.label}</span>
                </div>
              )}
              <PalaceBoard chart={chart} />
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] text-[#6f6a58]">
                <span>读法：每格右上=八神，中=星/门，左下大字=天盘干，右下=地盘干</span>
                <span className="text-red-300/80">红标=击刑/入墓/门迫</span>
                <span className="text-[#a89f8a]">虚线格=空亡</span>
              </div>
              {(chart.starFuyin || chart.starFanyin || chart.gateFuyin || chart.gateFanyin || chart.wubu) && (
                <div className="mt-2 text-center text-[11px] text-amber-300/90">
                  {[chart.starFuyin && '星伏吟', chart.starFanyin && '星反吟', chart.gateFuyin && '门伏吟', chart.gateFanyin && '门反吟', chart.wubu && '五不遇时'].filter(Boolean).join(' · ')}
                </div>
              )}
            </section>

            <section>
              <div className="section-head !mb-1"><span className="num text-base">叁</span><span className="title">十一步研习工作流</span></div>
              <p className="text-[10px] text-[#6f6a58] mb-3">每步三块内容：「这一步怎么推」绿色教学框 · 「经典区」典籍原文+白话解读 · 「实战区」门派用法与补充</p>

              <div className="space-y-3">
                {/* ① 定局 */}
                <StepCard step={STEPS[0]} open={isOpen(1)} onToggle={() => toggle(1)} ask={askFor(1)}>
                  <Teach title="这一步怎么定？">
                    <p>① 先定阴阳遁：<b>冬至后阳遁、夏至后阴遁</b>——本局在{chart.jieqi}节气，属<b>{chart.dun}遁</b>；</p>
                    <p>② 再定三元：看日支 {gz.dayBranch}——子午卯酉为上元、寅申巳亥为中元、辰戌丑未为下元，本局为<b>{chart.yuan}</b>（拆补法）；</p>
                    <p>③ 查定局歌诀：「{chart.jieqi}」上中下三元局数为 {JU_SHU[chart.jieqi].ju.join(' / ')}，取{chart.yuan}→ <b>{chart.ju} 局</b>。</p>
                  </Teach>
                  <div className="text-xs text-[#d4c294] bg-[#201a12] border border-[#32281a] rounded px-3 py-2">{chart.juNote}</div>
                  {zone(1)}
                </StepCard>

                {/* ② 布地盘 */}
                <StepCard step={STEPS[1]} open={isOpen(2)} onToggle={() => toggle(2)} ask={askFor(2)}>
                  <Teach title="这一步怎么布？">
                    <p>顺序永远是 <b>戊己庚辛壬癸丁丙乙</b>（六仪+三奇）。{chart.dun}遁{chart.ju}局：戊起{PALACE[chart.ju].name}，{chart.dun === '阳' ? '顺飞（宫数递增）' : '逆飞（宫数递减）'}布入九宫。</p>
                    <p>中五宫的干「{chart.palaces[4].diGan}」不参与转动，之后由天禽星寄坤二宫随身带走。</p>
                  </Teach>
                  <PalaceBoard chart={chart} diOnly />
                  <p className="text-[10px] text-[#6f6a58] mt-1.5 text-center">地盘九宫（仅地盘干）</p>
                  {zone(2)}
                </StepCard>

                {/* ③ 定值符值使 */}
                <StepCard step={STEPS[2]} open={isOpen(3)} onToggle={() => toggle(3)} ask={askFor(3)}>
                  <Teach title="这一步怎么找？">
                    <p>① 时柱 <b>{gz.hour}</b> 属 <b>{chart.xun}旬</b>，旬首遁于 <b>{chart.xunYi}</b>（{QI_YI_LABEL[chart.xunYi]}）；</p>
                    <p>② 地盘「{chart.xunYi}」在 {PALACE[chart.zhifuSrcPalace].name}{chart.zhifuSrcPalace === 5 ? '（中五寄坤二宫）' : ''}；</p>
                    <p>③ 该宫本宫星 <b>{chart.zhifuStar}</b> 为值符（总指挥），本宫门 <b>{chart.zhifuGate}</b> 为值使（执行官）。</p>
                  </Teach>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-[#a89f8a]">
                    {['甲子→戊', '甲戌→己', '甲申→庚', '甲午→辛', '甲辰→壬', '甲寅→癸'].map((s) => (
                      <span key={s} className={`rounded border px-2 py-1 text-center ${s.startsWith(chart.xun) ? 'border-[#c9a962] text-[#e3c98a]' : 'border-[#32281a]'}`}>{s}</span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#6f6a58]">六甲旬首遁仪表（当前旬高亮）</p>
                  {zone(3)}
                </StepCard>

                {/* ④ 转天盘 */}
                <StepCard step={STEPS[3]} open={isOpen(4)} onToggle={() => toggle(4)} ask={askFor(4)}>
                  <Teach title="这一步怎么转？">
                    <p>值符星加时干：时干 <b>{gz.hour[0] === '甲' ? `甲（看旬首仪${chart.xunYi}）` : gz.hour[0]}</b> 在地盘 {PALACE[chart.zhifuDstPalace].name}，值符{chart.zhifuStar}携地盘干转到此宫。</p>
                    <p>{chart.starFuyin ? '本局九星未动——星伏吟：天时未开，主静守迟滞。' : chart.starFanyin ? '值符落到对冲宫——星反吟：主变动反复。' : '其余八星按转盘环形顺序同步转动，各带本宫地盘干作为天盘干。'}</p>
                  </Teach>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {chart.palaces.filter((p) => p.num !== 5).map((p) => (
                      <span key={p.num} className="rounded border border-[#32281a] px-2 py-1 text-[#a89f8a]">
                        {p.star} → {PALACE[p.num].name}（带干{p.tianGan}）
                      </span>
                    ))}
                  </div>
                  {zone(4)}
                </StepCard>

                {/* ⑤ 布八门 */}
                <StepCard step={STEPS[4]} open={isOpen(5)} onToggle={() => toggle(5)} ask={askFor(5)}>
                  <Teach title="这一步怎么排？">
                    <p>值使{chart.zhifuGate}从{PALACE[chart.zhifuSrcPalace].name}起{chart.xun[1]}时，{chart.dun === '阳' ? '顺' : '逆'}飞至{gz.hourBranch}时落宫；其余七门按「休生伤杜景死惊开」环形顺布。</p>
                    <p>{chart.gateFuyin ? '本局八门归本宫——门伏吟：主静、拖延。' : chart.gateFanyin ? '八门对冲——门反吟：主速变反复。' : ''}</p>
                  </Teach>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {chart.palaces.filter((p) => p.num !== 5).map((p) => (
                      <span key={p.num} className={`rounded border px-2 py-1 ${p.flags.some((f) => f.includes('门迫')) ? 'border-red-400/40 text-red-300' : 'border-[#32281a] text-[#a89f8a]'}`}>
                        {p.gate} 落 {PALACE[p.num].name}（{GATE_OF[p.gate]?.element}门/{PALACE[p.num].element}宫）{p.flags.some((f) => f.includes('门迫')) ? '⚠门迫' : ''}
                      </span>
                    ))}
                  </div>
                  {zone(5)}
                </StepCard>

                {/* ⑥ 布八神 */}
                <StepCard step={STEPS[5]} open={isOpen(6)} onToggle={() => toggle(6)} ask={askFor(6)}>
                  <Teach title="这一步怎么布？">
                    <p>值符神永远跟着值符星走，落在 {PALACE[chart.zhifuDstPalace].name}；其余七神按{chart.dun === '阳' ? '顺时针' : '逆时针'}（{chart.dun}遁）依次排入转盘八宫。</p>
                  </Teach>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {EIGHT_GODS_ROW.map((g) => {
                      const pl = findPalace('god', g);
                      const d = GOD_DESC[g];
                      return (
                        <span key={g} className={`rounded border px-2 py-1 ${g === '值符' ? 'border-[#c9a962] text-[#e3c98a]' : 'border-[#32281a] text-[#a89f8a]'}`}>
                          {g} → {pl ? PALACE[pl.num].name : '—'}（{d.nature}：{d.desc.slice(0, 12)}…）
                        </span>
                      );
                    })}
                  </div>
                  {zone(6)}
                </StepCard>

                {/* ⑦ 标注 */}
                <StepCard step={STEPS[6]} open={isOpen(7)} onToggle={() => toggle(7)} ask={askFor(7)}>
                  <Teach title="这一步看什么？">
                    <p>空亡=日柱旬空支所到之宫，主虚、待出空；马星=时支三合马所在宫，主快动；击刑/入墓/门迫=盘面的「伤」，吉格带伤要打折。</p>
                  </Teach>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-[#a89f8a]">空亡宫：{chart.palaces.filter((p) => p.kong).map((p) => PALACE[p.num].name).join('、') || '无'}</p>
                    <p className="text-[#a89f8a]">马星宫：{chart.palaces.filter((p) => p.horse).map((p) => PALACE[p.num].name).join('、') || '无'}</p>
                    {chart.palaces.flatMap((p) => p.flags.map((f) => (
                      <p key={p.num + f} className="text-red-300">{PALACE[p.num].name}：{f}</p>
                    )))}
                    {!chart.palaces.some((p) => p.flags.length) && <p className="text-[#6f6a58]">无击刑/入墓/门迫（盘面无伤）</p>}
                  </div>
                  {zone(7)}
                </StepCard>

                {/* ⑧ 取用神 */}
                <StepCard step={STEPS[7]} open={isOpen(8)} onToggle={() => toggle(8)} ask={askFor(8)}>
                  <Teach title="这一步怎么取？">
                    <p>总纲：<b>日干为求测人，时干为所测事</b>（《遁甲演义》）。再看专项用神——当前类别「{catDef.label}」：{catDef.rule}</p>
                  </Teach>
                  <div className="space-y-1 text-[11px] text-[#a89f8a]">
                    <p>日干 <b className="text-[#e3c98a]">{gz.dayStem}</b>（{STEM_ELEMENT[gz.dayStem]}）天盘落 {dayStemPalace ? PALACE[dayStemPalace.num].name : '—'}（求测人处境：{dayStemPalace ? `${dayStemPalace.star}·${dayStemPalace.gate}·${dayStemPalace.god}` : ''}）</p>
                    <p>时干 <b className="text-[#e3c98a]">{gz.hour[0]}</b>（{STEM_ELEMENT[gz.hour[0]]}）天盘落 {hourStemPalace ? PALACE[hourStemPalace.num].name : '—'}（事情本身：{hourStemPalace ? `${hourStemPalace.star}·${hourStemPalace.gate}·${hourStemPalace.god}` : ''}）</p>
                    {category === 'shiye' && <p>开门落 {findPalace('gate', '开门') ? PALACE[findPalace('gate', '开门')!.num].name : '—'}（事业/单位）</p>}
                    {category === 'caiyun' && <p>生门落 {findPalace('gate', '生门') ? PALACE[findPalace('gate', '生门')!.num].name : '—'}（财利）；戊落 {findPalace('tianGan', '戊') ? PALACE[findPalace('tianGan', '戊')!.num].name : '—'}（本钱）</p>}
                    {category === 'ganqing' && <p>乙（女方）落 {findPalace('tianGan', '乙') ? PALACE[findPalace('tianGan', '乙')!.num].name : '—'}；庚（男方）落 {findPalace('tianGan', '庚') ? PALACE[findPalace('tianGan', '庚')!.num].name : '—'}；六合落 {findPalace('god', '六合') ? PALACE[findPalace('god', '六合')!.num].name : '—'}</p>}
                    {category === 'jiankang' && <p>天芮（病）落 {findPalace('star', '天芮') ? PALACE[findPalace('star', '天芮')!.num].name : '—'}；乙（医）落 {findPalace('tianGan', '乙') ? PALACE[findPalace('tianGan', '乙')!.num].name : '—'}</p>}
                    {category === 'xueye' && <p>丁（文章）落 {findPalace('tianGan', '丁') ? PALACE[findPalace('tianGan', '丁')!.num].name : '—'}；景门落 {findPalace('gate', '景门') ? PALACE[findPalace('gate', '景门')!.num].name : '—'}</p>}
                  </div>
                  {zone(8)}
                </StepCard>

                {/* ⑨ 看格局 */}
                <StepCard step={STEPS[8]} open={isOpen(9)} onToggle={() => toggle(9)} ask={askFor(9)}>
                  <Teach title="这一步怎么判？">
                    <p>先扫大信号（伏吟/反吟/五不遇时），再查经典吉凶格。格局成立还要看带不带伤（空亡/击刑/入墓/门迫会打折）。</p>
                  </Teach>
                  {chart.geju.length ? (
                    <div className="space-y-1">
                      {chart.geju.map((g) => (
                        <p key={g} className={`text-[11px] leading-relaxed rounded px-2 py-1.5 border ${/伏吟|反吟|五不遇/.test(g) ? 'border-amber-400/30 text-amber-300 bg-amber-400/5' : 'border-emerald-400/25 text-emerald-300 bg-emerald-400/5'}`}>{g}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#6f6a58]">本局未命中经典格局，以用神生克旺衰直断。</p>
                  )}
                  {zone(9)}
                </StepCard>

                {/* ⑩ 门派拓展 */}
                <StepCard step={STEPS[9]} open={isOpen(10)} onToggle={() => toggle(10)} ask={askFor(10)}>
                  <Teach title="转盘之外还有什么？">
                    <p>本工具用的是时家转盘（张志春体系，最主流）。江湖与传承上还有：阴盘奇门（重象意直读与化解）、飞盘奇门（九星逐宫飞布而非整体转）、年家/月家/日家奇门（换时间尺度）、法术奇门（择方择时与行为调整）。下面实战区逐条对比。</p>
                  </Teach>
                  {zone(10)}
                </StepCard>

                {/* ⑪ 综合断局 */}
                <StepCard step={STEPS[10]} open={isOpen(11)} onToggle={() => toggle(11)} ask={askFor(11)}>
                  <AiVerdict
                    systemPrompt={buildQimenReadingPrompt()}
                    guaContext={ctx}
                    title="AI 完整断局（总览 / 人与事 / 用神 / 格局 / 应期 / 方位 / 决策）"
                    intro="前面十步是排盘与规则的逐项推演。点击下方按钮，AI 会以《烟波钓叟歌》《遁甲演义》《神奇之门》等为依据，把整局串成小白能懂的完整断局：事情走向、应期节奏、方位与行动建议。"
                    buttonText="生成 AI 完整断局"
                    askText="请基于以上奇门局数据，对我所问之事做完整断局（含应期与方位建议）。"
                  />
                  {zone(11)}
                </StepCard>
              </div>
            </section>

            <section className="panel p-4">
              <div className="section-head"><span className="num text-base">肆</span><span className="title">复盘本 · 应验追踪</span></div>
              <Notebook type="qimen" makeCurrent={makeNoteDraft} onLoad={loadNote} />
            </section>

            <footer className="text-[10px] text-[#6f6a58] leading-relaxed border-t border-[#3a2f1e] pt-3 pb-6">
              说明：本工具为时家转盘奇门（拆补法定局、天禽寄坤二宫、值使随时支飞宫），排盘与取用依据{QIMEN_BOOKS.map((b) => b.name).join('、')}；
              节气采用通用近似公式（误差±1天），交节当日请自行核对遁别与局数。奇门遁甲是古人的时空决策模型，供学习研究参考，具体抉择以现实条件为准。
            </footer>

            {/* 全局助教 */}
            {tutorOpen ? (
              <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#c9a962]/30">
                <div className="flex items-center justify-between bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] px-3.5 py-2.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 tracking-wider"><GraduationCap size={14} /> 奇门助教 · AI</span>
                  <button onClick={() => setTutorOpen(false)}><X size={15} /></button>
                </div>
                <TutorPanel
                  systemPrompt={buildQimenSystemPrompt()}
                  guaContext={ctx}
                  placeholder="就当前奇门局或转盘/门派知识自由提问…"
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
            输入有误，无法起局，请检查起局时间。
          </div>
        )}
      </div>
    </main>
  );
}

// 供研习页展示的速查行（九星/八门原位表）
export const QIMEN_REFERENCE = {
  stars: NINE_STARS_ROW,
  gates: EIGHT_GATES_ROW,
};
