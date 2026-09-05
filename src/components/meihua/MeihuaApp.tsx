// 梅花易数教学页：七种起卦法 + 本互变三卦 + 十步研习工作流 + AI 综合断卦 + 复盘本
// 体系：《梅花易数》（托名邵雍）—— 先天卦数起卦、体用生克、卦气旺衰、万物类象
import { useMemo, useState } from 'react';
import {
  paipanMeihua, deriveFromTime, deriveFromNumbers, deriveFromDigitString,
  deriveFromText, deriveFromSound, deriveFromWaiying,
} from '../../lib/meihua/engine';
import type { MeihuaChart, QiGuaResult } from '../../lib/meihua/engine';
import { QI_METHODS, XIANTIAN, TRIGRAM_IMAGE, TRIGRAM_IMAGE as IMG } from '../../lib/meihua/constants';
import { MEIHUA_STEP_KNOWLEDGE } from '../../lib/meihua/knowledge';
import { buildMeihuaContext, buildMeihuaSystemPrompt, buildMeihuaReadingPrompt, MEIHUA_BOOKS } from '../../lib/meihua/tutorContext';
import { computeGanZhi } from '../../lib/liuyao/calendar';
import { BRANCHES, TRIGRAM_ELEMENT } from '../../lib/liuyao/constants';
import type { Element5 } from '../../lib/liuyao/constants';
import { HexagramFigure } from '../liuyao/YaoStroke';
import { StepZones } from '../StepZones';
import { StepAsk, TutorPanel, AiVerdict } from '../liuyao/TutorChat';
import { SolarTimeInput, type PlaceSel } from '../geo/SolarTimeInput';
import { Notebook } from '../Notebook';
import type { NoteRecord, MeihuaPayload } from '../../lib/notebook';
import { cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf } from '../../lib/geo/solarTime';
import {
  ChevronDown, ChevronRight, GraduationCap, X, BookOpen,
} from 'lucide-react';

const ELEM_COLOR: Record<Element5, string> = { 木: '#6fbf73', 火: '#e57373', 土: '#d4a24e', 金: '#c9c9c9', 水: '#64b5f6' };
const TONE_CLS = { 吉: 'text-emerald-300', 凶: 'text-red-300', 平: 'text-[#b0a78c]' } as const;

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
  { no: 1, title: '起卦', subtitle: '先天卦数 · 七种起法' },
  { no: 2, title: '排本卦', subtitle: '上下卦 · 定动爻' },
  { no: 3, title: '排变卦', subtitle: '动爻阴阳互变' },
  { no: 4, title: '排互卦', subtitle: '二三四 · 三四五爻' },
  { no: 5, title: '分体用', subtitle: '动爻所在为用' },
  { no: 6, title: '体用生克', subtitle: '五关系 · 吉凶总诀' },
  { no: 7, title: '卦气旺衰', subtitle: '月令五行 · 旺相休囚死' },
  { no: 8, title: '类象取事', subtitle: '万物类象 · 对号入座' },
  { no: 9, title: '应期推断', subtitle: '卦数法 · 旺衰迟速' },
  { no: 10, title: '综合断卦', subtitle: 'AI 完整解读 · 结局与建议' },
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

