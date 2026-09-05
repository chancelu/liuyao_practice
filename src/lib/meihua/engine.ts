// 梅花易数引擎 —— 起卦推导（七种起法）+ 本互变排卦 + 体用生克 + 卦气旺衰 + 应期卦数
// 依据：《梅花易数》年月日时起例、物数/数字/字画/声音占、端法后天起卦、体用总诀、卦气旺衰
import { TRIGRAM_BITS, BITS_TRIGRAM, TRIGRAM_ELEMENT, SEASON_WANG, PALACES, BRANCHES, SHENG, KE } from '../liuyao/constants';
import type { Element5 } from '../liuyao/constants';
import { computeGanZhi } from '../liuyao/calendar';
import { XIANTIAN, NUM_TRIGRAM, trigramOfNum, SEASON_OF_BRANCH, TIYONG_VERDICT } from './constants';

// ============ 64 卦名查找（下卦名+上卦名 → 卦名，复用六爻八宫卦序表） ============
const HEX_NAME: Record<string, string> = {};
for (const p of Object.values(PALACES)) {
  for (const h of p.hexes) HEX_NAME[h.key] = h.name;
}
export function hexName(lower: string, upper: string): string {
  return HEX_NAME[lower + upper] ?? `${upper}${lower}卦`;
}

// ============ 农历换算（用浏览器内建 Intl 中华农历，免内嵌农历表） ============
export interface LunarDate { month: number; day: number; label: string; leap: boolean }

const LUNAR_MONTH_NUM: Record<string, number> = {
  正月: 1, 一月: 1, 二月: 2, 三月: 3, 四月: 4, 五月: 5, 六月: 6,
  七月: 7, 八月: 8, 九月: 9, 十月: 10, 十一月: 11, 冬月: 11, 十二月: 12, 腊月: 12,
};
function lunarDayNum(s: string): number {
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s); // 部分 ICU 实现直接返回数字
  if (s.startsWith('初')) return '一二三四五六七八九十'.indexOf(s[1]) + 1;
  if (s === '二十') return 20;
  if (s === '三十') return 30;
  if (s.startsWith('廿')) return 20 + ('一二三四五六七八九'.indexOf(s[1]) + 1);
  if (s.startsWith('卅')) return 30; // 卅一罕见，归 30
  if (s.startsWith('十')) return 10 + ('一二三四五六七八九'.indexOf(s[1]) + 1);
  return 0;
}
/** 公历 → 农历月日（依赖 Intl chinese calendar；不支持时返回 null） */
export function lunarOf(date: Date): LunarDate | null {
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });
    const parts = fmt.formatToParts(date);
    const monthRaw = parts.find((p) => p.type === 'month')?.value ?? '';
    const dayRaw = parts.find((p) => p.type === 'day')?.value ?? '';
    const leap = monthRaw.startsWith('闰');
    const monthName = leap ? monthRaw.slice(1) : monthRaw;
    const month = LUNAR_MONTH_NUM[monthName] ?? 0;
    const day = lunarDayNum(dayRaw);
    if (!month || !day) return null;
    return { month, day, label: `${monthRaw}${dayRaw}`, leap };
  } catch {
    return null;
  }
}

// ============ 起卦推导（各起法 → 上卦数/下卦数/动爻 + 过程说明） ============
export interface QiGuaResult {
  upperNum: number; lowerNum: number; moving: number;
  note: string; // 起卦过程说明（教学展示）
}

/** ① 年月日时起卦（经典）：年支数+农历月+农历日 → 上卦；+时辰数 → 下卦；总÷6 → 动爻 */
export function deriveFromTime(date: Date): QiGuaResult {
  const gz = computeGanZhi(date);
  const yearNum = BRANCHES.indexOf(gz.year[1] as never) + 1;
  const hourNum = BRANCHES.indexOf(gz.hourBranch as never) + 1;
  const lunar = lunarOf(date);
  if (!lunar) {
    // 农历不可用时的兜底：公历月日（并在说明中注明）
    const m = date.getMonth() + 1, d = date.getDate();
    const up = (yearNum + m + d) % 8 || 8;
    const lo = (yearNum + m + d + hourNum) % 8 || 8;
    const mv = (yearNum + m + d + hourNum) % 6 || 6;
    return {
      upperNum: up, lowerNum: lo, moving: mv,
      note: `（本环境不支持农历换算，按公历月日代算）年支${gz.year[1]}=${yearNum}＋${m}月＋${d}日＝${yearNum + m + d}，÷8余${up}为上卦${trigramOfNum(up)}；加时辰${gz.hourBranch}=${hourNum}得${yearNum + m + d + hourNum}，÷8余${lo}为下卦${trigramOfNum(lo)}；÷6余${mv}为动爻`,
    };
  }
  const s1 = yearNum + lunar.month + lunar.day;
  const s2 = s1 + hourNum;
  const up = s1 % 8 || 8;
  const lo = s2 % 8 || 8;
  const mv = s2 % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: `年支${gz.year[1]}=${yearNum}＋农历${lunar.month}月＋${lunar.day}日（${lunar.label}）＝${s1}，÷8余${up}→上卦${trigramOfNum(up)}；加时辰${gz.hourBranch}=${hourNum}得${s2}，÷8余${lo}→下卦${trigramOfNum(lo)}；${s2}÷6余${mv}→第${mv}爻动`,
  };
}

