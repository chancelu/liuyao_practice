// 教学版工作流：九步排盘断卦，每步讲清「怎么推、为什么这么推、依据在哪」
import { useState } from 'react';
import { wangShuaiLabel } from '../../lib/liuyao/engine';
import type { PaiPan, LineInfo } from '../../lib/liuyao/engine';
import type { Interpretation } from '../../lib/liuyao/interpret';
import { HexagramFigure } from './YaoStroke';
import { ChevronDown, ChevronRight, BookOpen, GraduationCap, ScrollText } from 'lucide-react';
import { BRANCH_ELEMENT, elemRelation, LIUSHEN_ELEMENT, SEASON_WANG, CHANGSHENG_START, BRANCHES, TRIGRAM_NATURE } from '../../lib/liuyao/constants';
import { palaceWalk } from '../../lib/liuyao/teaching';
import { StepAsk } from './TutorChat';
import { buildGuaContext, buildSystemPrompt } from '../../lib/liuyao/tutorContext';

interface Step { no: number; title: string; subtitle: string }

const STEPS: Step[] = [
  { no: 1, title: '起卦成象', subtitle: '六掷成卦 · 定动变' },
  { no: 2, title: '定时定局', subtitle: '排四柱 · 定月建日辰' },
  { no: 3, title: '定宫安世应', subtitle: '归卦宫 · 安世应卦身' },
  { no: 4, title: '纳甲装卦', subtitle: '装天干地支五行' },
  { no: 5, title: '配六亲六神', subtitle: '定六亲 · 起六神' },
  { no: 6, title: '查动静参数', subtitle: '旬空月破 · 暗动反伏' },
  { no: 7, title: '取用神', subtitle: '定主辅 · 双现取舍' },
  { no: 8, title: '旺衰生克', subtitle: '日月作用 · 原忌仇' },
  { no: 9, title: '综合断卦', subtitle: '吉凶应期 · 卦义佐证' },
];

/** 课程依据框 */
function Basis({ text }: { text: string }) {
  return (
    <div className="mt-2 flex gap-1.5 items-start text-xs text-[#8a7a5c] bg-[#f8f3e6] border border-[#e8ddc0] rounded px-2 py-1.5">
      <BookOpen size={12} className="mt-0.5 shrink-0" />
      <span><span className="font-semibold">依据：</span>{text}</span>
    </div>
  );
}