/** 三卦并排展示：本卦 / 互卦 / 变卦 */
function GuaTrio({ chart }: { chart: MeihuaChart }) {
  const items: { key: string; title: string; view: { name: string; upper: string; lower: string; bits: number[] }; note: string; moving?: boolean }[] = [
    { key: 'ben', title: '本卦（现状）', view: chart.ben, note: '事情当下的格局', moving: true },
    { key: 'hu', title: '互卦（过程）', view: chart.hu, note: chart.hu.note },
    { key: 'bian', title: '变卦（结局）', view: chart.bian, note: '动爻阴阳互变而得' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
      {items.map((it) => {
        const isTiUpper = it.key === 'ben' ? chart.tiIsUpper : null;
        return (
          <div key={it.key} className="rounded-lg border border-[#3a2f1e] bg-[#17140f] p-3 text-center">
            <div className="text-[10px] text-[#8d8670] mb-1">{it.title}</div>
            <div className="flex justify-center py-1">
              <HexagramFigure bits={it.view.bits} movingIdx={it.moving ? [chart.moving - 1] : []} size="lg" />
            </div>
            <div className="mt-1.5 text-sm font-bold text-[#ecdfc0]" style={{ fontFamily: '"Songti SC",serif' }}>{it.view.name}</div>
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px]">
              <span style={{ color: ELEM_COLOR[TRIGRAM_ELEMENT[it.view.upper]] }}>{it.view.upper}({TRIGRAM_ELEMENT[it.view.upper]})</span>
              {isTiUpper !== null && (
                <span className={`rounded px-1 ${isTiUpper ? 'bg-[#c9a962]/20 text-[#e3c98a]' : 'bg-[#4a3a2a]/40 text-[#8d8670]'}`}>
                  {isTiUpper ? '体' : '用'}
                </span>
              )}
              <span className="text-[#6f6a58]">上</span>
              <span className="text-[#6f6a58]">/</span>
              <span className="text-[#6f6a58]">下</span>
              {isTiUpper !== null && (
                <span className={`rounded px-1 ${!isTiUpper ? 'bg-[#c9a962]/20 text-[#e3c98a]' : 'bg-[#4a3a2a]/40 text-[#8d8670]'}`}>
                  {!isTiUpper ? '体' : '用'}
                </span>
              )}
              <span style={{ color: ELEM_COLOR[TRIGRAM_ELEMENT[it.view.lower]] }}>{it.view.lower}({TRIGRAM_ELEMENT[it.view.lower]})</span>
            </div>
            <div className="mt-1 text-[9px] text-[#6f6a58] leading-relaxed">{it.note}</div>
          </div>
        );
      })}
    </div>
  );
}

/** 类象卡（单个卦的万物类象） */
function ImageCard({ gua, tag }: { gua: string; tag: string }) {
  const img = TRIGRAM_IMAGE[gua];
  if (!img) return null;
  return (
    <div className="rounded-lg border border-[#3a2f1e] bg-[#17140f] p-2.5">
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-sm font-bold" style={{ color: ELEM_COLOR[img.element], fontFamily: '"Songti SC",serif' }}>{gua}</span>
        <span className="text-[10px] text-[#8d8670]">{img.element} · 卦德「{img.nature}」 · {tag}</span>
      </div>
      <div className="text-[10px] leading-relaxed text-[#a89f8a] space-y-0.5">
        <p>人物：{img.person}</p>
        <p>事物：{img.thing}</p>
        <p>方位：{img.direction} · 主时：{img.season} · 色：{img.color}</p>
        <p>身体：{img.body}</p>
      </div>
    </div>
  );
}

