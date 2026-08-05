// 八字排盘引擎 —— 排四柱、定十神、地势自坐、神煞胎元、三因子旺衰、排大运
// 体系依据：《千里命稿》《四柱预测学》排盘法；《渊海子平》十神六亲；
// 《滴天髓》旺衰喜忌；《子平真诠》月令格局；《三命通会》纳音神煞
import { STEMS, BRANCHES, STEM_ELEMENT, BRANCH_ELEMENT, SHENG, KE, SEASON_WANG, xunKong } from '../liuyao/constants';
import type { Element5 } from '../liuyao/constants';
import { computeGanZhi, jiaziOf, nearbyJie } from '../liuyao/calendar';
import type { GanZhi } from '../liuyao/calendar';

export const ELEMENTS: Element5[] = ['木', '火', '土', '金', '水'];

const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'];
const isYangStem = (s: string) => YANG_STEMS.includes(s);

/** 十神：以日主天干为「我」，论其他天干（《渊海子平》） */
export function shiShen(dayStem: string, other: string): string {
  const de = STEM_ELEMENT[dayStem];
  const oe = STEM_ELEMENT[other];
  const samePol = isYangStem(dayStem) === isYangStem(other);
  if (de === oe) return samePol ? '比肩' : '劫财';      // 同我者
  if (SHENG[de] === oe) return samePol ? '食神' : '伤官'; // 我生者
  if (KE[de] === oe) return samePol ? '偏财' : '正财';    // 我克者
  if (KE[oe] === de) return samePol ? '七杀' : '正官';    // 克我者
  return samePol ? '偏印' : '正印';                        // 生我者
}

/** 地支藏干（本气·中气·余气） */
export const CANGGAN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

/** 六十甲子纳音（《三命通会》） */
const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土',
  '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金',
  '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

export function gzIndexOf(stem: string, branch: string): number {
  const s = STEMS.indexOf(stem as never);
  const b = BRANCHES.indexOf(branch as never);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  return 0;
}

// ============ 十二长生（阳干顺行、阴干逆行） ============
const CS12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
const CS_START: Record<string, string> = {
  甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', // 阳干长生
  乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯', // 阴干长生
};
/** 某天干在某地支的十二长生状态（地势/自坐通用） */
export function changsheng12(stem: string, branch: string): string {
  const yang = isYangStem(stem);
  const si = BRANCHES.indexOf(CS_START[stem] as never);
  const bi = BRANCHES.indexOf(branch as never);
  const diff = yang ? (bi - si + 12) % 12 : (si - bi + 12) % 12;
  return CS12[diff];
}

// ============ 神煞（《三命通会》） ============
const TIANYI: Record<string, string[]> = { // 天乙贵人：甲戊庚牛羊…
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['寅', '午'],
};
const WENCHANG: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LUSHEN: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const YANGREN: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }; // 阳干论刃
// 三合局神煞：桃花/驿马/华盖/将星（按年支与日支两支查）
const SANHE_GROUP: Record<string, string> = {}; // 支 → 局名
for (const b of ['申', '子', '辰']) SANHE_GROUP[b] = '申子辰';
for (const b of ['寅', '午', '戌']) SANHE_GROUP[b] = '寅午戌';
for (const b of ['巳', '酉', '丑']) SANHE_GROUP[b] = '巳酉丑';
for (const b of ['亥', '卯', '未']) SANHE_GROUP[b] = '亥卯未';
const GROUP_SHA: Record<string, { 桃花: string; 驿马: string; 华盖: string; 将星: string }> = {
  申子辰: { 桃花: '酉', 驿马: '寅', 华盖: '辰', 将星: '子' },
  寅午戌: { 桃花: '卯', 驿马: '申', 华盖: '戌', 将星: '午' },
  巳酉丑: { 桃花: '午', 驿马: '亥', 华盖: '丑', 将星: '酉' },
  亥卯未: { 桃花: '子', 驿马: '巳', 华盖: '未', 将星: '卯' },
};

