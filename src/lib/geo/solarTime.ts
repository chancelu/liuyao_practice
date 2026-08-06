// 真太阳时修正：北京时间（东八区标准时，经线 120°E）→ 当地真太阳时
// 两部分修正：
//   ① 经度修正（平太阳时）：经度每偏 1°，太阳时差 4 分钟（东加西减）
//   ② 均时差（Equation of Time）：地球公转椭圆轨道与自转轴倾角导致真太阳日长短不均，全年 ±16 分钟
// 真太阳时 = 北京时间 + 经度修正 + 均时差

export interface SolarInfo {
  lng: number;        // 出生地经度（°E）
  lngMin: number;     // 经度修正（分钟，可负）
  eotMin: number;     // 均时差（分钟，可负）
  offsetMin: number;  // 合计修正（分钟）
  corrected: Date;    // 修正后的真太阳时
}

/** 均时差（分钟），通用近似公式，误差 <1 分钟 */
export function equationOfTime(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const n = Math.floor((date.getTime() - start.getTime()) / 86400000); // 年积日
  const b = ((2 * Math.PI) / 365) * (n - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** 由北京时间与出生地经度求真太阳时 */
export function solarCorrection(beijing: Date, lng: number): SolarInfo {
  const lngMin = (lng - 120) * 4;
  const eotMin = equationOfTime(beijing);
  const offsetMin = lngMin + eotMin;
  return { lng, lngMin, eotMin, offsetMin, corrected: new Date(beijing.getTime() + offsetMin * 60000) };
}

/** 把 "YYYY-MM-DD" + "HH:MM" 组装成本地 Date（非法返回 null） */
export function dateTimeOf(date: string, time: string): Date | null {
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** 时辰序号（子=0 … 亥=11），按小时归属两小时辰 */
export function shichenIndex(hour: number): number {
  return hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
}

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function shichenName(d: Date): string {
  return `${BRANCH_NAMES[shichenIndex(d.getHours())]}时`;
}

export function fmtMin(min: number): string {
  const sign = min >= 0 ? '+' : '−';
  return `${sign}${Math.abs(min).toFixed(1)} 分钟`;
}

export function fmtTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