/** ② 报数起卦：n1 上卦，n2 下卦（缺省加时辰），和 ÷6 取动爻 */
export function deriveFromNumbers(n1: number, n2: number | null, addHour: boolean, hourNum: number): QiGuaResult {
  const lo2 = n2 ?? (n1 + hourNum);
  const total = n2 !== null && addHour ? n1 + n2 + hourNum : n1 + lo2;
  const up = n1 % 8 || 8;
  const lo = lo2 % 8 || 8;
  const mv = total % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: n2 !== null
      ? `报数${n1}、${n2}${addHour ? `＋时辰数${hourNum}` : ''}：${n1}÷8余${up}→上卦${trigramOfNum(up)}；${lo2}÷8余${lo}→下卦${trigramOfNum(lo)}；${total}÷6余${mv}→第${mv}爻动`
      : `报数${n1}＋时辰数${hourNum}：${n1}÷8余${up}→上卦${trigramOfNum(up)}；${lo2}÷8余${lo}→下卦${trigramOfNum(lo)}；${total}÷6余${mv}→第${mv}爻动`,
  };
}

/** ③ 数字串起卦：平分两段求和（奇数位前段少一），总和取动爻 */
export function deriveFromDigitString(digits: string): QiGuaResult | null {
  const ds = digits.replace(/\D/g, '');
  if (ds.length < 2) return null;
  const half = Math.floor(ds.length / 2);
  const front = ds.slice(0, half).split('').reduce((a, c) => a + Number(c), 0);
  const back = ds.slice(half).split('').reduce((a, c) => a + Number(c), 0);
  const total = front + back;
  const up = front % 8 || 8;
  const lo = back % 8 || 8;
  const mv = total % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: `数字串「${ds}」共${ds.length}位，前${half}位和${front}÷8余${up}→上卦${trigramOfNum(up)}；后${ds.length - half}位和${back}÷8余${lo}→下卦${trigramOfNum(lo)}；总和${total}÷6余${mv}→第${mv}爻动`,
  };
}

/** ④ 测字起卦：单字（笔画+时辰）/ 双字（各笔画） */
export function deriveFromText(s1: number, s2: number | null, hourNum: number): QiGuaResult {
  const lo2 = s2 ?? (s1 + hourNum);
  const up = s1 % 8 || 8;
  const lo = lo2 % 8 || 8;
  const mv = (s1 + lo2) % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: s2 !== null
      ? `前字${s1}画÷8余${up}→上卦${trigramOfNum(up)}；后字${s2}画÷8余${lo}→下卦${trigramOfNum(lo)}；和${s1 + lo2}÷6余${mv}→第${mv}爻动`
      : `单字${s1}画÷8余${up}→上卦${trigramOfNum(up)}；加时辰数${hourNum}得${lo2}÷8余${lo}→下卦${trigramOfNum(lo)}；和${s1 + lo2}÷6余${mv}→第${mv}爻动`,
  };
}

/** ⑤ 声音起卦：声数上卦，声数+时辰数下卦 */
export function deriveFromSound(count: number, hourNum: number): QiGuaResult {
  const lo2 = count + hourNum;
  const up = count % 8 || 8;
  const lo = lo2 % 8 || 8;
  const mv = lo2 % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: `闻声${count}次：${count}÷8余${up}→上卦${trigramOfNum(up)}；加时辰数${hourNum}得${lo2}÷8余${lo}→下卦${trigramOfNum(lo)}；÷6余${mv}→第${mv}爻动`,
  };
}

/** ⑥ 外应起卦：方位/物象卦为上卦，加时辰数（或报数）为下卦 */
export function deriveFromWaiying(gua: string, addNum: number, addLabel: string): QiGuaResult {
  const up = XIANTIAN[gua];
  const s2 = up + addNum;
  const lo = s2 % 8 || 8;
  const mv = s2 % 6 || 6;
  return {
    upperNum: up, lowerNum: lo, moving: mv,
    note: `外应取「${gua}」=${up}为上卦；加${addLabel}=${addNum}得${s2}，÷8余${lo}→下卦${trigramOfNum(lo)}；÷6余${mv}→第${mv}爻动`,
  };
}