/** 汇总某地支所临神煞（以日干为主查贵人/文昌/禄刃，以年支日支查三合局煞） */
function shenshaOfBranch(branch: string, dayStem: string, yearBranch: string, dayBranch: string): string[] {
  const out: string[] = [];
  if (TIANYI[dayStem]?.includes(branch)) out.push('天乙贵人');
  if (WENCHANG[dayStem] === branch) out.push('文昌');
  if (LUSHEN[dayStem] === branch) out.push('禄神');
  if (YANGREN[dayStem] === branch) out.push('羊刃');
  for (const [label, ref] of [['日支', dayBranch], ['年支', yearBranch]] as const) {
    const g = GROUP_SHA[SANHE_GROUP[ref]];
    if (!g) continue;
    for (const [name, target] of Object.entries(g)) {
      if (target === branch) out.push(label === '日支' ? name : `${name}(年)`);
    }
  }
  return out;
}

// ============ 类型 ============
export interface PillarInfo {
  name: '年柱' | '月柱' | '日柱' | '时柱';
  gz: string;
  stem: string;
  branch: string;
  stemElement: Element5;
  branchElement: Element5;
  shiShen: string;
  canggan: { stem: string; shiShen: string }[];
  nayin: string;
  kong: boolean;
  dishi: string;    // 地势：日主在此支的十二长生
  zizuo: string;    // 自坐：本柱天干坐本柱地支的十二长生
  shensha: string[];
}

export interface DaYunItem {
  gz: string;
  stem: string;
  branch: string;
  shiShen: string;
  startAge: number;
  startYear: number;
}

export interface StrengthFactor {
  score: number;
  max: number;
  verdict: string;   // 一句话结论
  items: string[];   // 逐项明细
}

export interface StrengthAnalysis {
  total: number;     // /100
  label: '身强' | '中和偏强' | '中和偏弱' | '身弱';
  deling: StrengthFactor;
  dedi: StrengthFactor;
  deshi: StrengthFactor;
  summary: string;
}

export interface BaZiChart {
  gender: 'male' | 'female';
  genderLabel: '乾造' | '坤造';
  ganzhi: GanZhi;
  pillars: PillarInfo[];
  dayMaster: string;
  dayMasterElement: Element5;
  kong: [string, string];
  taiyuan: string;   // 胎元（月柱后一位）
  wuxingCount: Record<Element5, number>;
  totalPower: number;
  strength: StrengthAnalysis;
  deLing: boolean;
  dayunDir: '顺行' | '逆行';
  qiyunAge: number;
  qiyunNote: string;
  dayun: DaYunItem[];
}