const inputCls = 'input-dark w-full px-3 py-2 text-sm';
const labelCls = 'block text-xs font-semibold text-[#c8bd9c] mb-1';
const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export function MeihuaApp() {
  const [method, setMethod] = useState('time');
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTime());
  const [place, setPlace] = useState<PlaceSel | null>(null);
  // 各起法参数
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [addHour, setAddHour] = useState(true);
  const [digits, setDigits] = useState('');
  const [textMode, setTextMode] = useState<'single' | 'double'>('single');
  const [strokes1, setStrokes1] = useState('');
  const [strokes2, setStrokes2] = useState('');
  const [soundCount, setSoundCount] = useState('');
  const [waiyingGua, setWaiyingGua] = useState('乾');
  const [waiyingAdd, setWaiyingAdd] = useState<'hour' | 'num'>('hour');
  const [waiyingNum, setWaiyingNum] = useState('');
  const [manualUpper, setManualUpper] = useState('兑');
  const [manualLower, setManualLower] = useState('乾');
  const [manualMoving, setManualMoving] = useState(4);
  const [question, setQuestion] = useState('');
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));
  const [tutorOpen, setTutorOpen] = useState(false);

  const methodDef = QI_METHODS.find((m) => m.id === method) ?? QI_METHODS[0];

  /** 校正后的起卦时刻（真太阳时可选）与干支 */
  const base = useMemo(() => {
    const d = dateTimeOf(date, time);
    if (!d) return null;
    const corrected = place ? solarCorrection(d, cityAt(place.prov, place.city).lng).corrected : d;
    const gz = computeGanZhi(corrected);
    return { gz, hourNum: BRANCHES.indexOf(gz.hourBranch as never) + 1, monthBranch: gz.monthBranch };
  }, [date, time, place]);

  /** 按当前起法推导 上卦数/下卦数/动爻 */
  const qi = useMemo<QiGuaResult | null>(() => {
    if (!base) return null;
    const { hourNum } = base;
    try {
      switch (method) {
        case 'time': {
          const d = dateTimeOf(date, time);
          if (!d) return null;
          const corrected = place ? solarCorrection(d, cityAt(place.prov, place.city).lng).corrected : d;
          return deriveFromTime(corrected);
        }
        case 'number2': {
          const a = Number(n1);
          if (!Number.isFinite(a) || a <= 0 || !n1.trim()) return null;
          const b = n2.trim() ? Number(n2) : null;
          if (b !== null && (!Number.isFinite(b) || b <= 0)) return null;
          return deriveFromNumbers(Math.floor(a), b !== null ? Math.floor(b) : null, addHour, hourNum);
        }
        case 'numstr':
          return deriveFromDigitString(digits);
        case 'text': {
          const s1 = Number(strokes1);
          if (!Number.isFinite(s1) || s1 <= 0 || !strokes1.trim()) return null;
          const s2 = textMode === 'double' && strokes2.trim() ? Number(strokes2) : null;
          if (textMode === 'double' && (s2 === null || !Number.isFinite(s2) || s2 <= 0)) return null;
          return deriveFromText(Math.floor(s1), s2 !== null ? Math.floor(s2) : null, hourNum);
        }
        case 'sound': {
          const c = Number(soundCount);
          if (!Number.isFinite(c) || c <= 0 || !soundCount.trim()) return null;
          return deriveFromSound(Math.floor(c), hourNum);
        }
        case 'waiying': {
          if (waiyingAdd === 'hour') return deriveFromWaiying(waiyingGua, hourNum, `时辰${base.gz.hourBranch}数`);
          const v = Number(waiyingNum);
          if (!Number.isFinite(v) || v <= 0 || !waiyingNum.trim()) return null;
          return deriveFromWaiying(waiyingGua, Math.floor(v), '所报数');
        }
        case 'manual':
          return {
            upperNum: XIANTIAN[manualUpper], lowerNum: XIANTIAN[manualLower], moving: manualMoving,
            note: `手动直排：上卦${manualUpper}=${XIANTIAN[manualUpper]}、下卦${manualLower}=${XIANTIAN[manualLower]}、第${manualMoving}爻动`,
          };
        default:
          return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [method, date, time, place, base, n1, n2, addHour, digits, textMode, strokes1, strokes2, soundCount, waiyingGua, waiyingAdd, waiyingNum, manualUpper, manualLower, manualMoving]);

  const chart = useMemo<MeihuaChart | null>(() => {
    if (!qi || !base) return null;
    try {
      return paipanMeihua(qi, base.monthBranch);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [qi, base]);

  const ctx = useMemo(
    () => (chart ? buildMeihuaContext(chart, question, methodDef.label) : ''),
    [chart, question, methodDef],
  );

  const toggle = (no: number) =>
    setOpenSteps((s) => {
      const next = new Set(s);
      if (next.has(no)) next.delete(no); else next.add(no);
      return next;
    });
  const isOpen = (no: number) => openSteps.has(no);
  const askFor = (no: number) =>
    chart ? <StepAsk stepNo={no} stepTitle={STEPS[no - 1].title} systemPrompt={buildMeihuaSystemPrompt(no)} guaContext={ctx} /> : null;
  const zone = (no: number) => <StepZones knowledge={MEIHUA_STEP_KNOWLEDGE[no]} />;

  // 复盘本
  const makeNoteDraft = () =>
    chart
      ? {
          type: 'meihua' as const,
          title: question.trim() || `${chart.ben.name}之${chart.bian.name}`,
          summary: `${methodDef.label.split('（')[0]} · ${chart.ben.name}（${chart.moving}爻动）之${chart.bian.name} · 体${chart.tiGua}用${chart.yongGua}·${chart.relation}（${chart.verdict.tone}）`,
          payload: {
            method, date, time, place,
            n1, n2, addHour, digits, strokes1, strokes2, textMode, soundCount,
            waiyingGua, manualUpper, manualLower, manualMoving, question,
          } as MeihuaPayload,
        }
      : null;
  const loadNote = (n: NoteRecord) => {
    if (n.type !== 'meihua') return;
    const p = n.payload as MeihuaPayload;
    setMethod(p.method); setDate(p.date); setTime(p.time); setPlace(p.place);
    setN1(p.n1); setN2(p.n2); setAddHour(p.addHour); setDigits(p.digits);
    setStrokes1(p.strokes1); setStrokes2(p.strokes2); setTextMode(p.textMode);
    setSoundCount(p.soundCount); setWaiyingGua(p.waiyingGua);
    setManualUpper(p.manualUpper); setManualLower(p.manualLower); setManualMoving(p.manualMoving);
    setQuestion(p.question);
  };

  const gz = base?.gz;

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden w-full">
      {/* 左：起卦输入 */}
      <aside className="panel p-4 lg:h-full lg:overflow-y-auto space-y-3">
        <div className="section-head"><span className="num text-base">壹</span><span className="title">起卦输入</span></div>

        <div>
          <label className={labelCls}>起卦方式（七种起法）</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60">
            {QI_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <div className="mt-2 rounded-lg border border-[#c9a962]/20 bg-[#201a12] px-3 py-2 space-y-1.5">
            <p className="text-[10px] leading-relaxed text-[#d4c294]"><b className="text-[#e3c98a]">经典：</b>{methodDef.classic}</p>
            <p className="text-[10px] leading-relaxed text-[#a89f8a]"><b className="text-[#c8bd9c]">怎么起：</b>{methodDef.howto}</p>
            <p className="text-[10px] leading-relaxed text-[#6f6a58]"><b>适用：</b>{methodDef.scene}</p>
          </div>
        </div>

        {/* 起卦时刻：所有起法都需要时辰数与月建（卦气），time 法还用于年月日 */}
        <SolarTimeInput
          date={date} setDate={setDate} time={time} setTime={setTime}
          place={place} setPlace={setPlace}
          optional
          placeLabel="起卦地点（选填，校正真太阳时）"
        />

        {/* 按起法切换的参数区 */}
        {method === 'number2' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>第一数（上卦）*</label>
                <input value={n1} onChange={(e) => setN1(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="随口报，如 7" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>第二数（下卦，可空）</label>
                <input value={n2} onChange={(e) => setN2(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="空=加时辰数" className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-[#a89f8a]">
              <input type="checkbox" checked={addHour} onChange={(e) => setAddHour(e.target.checked)} className="accent-[#c9a962]" />
              动爻计算加时辰数（两数都报时）
            </label>
          </div>
        )}

        {method === 'numstr' && (
          <div>
            <label className={labelCls}>数字串（车牌 / 电话 / 编号）*</label>
            <input value={digits} onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 20))} placeholder="如 13800138000" className={inputCls} />
            <p className="mt-1 text-[10px] text-[#6f6a58]">平分两段求和：前段为上卦、后段为下卦，总和取动爻；位数为奇时前段少一位。</p>
          </div>
        )}

        {method === 'text' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(['single', 'double'] as const).map((m) => (
                <button key={m} onClick={() => setTextMode(m)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${textMode === m ? 'border-[#c9a962] text-[#e3c98a] bg-[#c9a962]/10' : 'border-[#3a2f1e] text-[#8d8670]'}`}>
                  {m === 'single' ? '单字（笔画+时辰）' : '双字（各字笔画）'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{textMode === 'single' ? '该字笔画数 *' : '前字笔画数 *'}</label>
                <input value={strokes1} onChange={(e) => setStrokes1(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="楷体正笔，如 9" className={inputCls} />
              </div>
              {textMode === 'double' && (
                <div>
                  <label className={labelCls}>后字笔画数 *</label>
                  <input value={strokes2} onChange={(e) => setStrokes2(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="如 12" className={inputCls} />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[#6f6a58]">笔画以楷体正笔为准（不写连笔、不算草书）。</p>
          </div>
        )}

        {method === 'sound' && (
          <div>
            <label className={labelCls}>声音次数 *</label>
            <input value={soundCount} onChange={(e) => setSoundCount(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="闻几声即数几，如 3" className={inputCls} />
            <p className="mt-1 text-[10px] text-[#6f6a58]">声数为上卦，加时辰数为下卦（《声音占》邻夜扣门借物之例）。</p>
          </div>
        )}

        {method === 'waiying' && (
          <div className="space-y-2">
            <div>
              <label className={labelCls}>所见物象 / 方位对应之卦（上卦）</label>
              <select value={waiyingGua} onChange={(e) => setWaiyingGua(e.target.value)}
                className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60">
                {TRIGRAMS.map((g) => {
                  const im = IMG[g];
                  return <option key={g} value={g}>{g}（{im.direction} · {im.person.split('、')[0]} · {im.thing.split('、')[0]}）</option>;
                })}
              </select>
            </div>
            <div className="flex gap-2">
              {([['hour', '加时辰数'], ['num', '加所报数']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setWaiyingAdd(v)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${waiyingAdd === v ? 'border-[#c9a962] text-[#e3c98a] bg-[#c9a962]/10' : 'border-[#3a2f1e] text-[#8d8670]'}`}>
                  {l}
                </button>
              ))}
            </div>
            {waiyingAdd === 'num' && (
              <div>
                <label className={labelCls}>所报数 *</label>
                <input value={waiyingNum} onChange={(e) => setWaiyingNum(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="如 5" className={inputCls} />
              </div>
            )}
          </div>
        )}

        {method === 'manual' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>上卦</label>
                <select value={manualUpper} onChange={(e) => setManualUpper(e.target.value)} className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-2 text-sm text-[#e8e1cd]">
                  {TRIGRAMS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>下卦</label>
                <select value={manualLower} onChange={(e) => setManualLower(e.target.value)} className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-2 text-sm text-[#e8e1cd]">
                  {TRIGRAMS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>动爻</label>
                <select value={manualMoving} onChange={(e) => setManualMoving(Number(e.target.value))} className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-2 py-2 text-sm text-[#e8e1cd]">
                  {[1, 2, 3, 4, 5, 6].map((v) => <option key={v} value={v}>{['初', '二', '三', '四', '五', '上'][v - 1]}爻</option>)}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-[#6f6a58]">录入书上卦例或复盘旧课时使用。月建仍按上方日期取（卦气旺衰用）。</p>
          </div>
        )}

        <div>
          <label className={labelCls}>所问何事（具体问题）</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="如：这次面试能过吗？ / 丢失的钥匙能找到吗？"
            className="w-full border border-[#3a2f1e] rounded-md bg-[#131008] px-3 py-2 text-sm text-[#e8e1cd] focus:outline-none focus:border-[#c9a962]/60 resize-none"
          />
          <p className="mt-1 text-[10px] text-[#6f6a58]">梅花不设固定用神——取用靠体用与万物类象，问题会直接进入 AI 断卦上下文。</p>
        </div>

        <div className="border-t border-[#3a2f1e]/60 pt-2.5">
          <p className="text-[10px] text-[#6f6a58] leading-relaxed">
            体系：《梅花易数》先天卦数起卦（乾1兑2离3震4巽5坎6艮7坤8）。心动即占，一卦只断一事；年月日时法自动做公历→农历换算。
          </p>
        </div>
      </aside>

      {/* 右：卦象 + 研习工作流 */}
      <div className="space-y-5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        {chart && gz ? (
          <>
            <section className="panel p-4">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <div className="section-head !mb-0">
                  <span className="num text-base">贰</span>
                  <span className="title">梅花卦 · {chart.ben.name}之{chart.bian.name}</span>
                </div>
                <div className="text-xs text-[#8d8670]">
                  {gz.year}年 {gz.month}月 {gz.day}日 {gz.hour}时 · {methodDef.label.split('（')[0]}
                </div>
              </div>
              {question.trim() && (
                <div className="mb-3 text-xs text-[#c8bd9c] bg-[#201a12] border border-[#32281a] rounded px-3 py-1.5">
                  <b>所问：</b>{question.trim()}
                </div>
              )}
              <GuaTrio chart={chart} />
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px]">
                <span className={TONE_CLS[chart.verdict.tone]}>
                  体用关系：{chart.relation}（{chart.verdict.tone}）
                </span>
                <span className="text-[#6f6a58]">体={chart.tiGua}({chart.tiElement}){chart.tiWang} · 用={chart.yongGua}({chart.yongElement}){chart.yongWang}</span>
                <span className="text-[#6f6a58]">应期卦数 {chart.yingqiNum}</span>
              </div>
              <div className="mt-2 text-center text-[11px] text-[#a89f8a]">{chart.verdict.text}</div>
            </section>

            <section>
              <div className="section-head !mb-1"><span className="num text-base">叁</span><span className="title">十步研习工作流</span></div>
              <p className="text-[10px] text-[#6f6a58] mb-3">每步三块内容：「这一步怎么推」绿色教学框 · 「经典区」典籍原文+白话解读 · 「实战区」门派用法与补充</p>

              <div className="space-y-3">
                {/* ① 起卦 */}
                <StepCard step={STEPS[0]} open={isOpen(1)} onToggle={() => toggle(1)} ask={askFor(1)}>
                  <Teach title="这一步怎么起？">
                    <p>梅花的数都归于<b>先天卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8</b>。任何起法都是把「当时得到的数」÷8 取余定卦、÷6 取余定动爻（余 0 作 8 坤 / 作 6 上爻）。</p>
                    <p>当前用「{methodDef.label}」：{methodDef.howto}</p>
                  </Teach>
                  <div className="text-xs text-[#d4c294] bg-[#201a12] border border-[#32281a] rounded px-3 py-2 leading-relaxed">{chart.lines[0]}</div>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-[#a89f8a]">
                    {TRIGRAMS.map((g) => (
                      <span key={g} className="rounded border border-[#32281a] px-2 py-1 text-center">{XIANTIAN[g]} {g}({TRIGRAM_ELEMENT[g]})</span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-[#6f6a58] text-center">先天卦数表（数 ÷8 的余数 → 卦）</p>
                  {zone(1)}
                </StepCard>

                {/* ② 排本卦 */}
                <StepCard step={STEPS[1]} open={isOpen(2)} onToggle={() => toggle(2)} ask={askFor(2)}>
                  <Teach title="这一步怎么排？">
                    <p>上卦数 {chart.ben.upper === '坤' ? 8 : XIANTIAN[chart.ben.upper]}→<b>{chart.ben.upper}</b> 放上三爻，下卦数 {chart.ben.lower === '坤' ? 8 : XIANTIAN[chart.ben.lower]}→<b>{chart.ben.lower}</b> 放下三爻，合为六画重卦「<b>{chart.ben.name}</b>」；总取动爻得第 <b>{chart.moving}</b> 爻动（图中 O/X 标处）。</p>
                    <p>动爻是全卦的「事机」——它决定体用归属，也决定变卦。</p>
                  </Teach>
                  <div className="flex justify-center py-1"><HexagramFigure bits={chart.ben.bits} movingIdx={[chart.moving - 1]} size="lg" /></div>
                  <p className="text-center text-sm font-bold text-[#ecdfc0]" style={{ fontFamily: '"Songti SC",serif' }}>{chart.ben.name} · 第{chart.moving}爻动</p>
                  {zone(2)}
                </StepCard>

                {/* ③ 排变卦 */}
                <StepCard step={STEPS[2]} open={isOpen(3)} onToggle={() => toggle(3)} ask={askFor(3)}>
                  <Teach title="这一步怎么变？">
                    <p>动爻阴阳互变：第 {chart.moving} 爻{chart.ben.bits[chart.moving - 1] ? '阳变阴' : '阴变阳'}，其余五爻不动，得变卦「<b>{chart.bian.name}</b>」（上{chart.bian.upper}·下{chart.bian.lower}）。</p>
                    <p><b>变卦主事情的最终结局</b>——断卦时变卦与体卦的生克是收官依据。</p>
                  </Teach>
                  <div className="flex items-center justify-center gap-4 py-1">
                    <div className="text-center">
                      <HexagramFigure bits={chart.ben.bits} movingIdx={[chart.moving - 1]} size="md" />
                      <p className="mt-1 text-[10px] text-[#8d8670]">本卦 {chart.ben.name}</p>
                    </div>
                    <span className="text-[#c9a962] text-lg">→</span>
                    <div className="text-center">
                      <HexagramFigure bits={chart.bian.bits} size="md" />
                      <p className="mt-1 text-[10px] text-[#e3c98a]">变卦 {chart.bian.name}</p>
                    </div>
                  </div>
                  {zone(3)}
                </StepCard>

                {/* ④ 排互卦 */}
                <StepCard step={STEPS[3]} open={isOpen(4)} onToggle={() => toggle(4)} ask={askFor(4)}>
                  <Teach title="这一步怎么取？">
                    <p>取本卦<b>二三四爻为下互（{chart.hu.lower}）、三四五爻为上互（{chart.hu.upper}）</b>，合为互卦「<b>{chart.hu.name}</b>」。初爻与上爻不入互卦——起讫两端是事与外的交界。</p>
                    <p><b>互卦主事情的发展过程与内里隐情</b>，是「正应」之外的第一层补充（《十应论》之互应）。</p>
                  </Teach>
                  <div className="flex items-center justify-center gap-4 py-1">
                    <div className="text-center">
                      <HexagramFigure bits={chart.ben.bits} size="md" />
                      <p className="mt-1 text-[10px] text-[#8d8670]">本卦（取中间四爻）</p>
                    </div>
                    <span className="text-[#c9a962] text-lg">⇒</span>
                    <div className="text-center">
                      <HexagramFigure bits={chart.hu.bits} size="md" />
                      <p className="mt-1 text-[10px] text-[#e3c98a]">互卦 {chart.hu.name}</p>
                    </div>
                  </div>
                  {zone(4)}
                </StepCard>

                {/* ⑤ 分体用 */}
                <StepCard step={STEPS[4]} open={isOpen(5)} onToggle={() => toggle(5)} ask={askFor(5)}>
                  <Teach title="这一步怎么分？">
                    <p>铁律：<b>动爻所在的经卦为「用」，不动的经卦为「体」</b>。本卦动爻在第 {chart.moving} 爻，{chart.moving > 3 ? '在上卦，故上卦为用、下卦为体' : '在下卦，故下卦为用、上卦为体'}。</p>
                    <p>体=<b style={{ color: ELEM_COLOR[chart.tiElement] }}>{chart.tiGua}（{chart.tiElement}）</b>——求测人 / 事之主；用=<b style={{ color: ELEM_COLOR[chart.yongElement] }}>{chart.yongGua}（{chart.yongElement}）</b>——所问之事 / 对方 / 外境。</p>
                  </Teach>
                  <GuaTrio chart={chart} />
                  {zone(5)}
                </StepCard>

                {/* ⑥ 体用生克 */}
                <StepCard step={STEPS[5]} open={isOpen(6)} onToggle={() => toggle(6)} ask={askFor(6)}>
                  <Teach title="这一步怎么断？">
                    <p>以体为「我」，看用对体的五行关系，全梅花只此五式：<b>用生体（大吉）· 比和（吉）· 体克用（小吉）· 体生用（耗泄小凶）· 用克体（大凶）</b>。</p>
                  </Teach>
                  <div className={`rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                    chart.verdict.tone === '吉' ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300'
                    : chart.verdict.tone === '凶' ? 'border-red-400/30 bg-red-400/5 text-red-300'
                    : 'border-[#6b6353] bg-[#1a1710] text-[#c8bd9c]'
                  }`}>
                    <b>{chart.relation}</b>：{chart.verdict.text}
                  </div>
                  <p className="mt-2 text-[10px] text-[#6f6a58]">体卦五行{chart.tiElement} · 用卦五行{chart.yongElement}。互卦、变卦与体卦的生克同理类推（过程与结局）。</p>
                  {zone(6)}
                </StepCard>

                {/* ⑦ 卦气旺衰 */}
                <StepCard step={STEPS[6]} open={isOpen(7)} onToggle={() => toggle(7)} ask={askFor(7)}>
                  <Teach title="这一步怎么看？">
                    <p>月建 <b>{chart.monthBranch}</b> 属<b>{chart.season}</b>（{chart.season === '四季月' ? '土' : ''}令）：当令者旺、令生者相、生令者休、克令者囚、令克者死。</p>
                    <p>体卦{chart.tiGua}({chart.tiElement}) → <b>{chart.tiWang}</b>；用卦{chart.yongGua}({chart.yongElement}) → <b>{chart.yongWang}</b>。<b>体旺方能担事、体弱吉也打折</b>；用旺则事情势大，用衰则事情难成气候。</p>
                  </Teach>
                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                    {(['旺', '相', '休', '囚', '死'] as const).map((w) => (
                      <span key={w} className={`rounded border px-1 py-1 ${
                        chart.tiWang === w || chart.yongWang === w ? 'border-[#c9a962] text-[#e3c98a]' : 'border-[#32281a] text-[#6f6a58]'
                      }`}>
                        {w}
                        {chart.tiWang === w && '·体'}
                        {chart.yongWang === w && chart.yongWang !== chart.tiWang && '·用'}
                        {chart.yongWang === w && chart.yongWang === chart.tiWang && ''}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-[#6f6a58] text-center">{chart.season}令五行旺衰（体用落位高亮）</p>
                  {zone(7)}
                </StepCard>

                {/* ⑧ 类象取事 */}
                <StepCard step={STEPS[7]} open={isOpen(8)} onToggle={() => toggle(8)} ask={askFor(8)}>
                  <Teach title="这一步怎么取？">
                    <p>体用生克定吉凶之后，<b>具体「应什么事、应什么人」靠万物类象</b>：从体卦、用卦、互卦、变卦的人物/事物/方位/身体里，挑与所问之事贴切的象来读。下方面板是本卦相关各卦的类象速查。</p>
                  </Teach>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ImageCard gua={chart.tiGua} tag={`体卦·${chart.ben.name.includes(chart.tiGua) ? '本卦' : ''}`} />
                    <ImageCard gua={chart.yongGua} tag="用卦·所问之事" />
                    <ImageCard gua={chart.hu.upper} tag="互卦上·过程" />
                    <ImageCard gua={chart.bian.upper === chart.bian.lower ? chart.bian.upper : (chart.moving > 3 ? chart.bian.lower : chart.bian.upper)} tag="变卦动处之卦·结局" />
                  </div>
                  {zone(8)}
                </StepCard>

                {/* ⑨ 应期推断 */}
                <StepCard step={STEPS[8]} open={isOpen(9)} onToggle={() => toggle(9)} ask={askFor(9)}>
                  <Teach title="这一步怎么推？">
                    <p>经典卦数法：<b>主卦上数{chart.ben.upper === '坤' ? 8 : XIANTIAN[chart.ben.upper]}＋下数{chart.ben.lower === '坤' ? 8 : XIANTIAN[chart.ben.lower]}＋动爻数{chart.moving}＝{chart.yingqiNum}</b>，此数可应日、应月、应年（视事情大小定单位）。</p>
                    <p>迟速看旺衰：体卦{chart.tiWang}、用卦{chart.yongWang}——<b>旺则应速、衰则应迟</b>；用生体而体旺者，事常应期而至；体衰受克者，多延缓或不成。互卦数、变卦数可推中间节点与收官之时（见经典区）。</p>
                  </Teach>
                  <div className="flex justify-center gap-3 text-center">
                    {[
                      { label: '主卦数（总）', v: chart.yingqiNum },
                      { label: '互卦数', v: (chart.hu.upper === '坤' ? 8 : XIANTIAN[chart.hu.upper]) + (chart.hu.lower === '坤' ? 8 : XIANTIAN[chart.hu.lower]) },
                      { label: '变卦数', v: (chart.bian.upper === '坤' ? 8 : XIANTIAN[chart.bian.upper]) + (chart.bian.lower === '坤' ? 8 : XIANTIAN[chart.bian.lower]) },
                    ].map((x) => (
                      <div key={x.label} className="rounded-lg border border-[#3a2f1e] bg-[#17140f] px-4 py-2">
                        <div className="text-lg font-bold text-[#e3c98a]" style={{ fontFamily: '"Songti SC",serif' }}>{x.v}</div>
                        <div className="text-[9px] text-[#6f6a58]">{x.label}</div>
                      </div>
                    ))}
                  </div>
                  {zone(9)}
                </StepCard>

                {/* ⑩ 综合断卦 */}
                <StepCard step={STEPS[9]} open={isOpen(10)} onToggle={() => toggle(10)} ask={askFor(10)}>
                  <AiVerdict
                    systemPrompt={buildMeihuaReadingPrompt()}
                    guaContext={ctx}
                    title="AI 完整断卦（成象 / 体用 / 互变 / 类象 / 应期 / 建议）"
                    intro="前面九步是起卦与规则的逐项推演。点击下方按钮，AI 会以《梅花易数》体用总诀、万物类象与卦气旺衰为依据，把整卦串成小白能懂的完整断卦：吉凶、过程、结局、应期与建议。"
                    buttonText="生成 AI 完整断卦"
                    askText="请基于以上梅花卦数据，对我所问之事做完整断卦（含过程、结局、应期与建议）。"
                  />
                  {zone(10)}
                </StepCard>
              </div>
            </section>

            <section className="panel p-4">
              <div className="section-head"><span className="num text-base">肆</span><span className="title">复盘本 · 应验追踪</span></div>
              <Notebook type="meihua" makeCurrent={makeNoteDraft} onLoad={loadNote} />
            </section>

            <footer className="text-[10px] text-[#6f6a58] leading-relaxed border-t border-[#3a2f1e] pt-3 pb-6">
              说明：本工具依据{MEIHUA_BOOKS.map((b) => b.name).join('、')}；年月日时起卦用浏览器内建中华农历换算（极少数环境不支持时按公历月日代算并注明）。
              卦气旺衰按月建五行，节气采用通用近似（误差±1天），交节当日请自行核对。梅花易数是古人取象比类的思维模型，供学习研究参考。
            </footer>

            {/* 全局助教 */}
            {tutorOpen ? (
              <section className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] shadow-2xl rounded-xl overflow-hidden border border-[#c9a962]/30">
                <div className="flex items-center justify-between bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] px-3.5 py-2.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 tracking-wider"><GraduationCap size={14} /> 梅花助教 · AI</span>
                  <button onClick={() => setTutorOpen(false)}><X size={15} /></button>
                </div>
                <TutorPanel
                  systemPrompt={buildMeihuaSystemPrompt()}
                  guaContext={ctx}
                  placeholder="就当前梅花卦或体用/类象/起法自由提问…"
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
            起卦参数不足或输入有误——请检查当前起卦方式所需的参数（带 * 为必填）。
          </div>
        )}
      </div>
    </main>
  );
}