// ============ 排卦：本卦 / 变卦 / 互卦 / 体用 / 卦气 / 应期 ============
export interface GuaView {
  name: string;        // 重卦名（如 泽天夬）
  upper: string; lower: string;
  bits: number[];      // 六爻自下而上（1 阳 0 阴）
}

export interface MeihuaChart {
  ben: GuaView;
  bian: GuaView;
  hu: GuaView & { note: string };
  moving: number;      // 动爻 1-6
  tiIsUpper: boolean;
  tiGua: string; tiElement: Element5;
  yongGua: string; yongElement: Element5;
  relation: string;    // 用生体 等
  verdict: { tone: '吉' | '凶' | '平'; text: string };
  season: string; tiWang: string; yongWang: string; // 卦气旺衰
  yingqiNum: number;   // 应期卦数（主卦上数+下数+动爻数）
  monthBranch: string;
  lines: string[];     // 排卦过程
}

export function paipanMeihua(qi: QiGuaResult, monthBranch: string): MeihuaChart {
  const upper = NUM_TRIGRAM[qi.upperNum];
  const lower = NUM_TRIGRAM[qi.lowerNum];
  const bits = [...TRIGRAM_BITS[lower], ...TRIGRAM_BITS[upper]]; // 自下而上
  const mv = qi.moving;

  // 变卦：动爻阴阳互变
  const bianBits = [...bits];
  bianBits[mv - 1] = bianBits[mv - 1] ? 0 : 1;
  const bianLower = BITS_TRIGRAM[bianBits.slice(0, 3).join('')];
  const bianUpper = BITS_TRIGRAM[bianBits.slice(3).join('')];

  // 互卦：二三四爻为下互，三四五爻为上互
  const huLower = BITS_TRIGRAM[[bits[1], bits[2], bits[3]].join('')];
  const huUpper = BITS_TRIGRAM[[bits[2], bits[3], bits[4]].join('')];

  // 体用：动爻所在卦为用，另一卦为体
  const tiIsUpper = mv <= 3; // 动爻在下卦（1-3）→ 上卦为体
  const tiGua = mv > 3 ? lower : upper;
  const yongGua = mv > 3 ? upper : lower;
  const tiElement = TRIGRAM_ELEMENT[tiGua];
  const yongElement = TRIGRAM_ELEMENT[yongGua];

  // 体用关系（以体为「我」）
  let relation: string;
  if (tiElement === yongElement) relation = '比和';
  else if (SHENG[yongElement] === tiElement) relation = '用生体';
  else if (KE[tiElement] === yongElement) relation = '体克用';
  else if (SHENG[tiElement] === yongElement) relation = '体生用';
  else relation = '用克体';

  // 卦气旺衰（按月令）
  const season = SEASON_OF_BRANCH[monthBranch] ?? { name: '四季月', element: '土' as Element5 };
  const wangRow = SEASON_WANG[season.element];
  const tiWang = wangRow[tiElement];
  const yongWang = wangRow[yongElement];

  // 应期卦数：主卦上数+下数+动爻数（《梅花易数》应期法之一）
  const yingqiNum = qi.upperNum + qi.lowerNum + mv;

  const lines = [
    qi.note,
    `得本卦「${hexName(lower, upper)}」（上${upper}下${lower}），第${mv}爻动`,
    `动爻${mv > 3 ? '在上卦，上卦为用、下卦为体' : '在下卦，下卦为用、上卦为体'}：体=${tiGua}(${tiElement})，用=${yongGua}(${yongElement})`,
    `互卦「${hexName(huLower, huUpper)}」（上互${huUpper}·二三四五爻中取，下互${huLower}）；变卦「${hexName(bianLower, bianUpper)}」`,
    `体用关系：${relation}——${TIYONG_VERDICT[relation].text}`,
    `卦气：${season.name}（${season.element}令）体卦${tiGua}${tiWang}、用卦${yongGua}${yongWang}`,
  ];

  return {
    ben: { name: hexName(lower, upper), upper, lower, bits },
    bian: { name: hexName(bianLower, bianUpper), upper: bianUpper, lower: bianLower, bits: bianBits },
    hu: { name: hexName(huLower, huUpper), upper: huUpper, lower: huLower, bits: [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]], note: '二三四爻为下互、三四五爻为上互' } as GuaView & { note: string },
    moving: mv,
    tiIsUpper, tiGua, tiElement, yongGua, yongElement,
    relation, verdict: TIYONG_VERDICT[relation],
    season: season.name, tiWang, yongWang,
    yingqiNum, monthBranch,
    lines,
  };
}