// ============ 旺衰三因子详析（得令40 + 得地30 + 得势30） ============
function analyzeStrength(
  dayMaster: string,
  dmElem: Element5,
  pillars: PillarInfo[],
  monthBranch: string,
): StrengthAnalysis {
  // —— 得令（权重 40）：月令中日主的旺相休囚死 ——
  const seasonElem = BRANCH_ELEMENT[monthBranch]; // 月支五行即当令之气
  const state = SEASON_WANG[seasonElem]?.[dmElem] ?? '休';
  const stateScore: Record<string, number> = { 旺: 40, 相: 32, 休: 20, 囚: 12, 死: 4 };
  const stateMeaning: Record<string, string> = {
    旺: '当令而旺，如帝王在位', 相: '得令之生，如太子得势', 休: '生令而泄，如退休休养',
    囚: '克令被困，如身陷囹圄', 死: '被令所克，气机最弱',
  };
  const delingScore = stateScore[state] ?? 20;
  const deling: StrengthFactor = {
    score: delingScore,
    max: 40,
    verdict: `日主${dayMaster}${dmElem}生于${monthBranch}月，四季旺衰为「${state}」（${stateMeaning[state]}）`,
    items: [
      `月令是全局气候的总开关，权重最大（《子平真诠》：月令者，命中之枢纽）`,
      `月支${monthBranch}五行属${BRANCH_ELEMENT[monthBranch]}，与日主${dmElem}的关系：${
        BRANCH_ELEMENT[monthBranch] === dmElem ? '同气（比劫之地，最助身）'
        : SHENG[BRANCH_ELEMENT[monthBranch]] === dmElem ? '生我（印星之地，得生扶）'
        : SHENG[dmElem] === BRANCH_ELEMENT[monthBranch] ? '我生（食伤之地，泄我气）'
        : KE[dmElem] === BRANCH_ELEMENT[monthBranch] ? '我克（财星之地，耗我力）'
        : '克我（官杀之地，制我身）'
      }`,
    ],
  };

  // —— 得地（权重 30）：四支藏干中有无日主同类的根气（通根） ——
  const rootScoreMap = [12, 8, 4]; // 本气/中气/余气
  const rootName = ['本气根', '中气根', '余气根'];
  const rootItems: string[] = [];
  let dediScore = 0;
  for (const p of pillars) {
    CANGGAN[p.branch].forEach((cgStem, idx) => {
      if (STEM_ELEMENT[cgStem] === dmElem) {
        const sc = rootScoreMap[Math.min(idx, 2)];
        dediScore += sc;
        rootItems.push(`${p.name.replace('柱', '')}支${p.branch}中藏${cgStem}${dmElem}（${rootName[Math.min(idx, 2)]}，+${sc}）`);
      }
    });
  }
  dediScore = Math.min(dediScore, 30);
  const dedi: StrengthFactor = {
    score: dediScore,
    max: 30,
    verdict: rootItems.length
      ? `日主通根 ${rootItems.length} 处：${rootItems.length >= 2 ? '根气扎实，如树有深根' : '根气尚浅'}`
      : '日主在四支中毫无根气（无根之木，最忌虚浮）',
    items: rootItems.length
      ? rootItems
      : ['天干为苗、地支为根——日主无根则纵有印比帮扶也力弱（《滴天髓》：得地者蒂固根深）', '印星所生之气可补根之不足，详见得势一项'],
  };

  // —— 得势（权重 30）：年月时天干中比劫印枭的帮扶 ——
  const helpItems: string[] = [];
  let deshiScore = 0;
  for (const p of pillars) {
    if (p.name === '日柱') continue;
    const ss = p.shiShen;
    if (ss === '比肩' || ss === '劫财') {
      deshiScore += 8;
      helpItems.push(`${p.name.replace('柱', '')}干${p.stem}为${ss}（与我同类，直接帮身，+8）`);
    } else if (ss === '正印' || ss === '偏印') {
      deshiScore += 6;
      helpItems.push(`${p.name.replace('柱', '')}干${p.stem}为${ss}（生我之源，间接助身，+6）`);
    } else {
      helpItems.push(`${p.name.replace('柱', '')}干${p.stem}为${ss}（${ss === '食神' || ss === '伤官' ? '泄我' : ss === '偏财' || ss === '正财' ? '耗我' : '克我'}，不助身，+0）`);
    }
  }
  deshiScore = Math.min(deshiScore, 30);
  const deshi: StrengthFactor = {
    score: deshiScore,
    max: 30,
    verdict: deshiScore >= 14 ? '天干印比成势，左辅右弼' : deshiScore > 0 ? '天干略有帮扶，势单力薄' : '天干克泄耗环伺，孤立无援',
    items: helpItems,
  };

  const total = delingScore + dediScore + deshiScore;
  const label: StrengthAnalysis['label'] =
    total >= 62 ? '身强' : total >= 47 ? '中和偏强' : total >= 33 ? '中和偏弱' : '身弱';

  return {
    total,
    label,
    deling,
    dedi,
    deshi,
    summary: `得令 ${delingScore}/40 + 得地 ${dediScore}/30 + 得势 ${deshiScore}/30 = ${total}/100，判为「${label}」。身强者宜克泄耗（财官食伤）以成器，身弱者宜生扶（印枭比劫）以固本；此为教学量化模型，细论还须参看合化、通关与调候（《滴天髓》《穷通宝鉴》）。`,
  };
}