/** 教学推演框：这一步是怎么算出来的 */
function Teach({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 border border-[#c9d8c5] bg-[#f2f7f0] rounded px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#4a7e5d] mb-1">
        <GraduationCap size={13} /> {title}
      </div>
      <div className="text-xs text-[#3f4a3c] space-y-1 leading-relaxed">{children}</div>
    </div>
  );
}

/** 规则歌诀框 */
function Rule({ text, note }: { text: string; note?: string }) {
  return (
    <div className="mt-2 border border-[#d9c9a8] bg-[#fbf5e8] rounded px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#9a6a3a] mb-0.5">
        <ScrollText size={12} /> 规则 · 歌诀
      </div>
      <div className="text-xs text-[#6b5330] leading-relaxed" style={{ fontFamily: '"Songti SC",serif' }}>{text}</div>
      {note && <div className="text-[10px] text-[#9a8a68] mt-0.5">{note}</div>}
    </div>
  );
}

function StepCard({ step, open, onToggle, children, ask }: { step: Step; open: boolean; onToggle: () => void; children: React.ReactNode; ask?: React.ReactNode }) {
  return (
    <div className="relative pl-12 pb-6">
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${open ? 'bg-[#b03a2e] text-white border-[#b03a2e]' : 'bg-white text-[#b03a2e] border-[#b03a2e]'}`}
          style={{ fontFamily: '"Songti SC",serif' }}>
          {step.no}
        </div>
        {step.no < 9 && <div className="w-0.5 flex-1 bg-[#d8cdb4] mt-1" />}
      </div>
      <div className={`border rounded-lg transition-colors ${open ? 'border-[#c9b98f] bg-white shadow-sm' : 'border-[#e0d6bd] bg-[#fbf8f0]'}`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <div>
            <span className="font-bold text-[#3d3428]" style={{ fontFamily: '"Songti SC",serif' }}>{step.title}</span>
            <span className="ml-2 text-xs text-[#8a7f6a]">{step.subtitle}</span>
          </div>
          {open ? <ChevronDown size={16} className="text-[#8a7f6a]" /> : <ChevronRight size={16} className="text-[#8a7f6a]" />}
        </button>
        {open && <div className="px-4 pb-4 text-sm text-[#4a4234]">{children}{ask}</div>}
      </div>
    </div>
  );
}

const KIND_STYLE = {
  ji: { label: '吉', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  xiong: { label: '凶', cls: 'bg-red-100 text-red-800 border-red-300' },
  zhong: { label: '参', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
} as const;

const VERDICT_CLS: Record<string, string> = {
  大吉: 'text-emerald-700 border-emerald-500 bg-emerald-50',
  吉: 'text-emerald-700 border-emerald-400 bg-emerald-50',
  小吉: 'text-teal-700 border-teal-400 bg-teal-50',
  平: 'text-stone-600 border-stone-400 bg-stone-50',
  小凶: 'text-orange-700 border-orange-400 bg-orange-50',
  凶: 'text-red-700 border-red-400 bg-red-50',
  大凶: 'text-red-800 border-red-600 bg-red-50',
};

const POS_N = ['', '初', '二', '三', '四', '五', '上'];
const REL_TEXT: Record<string, string> = { same: '比和（同我）', sheng: '我生', shengBy: '生我', ke: '我克', keBy: '克我' };

export function WorkflowSteps({ p, it, yaoNames }: { p: PaiPan; it: Interpretation; yaoNames: string[] }) {
  const [openSteps, setOpenSteps] = useState<number[]>([1, 3, 7, 9]);
  const toggle = (n: number) => setOpenSteps((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const isOpen = (n: number) => openSteps.includes(n);
  const g = p.ganzhi;
  const movingLines = p.lines.filter((l) => l.moving);
  const walk = palaceWalk(p.palace, p.benGua.key);
  const mElem = BRANCH_ELEMENT[g.monthBranch];
  const guaCtx = buildGuaContext(p, it);
  const askFor = (n: number) => <StepAsk stepNo={n} stepTitle={STEPS[n - 1].title} systemPrompt={buildSystemPrompt(n)} guaContext={guaCtx} />;

  return (
    <div>
      {/* ============ 步骤 1：起卦成象 ============ */}
      <StepCard step={STEPS[0]} open={isOpen(1)} onToggle={() => toggle(1)} ask={askFor(1)}>
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <div className="text-xs text-[#8a7f6a] mb-1">本卦</div>
            <HexagramFigure bits={p.lines.map((l) => (l.yang ? 1 : 0))} movingIdx={movingLines.map((l) => l.pos - 1)} size="lg" />
            <div className="mt-1 font-bold text-lg" style={{ fontFamily: '"Songti SC",serif' }}>{p.benGua.info.name}</div>
            <div className="text-xs text-[#8a7f6a]">{p.benGua.info.slogan}</div>
          </div>
          {p.bianGua && (
            <>
              <div className="self-center text-[#b03a2e] text-xl">→</div>
              <div>
                <div className="text-xs text-[#8a7f6a] mb-1">变卦</div>
                <HexagramFigure bits={p.lines.map((l) => (l.moving ? (l.yang ? 0 : 1) : l.yang ? 1 : 0))} size="lg" />
                <div className="mt-1 font-bold text-lg" style={{ fontFamily: '"Songti SC",serif' }}>{p.bianGua.info.name}</div>
                <div className="text-xs text-[#8a7f6a]">{p.bianGua.info.slogan}</div>
              </div>
            </>
          )}
          <div className="flex-1 min-w-[220px]">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="text-[#8a7f6a] border-b border-[#e8ddc0]">
                  <th className="text-left py-1 font-normal">爻位</th>
                  <th className="text-left font-normal">掷得</th>
                  <th className="text-left font-normal">定爻</th>
                  <th className="text-left font-normal">动静</th>
                </tr>
              </thead>
              <tbody>
                {p.lines.map((l) => (
                  <tr key={l.pos} className="border-b border-[#f0e9d6]">
                    <td className="py-1">{l.posName}爻</td>
                    <td>{yaoNames[l.pos - 1]}</td>
                    <td>{l.yang ? '阳爻 ⚊' : '阴爻 ⚋'}</td>
                    <td className={l.moving ? 'text-[#b03a2e] font-semibold' : 'text-[#8a7f6a]'}>{l.moving ? `动（${l.yang ? 'O' : 'X'}）` : '静'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Teach title="这一步怎么推？">
          <p>① 三枚铜钱掷一次定一爻：看「背」的个数——一背为<b>单（少阳⚊静）</b>、两背为<b>拆（少阴⚋静）</b>、三背为<b>重（老阳⚊动O）</b>、零背三字为<b>交（老阴⚋动X）</b>。</p>
          <p>② 第一掷画在最下为初爻，第六掷在最上为上爻。初、二、三爻组成<b>内卦（下卦）＝{p.benGua.lower}（{TRIGRAM_NATURE[p.benGua.lower]}）</b>，四、五、上爻组成<b>外卦（上卦）＝{p.benGua.upper}（{TRIGRAM_NATURE[p.benGua.upper]}）</b>。</p>
          <p>③ 上下相重查六十四卦即得「{p.benGua.info.name}」（{p.benGua.upper}上{p.benGua.lower}下）。</p>
          <p>④ 老阳老阴是「物极必反」之爻，阳到极点转阴、阴到极点转阳，故称<b>动爻</b>。把动爻阴阳翻转，得变卦{p.bianGua ? `「${p.bianGua.info.name}」，读作「${p.benGua.info.name}之${p.bianGua.info.name}」` : '（本卦六爻安静，无变卦）'}。本卦表现时之象，变卦主最终变化之象。</p>
        </Teach>
        <Rule text="一个背两个字称作单为少阳；两个背一个字称作拆为少阴；三个背称作重为老阳（变爻）；三个字称作交为老阴（变爻）。共摇六次，第一次为初爻画在最下，第六次为上爻。" note="卷三·第五课摇卦起卦法。易学重意不重形，字阳背阴或字阴背阳，摇卦前定义好皆可。" />
      </StepCard>

      {/* ============ 步骤 2：定时定局 ============ */}
      <StepCard step={STEPS[1]} open={isOpen(2)} onToggle={() => toggle(2)} ask={askFor(2)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[['年柱', g.year, '以立春分岁'], ['月柱', g.month, `以${g.jieqi}节换月`], ['日柱', g.day, '历算推日'], ['时柱', g.hour, '五鼠遁起时']].map(([k, v, n]) => (
            <div key={k} className="text-center border border-[#e0d6bd] rounded py-2 bg-[#fbf8f0]">
              <div className="text-xs text-[#8a7f6a]">{k}</div>
              <div className="text-xl font-bold" style={{ fontFamily: '"Songti SC",serif' }}>{v}</div>
              <div className="text-[10px] text-[#9a8f78]">{n}</div>
            </div>
          ))}
        </div>
        <ul className="text-xs space-y-1">
          <li>· <b>月建 {g.monthBranch}</b>：卦爻提纲，操生杀之权，定旺相休囚死与月破；</li>
          <li>· <b>日辰 {g.dayBranch}</b>：定各爻生旺墓绝（十二长生），主暗动、日破、日合；</li>
          <li>· <b>日干 {g.dayStem}</b>：只用于排六神；</li>
          <li>· {g.day}日在<b>{xunText(p)}</b>，旬空在 <b>{p.kong[0]}、{p.kong[1]}</b>。</li>
        </ul>
        <Teach title="这一步怎么推？">
          <p>① <b>年柱</b>：干支历以立春为岁首——{g.jieqi === '立春' || true ? `当前${g.year[0] === '丙' ? '丙午' : g.year}年柱` : ''}；立春前出生/摇卦要归上一年。</p>
          <p>② <b>月柱</b>：不以农历初一换月，而以「节」换月——立春寅月、惊蛰卯月、清明辰月、立夏巳月、芒种午月、小暑未月、立秋申月、白露酉月、寒露戌月、立冬亥月、大雪子月、小寒丑月。摇卦时已交<b>{g.jieqi}</b>节，故月建为<b>{g.monthBranch}</b>。月干用五虎遁：甲己之年丙作首（正月丙寅起），乙庚戊寅、丙辛庚寅、丁壬壬寅、戊癸甲寅，顺推至{g.monthBranch}月得{g.month}。</p>
          <p>③ <b>时柱</b>：时支由钟点定（23-1点子时、1-3点丑时……）；时干用五鼠遁由日干起：甲己还加甲（甲子时起）、乙庚丙作初、丙辛从戊起、丁壬庚子居、戊癸壬子真途。{g.dayStem}日起{hourStart(g.dayStem)}子时，顺数至{g.hourBranch}时得{g.hour}。</p>
          <p>④ <b>旬空</b>：六十甲子分六旬，每旬十天干配十二地支必剩两支落空。{g.day}日属{xunText(p)}，本旬十日为{xunDays(p)}，故{p.kong[0]}、{p.kong[1]}二支不在旬中，为空亡。</p>
        </Teach>
        <Rule text="月建司权：月令是卦爻的提纲，操持着生杀之权；日辰当令：日辰决定卦中每一爻的旺衰，依据五行生旺墓绝衡量。节令前为上个月，一交节令后就成了下一个月。" note="卷三·第十一课；习题卷问答题53/54/58" />
      </StepCard>

      {/* ============ 步骤 3：定宫安世应 ============ */}
      <StepCard step={STEPS[2]} open={isOpen(3)} onToggle={() => toggle(3)} ask={askFor(3)}>
        <p className="mb-2">
          {p.benGua.info.name}属 <b>{p.palace}宫</b>（五行属{p.palaceElement}），
          为{p.seq === 1 ? '本宫首卦' : p.seq === 7 ? '第七卦·游魂卦' : p.seq === 8 ? '第八卦·归魂卦' : `${['', '', '一世', '二世', '三世', '四世', '五世'][p.seq]}卦`}，
          <b>世在{POS_N[p.shiPos]}爻、应在{POS_N[p.yingPos]}爻</b>，卦身<b>{p.guaShenBranch}</b>。
        </p>
        {/* 八宫推演链 */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {walk.map((s) => (
              <div key={s.seq} className={`flex flex-col items-center border rounded px-2 py-1.5 text-[10px] w-[86px] ${s.isTarget ? 'border-[#b03a2e] bg-[#fdf0ec] font-bold' : 'border-[#e0d6bd] bg-[#fbf8f0] text-[#8a7f6a]'}`}>
                <span className={s.isTarget ? 'text-[#b03a2e]' : ''}>{s.name}</span>
                <span>{s.seqName}</span>
                <span>世{POS_N[s.shiPos]}</span>
                {s.flipPos && <span className="text-[#9a8a68]">变{POS_N[s.flipPos]}爻</span>}
                {s.seq === 8 && <span className="text-[#9a8a68]">内卦复归</span>}
              </div>
            ))}
          </div>
        </div>
        <Teach title="这一步怎么推？">
          <p>① <b>归宫</b>：六十四卦分属八宫。从本宫纯卦（{p.palace}为{TRIGRAM_NATURE[p.palace]}）出发，初爻变为一世卦、再变二爻为二世卦……直变到五爻；第六变不能动上爻，回头变四爻为<b>游魂卦</b>；最后内卦三爻全变回本宫为<b>归魂卦</b>。上表即{p.palace}宫的完整递变链，「{p.benGua.info.name}」在第{p.seq}位。</p>
          <p>② <b>安世应</b>：世爻位置就是「变到第几爻」的位置——本宫卦世在上爻，一世卦世在初爻……五世卦世在五爻；游魂变在四爻故世在四爻，归魂内卦复归故世在三爻。应爻与世爻恒隔三爻（隔两位）：世{POS_N[p.shiPos]}则应{POS_N[p.yingPos]}。世为求占者一方，应为对方/所测之事，中间二爻为间爻，主宾主之间的阻隔或媒介。</p>
          <p>③ <b>卦身</b>：世爻为{p.lines[p.shiPos - 1].yang ? '阳' : '阴'}爻，故从{p.lines[p.shiPos - 1].yang ? '子' : '午'}起，自初爻顺数至{POS_N[p.shiPos]}爻（世位），得<b>{p.guaShenBranch}</b>——卦身为「占事之主」，是辅助断卦的第二参照。</p>
        </Teach>
        <Rule text="八卦之首世六当，以下初爻轮上扬，游魂之卦四爻世，归魂之卦三爻详。阴世则从午月起，阳世则从子月生，欲得识其卦中意，从初数至世方真。" note="卷三·第七课安世应歌诀、第十一课卦身诀" />
      </StepCard>

      {/* ============ 步骤 4：纳甲装卦 ============ */}
      <StepCard step={STEPS[3]} open={isOpen(4)} onToggle={() => toggle(4)} ask={askFor(4)}>
        <table className="text-xs border-collapse mb-2">
          <thead>
            <tr className="text-[#8a7f6a] border-b border-[#e8ddc0]">
              <th className="text-left py-1 pr-3 font-normal">爻位</th>
              <th className="text-left pr-3 font-normal">所属</th>
              <th className="text-left pr-3 font-normal">纳干支</th>
              <th className="text-left font-normal">支五行</th>
            </tr>
          </thead>
          <tbody>
            {[...p.lines].reverse().map((l) => (
              <tr key={l.pos} className="border-b border-[#f0e9d6]">
                <td className="py-1 pr-3">{l.posName}爻</td>
                <td className="pr-3">{l.pos <= 3 ? `内卦${p.benGua.lower}` : `外卦${p.benGua.upper}`}</td>
                <td className="pr-3 font-semibold">{l.stem}{l.branch}</td>
                <td>{l.element}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Teach title="这一步怎么推？">
          <p>① 八卦分阴阳：阳卦乾坎艮震纳阳支（子寅辰午申戌），阴卦坤兑离巽纳阴支（未巳卯丑亥酉）。</p>
          <p>② 内卦<b>{p.benGua.lower}</b>自初爻起纳「{NAJIA_TEXT2(p.benGua.lower, 'inner')}」，外卦<b>{p.benGua.upper}</b>自四爻起纳「{NAJIA_TEXT2(p.benGua.upper, 'outer')}」——即歌诀「{NAJIA_LINE(p.benGua.lower)}；{NAJIA_LINE(p.benGua.upper)}」。</p>
          <p>③ 天干随之：{p.benGua.lower}卦在内纳{NAJIA_STEM(p.benGua.lower, 'inner')}干、{p.benGua.upper}卦在外纳{NAJIA_STEM(p.benGua.upper, 'outer')}干。</p>
          <p>④ 地支既定，五行随支而定（子水、丑土、寅卯木、辰土、巳午火、未土、申酉金、戌土、亥水），各爻五行由此装上。</p>
        </Teach>
        <Rule text="乾在内子寅辰，乾在外午申戌；坎在内寅辰午，坎在外申戌子；艮在内辰午申，艮在外戌子寅；震在内子寅辰，震在外午申戌。巽在内丑亥酉，巽在外未巳卯；离在内卯丑亥，离在外酉未巳；兑在内巳卯丑，兑在外亥酉未；坤在内未巳卯，坤在外丑亥酉。" note="卷三·第八课。八纯卦按阳顺阴逆从初爻排起，其余五十六卦上卦用上卦纳支、下卦用下卦纳支" />
      </StepCard>

      {/* ============ 步骤 5：配六亲六神 ============ */}
      <StepCard step={STEPS[4]} open={isOpen(5)} onToggle={() => toggle(5)} ask={askFor(5)}>
        <table className="text-xs border-collapse mb-2 w-full">
          <thead>
            <tr className="text-[#8a7f6a] border-b border-[#e8ddc0]">
              <th className="text-left py-1 font-normal">爻位</th>
              <th className="text-left font-normal">推演（宫{p.palaceElement}为我）</th>
              <th className="text-left font-normal">六亲</th>
              <th className="text-left font-normal">六神</th>
            </tr>
          </thead>
          <tbody>
            {[...p.lines].reverse().map((l) => (
              <tr key={l.pos} className="border-b border-[#f0e9d6]">
                <td className="py-1">{l.posName}爻</td>
                <td className="text-[#6b6152]">{l.branch}{l.element} · {REL_TEXT[elemRelation(p.palaceElement, l.element)]}</td>
                <td className="font-semibold">{l.liuqin}</td>
                <td>{l.liushen}（{LIUSHEN_ELEMENT[l.liushen]}）</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Teach title="这一步怎么推？">
          <p>① <b>六亲</b>以「卦宫五行」为我：{p.palace}宫属<b>{p.palaceElement}</b>，拿各爻地支五行与我比对——生我者父母、比和者兄弟、我生者子孙、我克者妻财、克我者官鬼。例如{POS_N[p.shiPos]}爻{p.lines[p.shiPos - 1].branch}{p.lines[p.shiPos - 1].element}：{REL_TEXT[elemRelation(p.palaceElement, p.lines[p.shiPos - 1].element)]}，故为<b>{p.lines[p.shiPos - 1].liuqin}</b>。</p>
          <p>② <b>变卦六亲随主宫</b>：变爻的地支按变卦纳支重排，但「我」仍是主卦{p.palace}宫{p.palaceElement}，不依变卦的宫——这是初学者最易错之处。</p>
          <p>③ <b>六神</b>只看日干：{g.dayStem}日属「{LIUSHEN_QI_GROUP(g.dayStem)}」，自初爻起{l.liushenOfStart(g.dayStem)}，按 青龙→朱雀→勾陈→螣蛇→白虎→玄武 顺序向上排一周。六神为附合之神，参断事物性质与方位，不可专以六神断吉凶。</p>
        </Teach>
        <Rule text="生我者为父母、比和者为兄弟、我生者为子孙、我克者为妻财、克我者为官鬼。甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起腾蛇，庚辛起白虎，壬癸起玄武。" note="卷三·第九课/第十课。《千金赋》：虎兴而遇吉神不害其吉，龙动而逢凶曜难掩其凶" />
      </StepCard>

      {/* ============ 步骤 6：查动静参数 ============ */}
      <StepCard step={STEPS[5]} open={isOpen(6)} onToggle={() => toggle(6)} ask={askFor(6)}>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <ParamItem name="旬空" def="旬中落空之二支" result={p.lines.some((l) => l.kong) ? p.lines.filter((l) => l.kong).map((l) => `${l.posName}爻${l.branch}${l.moving || l.score >= 1.5 ? '（旺/动·假空）' : '（休囚·真空）'}`).join('、') : '无爻临空'} />
          <ParamItem name="月破" def="月建所冲的休囚之爻" result={p.lines.some((l) => l.yuePo) ? p.lines.filter((l) => l.yuePo).map((l) => `${l.posName}爻${l.branch}`).join('、') : '无'} />
          <ParamItem name="日破" def="休囚逢空不动之爻被日辰冲" result={p.lines.some((l) => l.riPo) ? p.lines.filter((l) => l.riPo).map((l) => `${l.posName}爻${l.branch}`).join('、') : '无'} />
          <ParamItem name="暗动" def="旺相之静爻被日辰冲，冲则动" result={p.lines.some((l) => l.anDong) ? p.lines.filter((l) => l.anDong).map((l) => `${l.posName}爻${l.branch}（与动爻通论）`).join('、') : '无'} />
          <ParamItem name="化进/化退" def="动爻化同五行之前进/后退支" result={p.lines.some((l) => l.jinTui) ? p.lines.filter((l) => l.jinTui).map((l) => `${l.posName}爻${l.branch}化${l.bianBranch}${l.jinTui}`).join('；') : '无'} />
          <ParamItem name="卦格" def="六冲/六合/反吟/伏吟/独发/独静" result={[p.liuChong && '六冲卦', p.liuHe && '六合卦', p.fanYin, p.fuYin, p.duFa && '独发', p.duJing && '独静'].filter(Boolean).join('、') || '常规动变'} />
        </div>
        <Teach title="这一步怎么查？">
          <p>① <b>旬空分真假</b>：旺不为空、动不为空、有日建动爻生扶不空；休囚无气之空才是真空。真空之爻所主之事多成泡影，假空之爻出空填实（到{p.kong[0]}{p.kong[1]}值日/值月）即有用。</p>
          <p>② <b>破与动一线之隔</b>：同是逢冲，旺相之静爻被日辰冲叫<b>暗动</b>（冲则动，暗中发力），休囚之静爻被冲叫<b>日破</b>（力竭难支）——先看旺衰再定名。</p>
          <p>③ <b>月破有救</b>：月破之爻眼下虽破，出月不破，逢合、填实之日可解；只有静而休囚、又值旬空、反遭克害才是真破。</p>
          <p>④ <b>互卦{p.huGua?.name}</b>：取本卦二三四爻为下卦、三四五爻为上卦重叠而成，主人事物的中间变化过程，可参看事态中途的走向。</p>
        </Teach>
        <Rule text="旺不为空，动不为空，有日建动爻生扶者不空；月破为空，有气无动为空，伏而受克为空，真空为空。日破是休囚逢冲不易动，暗动逢冲即动。" note="卷三·第十一课" />
      </StepCard>

      {/* ============ 步骤 7：取用神 ============ */}
      <StepCard step={STEPS[6]} open={isOpen(7)} onToggle={() => toggle(7)} ask={askFor(7)}>
        <p className="mb-1">测事类别：<b>{it.category.label}</b> → 主用神：<b>{it.category.yongshen === '世' ? '世爻' : it.category.yongshen === '应' ? '应爻' : `${it.category.yongshen}爻`}</b></p>
        <p className="mb-1">{it.candidatesNote}</p>
        {it.fuNote && <p className="mb-1 text-[#9a6a3a]">{it.fuNote}</p>}
        {it.category.fuShenAux && it.category.fuShenAux.length > 0 && (
          <p className="text-xs text-[#8a7f6a]">辅用神：{it.category.fuShenAux.join('、')}——主用神定吉凶，辅用神供取象参考。</p>
        )}
        <Teach title="这一步怎么想？">
          <p>① <b>先抓问题核心</b>：{it.category.basis}</p>
          <p>② <b>取用顺序</b>：所测之事在六亲之内→取对应六亲；与自己直接相关→取世爻；不在六亲之类（陌生人、射覆）→取应爻。</p>
          <p>③ <b>用神双现</b>按优先级取舍：<b>动爻（皆动取旺）＞持世＞持应＞离世近（同距取旺）</b>；另有旬空、月破、破伤者舍之。</p>
          <p>④ <b>用神不上卦</b>：六十四卦中六亲并非每卦俱全，缺则向本宫首卦（纯卦六亲皆全）借，借来之爻叫<b>伏神</b>，被伏之爻叫<b>飞神</b>；再按「伏神有用论」断其能否得力：得日月生、得飞神生、飞神空破休囚者有用；被飞神克、休囚旬空者无用。</p>
        </Teach>
        <Rule text="舍其闲爻，用其持世；舍其休囚，用其旺相；舍其静爻，用其动爻；舍其月破，用其不破；舍其旬空，用其不空；舍其破伤，用其不伤。" note="卷四·第五课用神双现诀。取用神是断卦第一步，用神搞错则全盘皆错（习题卷29）" />
      </StepCard>

      {/* ============ 步骤 8：旺衰生克 ============ */}
      <StepCard step={STEPS[7]} open={isOpen(8)} onToggle={() => toggle(8)} ask={askFor(8)}>
        {it.yongshenLine && !it.yongshenIsFu && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs">用神旺衰</span>
              <div className="flex-1 h-2.5 bg-stone-200 rounded-full overflow-hidden">
                <div className={`h-full ${it.yongshenLine.score >= 1.5 ? 'bg-emerald-500' : it.yongshenLine.score >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(4, ((it.yongshenLine.score + 4) / 10) * 100))}%` }} />
              </div>
              <span className="text-xs font-bold">{wangShuaiLabel(it.yongshenLine.score)}（{it.yongshenLine.score}）</span>
            </div>
            <ul className="text-xs space-y-0.5 text-[#6b6152]">
              {it.yongshenLine.scoreNotes.map((n, i) => <li key={i}>· {n}</li>)}
            </ul>
          </div>
        )}
        <p className="text-xs">
          原神（生用神者）：{it.yuanshenLines.length ? it.yuanshenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}${l.moving ? '·动' : ''}${l.anDong ? '·暗动' : ''}`).join('、') : '不上卦'}；
          忌神（克用神者）：{it.jishenLines.length ? it.jishenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}${l.moving ? '·动' : ''}${l.anDong ? '·暗动' : ''}`).join('、') : '不上卦'}；
          仇神（用神所克、生忌神者）：{it.choushenLines.length ? it.choushenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}${l.moving ? '·动' : ''}`).join('、') : '不上卦'}。
        </p>
        <Teach title="这一步怎么量？">
          <p>① <b>月建定旺相休囚死</b>：当令者旺、令生者相、生令者休、克令者囚、令克者死。本月{g.monthBranch}{mElem}当令——{mElem}旺、{SEASON_WANG[mElem] ? Object.entries(SEASON_WANG[mElem]).filter(([, v]) => v === '相').map(([k]) => k)[0] : ''}相、{Object.entries(SEASON_WANG[mElem]).filter(([, v]) => v === '休').map(([k]) => k)[0]}休、{Object.entries(SEASON_WANG[mElem]).filter(([, v]) => v === '囚').map(([k]) => k)[0]}囚、{Object.entries(SEASON_WANG[mElem]).filter(([, v]) => v === '死').map(([k]) => k)[0]}死。</p>
          <p>② <b>日辰定生旺墓绝</b>：以十二长生查——{it.yongshenLine ? `用神${it.yongshenLine.element}长生在${BRANCHES[CHANGSHENG_START[it.yongshenLine.element]]}，至日辰${g.dayBranch}处「${it.yongshenLine.dayState}」` : ''}。长生、临官、帝旺为旺运，死、墓、绝为恶运。</p>
          <p>③ <b>动静加减</b>：发动增力，化进神、化回头生再增；化退神、化回头克、动而化空递减；旬空月破日破视真假再折。</p>
          <p>④ <b>原忌仇三方角力</b>：原神是用神的源头（无源之水难久），忌神是用神的克星（宜静不宜兴），仇神伤原生忌（助纣为虐）。三者谁旺谁动，往往直接改写用神吉凶。若原神忌神同动，则忌神生原神、原神生用神，连续相生反吉。</p>
        </Teach>
        <Rule text="当令者旺，令生者相，生令者休，克令者囚，令克者死。原神是生助用神的爻，忌神是克用神的爻；哪一个更旺更有力，就将对用神的吉凶起决定性作用。" note="卷一·第三十八课；卷四·第二课" />
      </StepCard>

      {/* ============ 步骤 9：综合断卦 ============ */}
      <StepCard step={STEPS[8]} open={isOpen(9)} onToggle={() => toggle(9)} ask={askFor(9)}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`text-2xl font-bold px-4 py-1.5 rounded-lg border-2 ${VERDICT_CLS[it.verdict]}`} style={{ fontFamily: '"Songti SC",serif' }}>
            {it.verdict}
          </div>
          <p className="text-xs text-[#6b6152] flex-1">{it.summary}</p>
        </div>
        <div className="space-y-2 mb-3">
          {it.findings.map((f, i) => (
            <div key={i} className={`border rounded px-3 py-2 ${KIND_STYLE[f.kind].cls}`}>
              <div className="font-semibold text-xs mb-0.5">【{KIND_STYLE[f.kind].label}】{f.title}</div>
              <div className="text-xs opacity-90">{f.detail}</div>
              <div className="text-[10px] mt-1 opacity-70">依据：{f.basis}</div>
            </div>
          ))}
        </div>
        <div className="text-xs mb-2"><b>世应关系：</b>{it.shiyingNote}</div>
        {it.yingqi.length > 0 && (
          <div className="text-xs mb-3">
            <b>应期参考：</b>
            <ul className="mt-0.5 space-y-0.5">{it.yingqi.map((y, i) => <li key={i}>· {y}</li>)}</ul>
          </div>
        )}
        <Teach title="断卦思路回顾（读卦顺序）">
          <p>① 先看<b>用神</b>旺衰死活——这是吉凶的主轴；② 再看<b>原神忌神</b>谁旺谁动——这是吉凶的变数；③ 看<b>动爻</b>化进化退、回头生克——这是事情的走向；④ 兼看<b>世应</b>生合冲克——这是人我关系；⑤ 参看<b>卦格</b>（六冲主散、六合主合、反伏吟主反复忧吟）与<b>六神</b>取象；⑥ 最后以「空待出空、墓待冲开、静旺待冲、动待值合」推<b>应期</b>。</p>
          <p className="text-[#8a6a4a]">切记：六爻明阴阳、示吉凶，反映的是一定坐标基础上的发展趋势，不可无条件妄断铁口（卷三·第三课）。</p>
        </Teach>
        {/* 卦义佐证 */}
        <div className="border-t border-[#e8ddc0] pt-2 mt-2 text-xs space-y-1.5">
          <div><b>卦辞：</b>{p.benGua.info.guaci || p.benGua.info.yi}</div>
          <div><b>卦意：</b>{p.benGua.info.yi}</div>
          <div><b>卦析：</b>{p.benGua.info.xi}</div>
          {movingLines.map((l) => {
            const ycKey = l.pos === 1 ? (l.yang ? '初九' : '初六') : l.pos === 6 ? (l.yang ? '上九' : '上六') : `${l.yang ? '九' : '六'}${['', '', '二', '三', '四', '五'][l.pos]}`;
            const yc = p.benGua.info.yaoci[ycKey];
            return yc ? <div key={l.pos}><b>{l.posName}爻辞（{ycKey}）：</b>{yc}</div> : null;
          })}
          <div className="text-[#8a7f6a]">（卦辞卦义引自卷二·第七课《六十四卦解析》）</div>
        </div>
        <Basis text="习题卷问答题65：以用神为主线，兼看世、应，主要分析五行的生克冲合关系，还要考虑月建、日辰对爻的影响，以及爻的旺相休囚、动变、旬空、月破、暗动等情况，同时结合六神、卦象等综合判断。" />
      </StepCard>
    </div>
  );
}

