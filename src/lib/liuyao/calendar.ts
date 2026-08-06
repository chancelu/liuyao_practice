// 干支历法计算 —— 依据六爻课程卷一·第三十四课（干支历法）、第七章（二十四节气）
// 年以立春为界，月以节气为界（习题卷问答题58），日柱用儒略日精确推算

import { STEMS, BRANCHES } from './constants';

export interface GanZhi {
  year: string;   // 年柱
  month: string;  // 月柱
  day: string;    // 日柱
  hour: string;   // 时柱
  yearIndex: number; monthIndex: number; dayIndex: number; hourIndex: number;
  monthBranch: string; // 月建
  dayBranch: string;   // 日辰
  dayStem: string;     // 日干（配六神用）
  hourBranch: string;
  jieqi: string;  // 当前所属节令说明
}

// 儒略日数（中午12点）
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// 日干支：以 2000-01-01 = 戊午日（索引54）为锚点
const DAY_ANCHOR_JDN = jdn(2000, 1, 1);
const DAY_ANCHOR_INDEX = 54;

export function dayGanZhi(y: number, m: number, d: number): { gz: string; index: number } {
  const diff = jdn(y, m, d) - DAY_ANCHOR_JDN;
  const idx = ((DAY_ANCHOR_INDEX + diff) % 60 + 60) % 60;
  return { gz: STEMS[idx % 10] + BRANCHES[idx % 12], index: idx };
}

// 二十四节气近似日期（通用公式，1901-2100，误差±1天）
// 12个"节"：月建更替点
interface JieDef { name: string; month: number; c21: number; c20: number; branch: string }
const JIE: JieDef[] = [
  { name: '小寒', month: 1, c21: 6.11, c20: 6.9, branch: '丑' },
  { name: '立春', month: 2, c21: 3.87, c20: 4.6295, branch: '寅' },
  { name: '惊蛰', month: 3, c21: 5.63, c20: 6.3826, branch: '卯' },
  { name: '清明', month: 4, c21: 4.81, c20: 5.59, branch: '辰' },
  { name: '立夏', month: 5, c21: 5.52, c20: 6.318, branch: '巳' },
  { name: '芒种', month: 6, c21: 5.678, c20: 6.5, branch: '午' },
  { name: '小暑', month: 7, c21: 7.108, c20: 7.928, branch: '未' },
  { name: '立秋', month: 8, c21: 7.5, c20: 8.35, branch: '申' },
  { name: '白露', month: 9, c21: 7.646, c20: 8.44, branch: '酉' },
  { name: '寒露', month: 10, c21: 8.318, c20: 9.098, branch: '戌' },
  { name: '立冬', month: 11, c21: 7.438, c20: 8.218, branch: '亥' },
  { name: '大雪', month: 12, c21: 7.18, c20: 7.9, branch: '子' },
];

function jieDay(year: number, jie: JieDef): number {
  const y = year % 100;
  const c = year >= 2000 ? jie.c21 : jie.c20;
  return Math.floor(y * 0.2422 + c) - Math.floor((y - 1) / 4);
}

/** 求某日期所处节令月：返回 {月建地支, 节令名, 节令起始日} */
export function monthBranchByJieqi(y: number, m: number, d: number): { branch: string; jieName: string } {
  // 找最近一个已过的"节"
  let best: { year: number; jie: JieDef; day: number } | null = null;
  for (let year = y - 1; year <= y; year++) {
    for (const jie of JIE) {
      const jd = jieDay(year, jie);
      const dt = year * 10000 + jie.month * 100 + jd;
      const cur = y * 10000 + m * 100 + d;
      if (dt <= cur && (!best || dt > best.year * 10000 + best.jie.month * 100 + best.day)) {
        best = { year, jie, day: jd };
      }
    }
  }
  return { branch: best!.jie.branch, jieName: best!.jie.name };
}

// 月干：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，若问戊癸何方发，甲寅之上好追求
const MONTH_STEM_START: Record<string, number> = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 };

// 时干：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
const HOUR_STEM_START: Record<string, number> = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 };

export function hourBranch(hour: number): string {
  // 子时 23:00-01:00
  const h = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  return BRANCHES[h];
}

export function computeGanZhi(date: Date): GanZhi {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const hh = date.getHours();

  // 日柱（晚子时日柱按次日算的流派存在，本系统按日历日取日柱，与主流排盘软件一致）
  const day = dayGanZhi(y, m, d);

  // 年柱：立春前属上一年
  const lichunDay = jieDay(y, JIE[1]);
  const beforeLichun = m < 2 || (m === 2 && d < lichunDay);
  const gzYear = beforeLichun ? y - 1 : y;
  const yearIndex = ((gzYear - 4) % 60 + 60) % 60;
  const yearGz = STEMS[yearIndex % 10] + BRANCHES[yearIndex % 12];

  // 月柱
  const { branch: mBranch, jieName } = monthBranchByJieqi(y, m, d);
  const mBranchIdx = BRANCHES.indexOf(mBranch as never);
  const yearStem = yearGz[0];
  const monthStemIdx = (MONTH_STEM_START[yearStem] + ((mBranchIdx - 2 + 12) % 12)) % 10;
  const monthGz = STEMS[monthStemIdx] + mBranch;
  const monthIndex = monthStemIdx + mBranchIdx * 10; // 仅供参考

  // 时柱
  const hBranch = hourBranch(hh);
  const hBranchIdx = BRANCHES.indexOf(hBranch as never);
  const hourStemIdx = (HOUR_STEM_START[day.gz[0]] + hBranchIdx) % 10;
  const hourGz = STEMS[hourStemIdx] + hBranch;

  return {
    year: yearGz, month: monthGz, day: day.gz, hour: hourGz,
    yearIndex, monthIndex, dayIndex: day.index, hourIndex: hourStemIdx + hBranchIdx * 10,
    monthBranch: mBranch, dayBranch: day.gz[1], dayStem: day.gz[0], hourBranch: hBranch,
    jieqi: jieName,
  };
}

/** 60甲子表（供出空/应期推算） */
export function jiaziOf(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return STEMS[i % 10] + BRANCHES[i % 12];
}

/** 求某日期前后最近的两个「节」（八字排大运起运数用，近似公式误差±1天） */
export function nearbyJie(y: number, m: number, d: number): {
  prev: { name: string; date: string }; next: { name: string; date: string };
} {
  const all: { name: string; t: number; date: string }[] = [];
  for (let year = y - 1; year <= y + 1; year++) {
    for (const jie of JIE) {
      const jd = jieDay(year, jie);
      all.push({
        name: jie.name,
        t: year * 10000 + jie.month * 100 + jd,
        date: `${year}-${String(jie.month).padStart(2, '0')}-${String(jd).padStart(2, '0')}`,
      });
    }
  }
  all.sort((a, b) => a.t - b.t);
  const cur = y * 10000 + m * 100 + d;
  const prev = [...all].reverse().find((j) => j.t <= cur) ?? all[0];
  const next = all.find((j) => j.t > cur) ?? all[all.length - 1];
  return { prev, next };
}