// ============ 排盘主函数 ============
export function paipanBazi(date: Date, gender: 'male' | 'female'): BaZiChart {
  const gz = computeGanZhi(date);
  const dayMaster = gz.dayStem;
  const dmElem = STEM_ELEMENT[dayMaster];
  const kong = xunKong(gz.dayIndex);

  const mk = (name: PillarInfo['name'], gzs: string): PillarInfo => {
    const stem = gzs[0];
    const branch = gzs[1];
    return {
      name, gz: gzs, stem, branch,
      stemElement: STEM_ELEMENT[stem],
      branchElement: BRANCH_ELEMENT[branch],
      shiShen: name === '日柱' ? '日主' : shiShen(dayMaster, stem),
      canggan: CANGGAN[branch].map((s) => ({ stem: s, shiShen: shiShen(dayMaster, s) })),
      nayin: NAYIN[Math.floor(gzIndexOf(stem, branch) / 2)],
      kong: kong.includes(branch),
      dishi: changsheng12(dayMaster, branch),
      zizuo: changsheng12(stem, branch),
      shensha: shenshaOfBranch(branch, dayMaster, gz.year[1], gz.dayBranch),
    };
  };
  const pillars = [mk('年柱', gz.year), mk('月柱', gz.month), mk('日柱', gz.day), mk('时柱', gz.hour)];

  // 胎元：月柱干支各进一位（受胎之月，《三命通会》）
  const taiyuan = jiaziOf(gzIndexOf(gz.month[0], gz.month[1]) + 1);

  // 五行力量统计（供条形图：天干1、地支本气1、月支权重×2）
  const wuxingCount: Record<Element5, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    wuxingCount[p.stemElement] += 1;
    wuxingCount[p.branchElement] += p.name === '月柱' ? 2 : 1;
  }
  const totalPower = ELEMENTS.reduce((s, e) => s + wuxingCount[e], 0);

  const strength = analyzeStrength(dayMaster, dmElem, pillars, gz.monthBranch);
  const deLing = strength.deling.score >= 32; // 旺或相

  // 大运：阳男阴女顺行，阴男阳女逆行（《千里命稿》）
  const yearYang = isYangStem(gz.year[0]);
  const forward = (yearYang && gender === 'male') || (!yearYang && gender === 'female');
  const dayunDir = forward ? '顺行' : '逆行';

  // 起运数：顺行数到下一个节，逆行数到上一个节，三天折一年（《三命通会》）
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const { prev, next } = nearbyJie(y, m, d);
  const target = forward ? next : prev;
  const birth = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = target.date.split('-').map(Number);
  const days = Math.abs(Math.round((new Date(ty, tm - 1, td).getTime() - birth) / 86400000));
  const qiyunAge = Math.round((days / 3) * 10) / 10;
  const qiyunNote = `${forward ? '顺行，自生日数至下一个节' : '逆行，自生日数回上一个节'}「${target.name}」（${target.date}），相距约 ${days} 天，三日折一年，约 ${qiyunAge} 岁起运（节气为近似日期，误差±1天）`;

  const monthIdx = gzIndexOf(gz.month[0], gz.month[1]);
  const dayun: DaYunItem[] = [];
  for (let i = 1; i <= 8; i++) {
    const idx = ((monthIdx + (forward ? i : -i)) % 60 + 60) % 60;
    const dg = jiaziOf(idx);
    const startAge = Math.round(qiyunAge) + (i - 1) * 10;
    dayun.push({
      gz: dg, stem: dg[0], branch: dg[1],
      shiShen: shiShen(dayMaster, dg[0]),
      startAge, startYear: y + startAge,
    });
  }

  return {
    gender,
    genderLabel: gender === 'male' ? '乾造' : '坤造',
    ganzhi: gz,
    pillars,
    dayMaster,
    dayMasterElement: dmElem,
    kong,
    taiyuan,
    wuxingCount,
    totalPower,
    strength,
    deLing,
    dayunDir,
    qiyunAge,
    qiyunNote,
    dayun,
  };
}