function ParamItem({ name, def, result }: { name: string; def: string; result: string }) {
  return (
    <div className="border border-[#e8ddc0] rounded px-2.5 py-2 bg-[#fdfaf3]">
      <div className="font-semibold text-[#3d3428]">{name} <span className="font-normal text-[#9a8f78]">（{def}）</span></div>
      <div className="mt-0.5 text-[#6b6152]">{result}</div>
    </div>
  );
}

import { NAJIA, LIUSHEN_ORDER, LIUSHEN_START } from '../../lib/liuyao/constants';

function NAJIA_LINE(trig: string): string {
  const n = NAJIA[trig];
  return `${trig}在内${n.inner.join('')}，${trig}在外${n.outer.join('')}`;
}
function NAJIA_TEXT2(trig: string, io: 'inner' | 'outer'): string {
  const n = NAJIA[trig];
  return io === 'inner' ? n.inner.join('、') : n.outer.join('、');
}
function NAJIA_STEM(trig: string, io: 'inner' | 'outer'): string {
  const n = NAJIA[trig];
  return io === 'inner' ? n.innerStem : n.outerStem;
}
function LIUSHEN_QI_GROUP(stem: string): string {
  const map: Record<string, string> = { 甲: '甲乙起青龙', 乙: '甲乙起青龙', 丙: '丙丁起朱雀', 丁: '丙丁起朱雀', 戊: '戊日起勾陈', 己: '己日起腾蛇', 庚: '庚辛起白虎', 辛: '庚辛起白虎', 壬: '壬癸起玄武', 癸: '壬癸起玄武' };
  return map[stem];
}
const l = { liushenOfStart(stem: string): string { return LIUSHEN_ORDER[LIUSHEN_START[stem]]; } };

function hourStart(stem: string): string {
  const map: Record<string, string> = { 甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬' };
  return map[stem];
}

function xunText(p: PaiPan): string {
  const start = p.ganzhi.dayIndex - (p.ganzhi.dayIndex % 10);
  const names = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  return `${names[Math.floor(start / 10) % 6]}旬`;
}

function xunDays(p: PaiPan): string {
  const start = p.ganzhi.dayIndex - (p.ganzhi.dayIndex % 10);
  const out: string[] = [];
  for (let i = 0; i < 10; i++) {
    const idx = (start + i) % 60;
    out.push(`${['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][idx % 10]}${BRANCHES[idx % 12]}`);
  }
  return out.join('、');
}

const LINE_UNUSED: LineInfo | null = null;
void LINE_UNUSED;
