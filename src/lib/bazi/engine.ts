// 八字排盘引擎 —— 排四柱、定十神、五行旺衰、排大运
// 体系依据：《千里命稿》《四柱预测学》排盘法；《渊海子平》十神六亲；
// 《滴天髓》旺衰喜忌；《子平真诠》月令格局；《三命通会》纳音神煞
import { STEMS, BRANCHES, STEM_ELEMENT, BRANCH_ELEMENT, SHENG, KE, xunKong } from '../liuyao/constants';
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

export interface PillarInfo {
  name: '年柱' | '月柱' | '日柱' | '时柱';
  gz: string;
  stem: string;
  branch: string;
  stemElement: Element5;
  branchElement: Element5;
  /** 天干十神（日主本身为「日主」） */
  shiShen: string;
  /** 藏干及各自十神 */
  canggan: { stem: string; shiShen: string }[];
  nayin: string;
  kong: boolean; // 地支临日柱旬空
}

export interface DaYunItem {
  gz: string;
  stem: string;
  branch: string;
  shiShen: string;
  startAge: number;
  startYear: number;
}

export interface BaZiChart {
  gender: 'male' | 'female';
  genderLabel: '乾造' | '坤造';
  ganzhi: GanZhi;
  pillars: PillarInfo[];
  dayMaster: string;
  dayMasterElement: Element5;
  kong: [string, string];
  /** 五行力量统计（天干各1、地支本气各1、月支再加1权重，教学简化算法） */
  wuxingCount: Record<Element5, number>;
  totalPower: number;
  selfPower: number;      // 同我（比劫）+ 生我（印枭）
  selfRatio: number;
  strengthLabel: '身强' | '中和偏强' | '中和偏弱' | '身弱';
  strengthNotes: string[];
  deLing: boolean;        // 日主是否得令于月支
  dayunDir: '顺行' | '逆行';
  qiyunAge: number;
  qiyunNote: string;
  dayun: DaYunItem[];
}

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
    };
  };
  const pillars = [mk('年柱', gz.year), mk('月柱', gz.month), mk('日柱', gz.day), mk('时柱', gz.hour)];

  // 五行力量统计（教学简化：天干1、地支本气1、月支权重×2）
  const wuxingCount: Record<Element5, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    wuxingCount[p.stemElement] += 1;
    wuxingCount[p.branchElement] += p.name === '月柱' ? 2 : 1;
  }
  const totalPower = ELEMENTS.reduce((s, e) => s + wuxingCount[e], 0);
  // 同我（比劫）+ 生我（印枭）为扶身之力
  const shengMe = (Object.keys(SHENG) as Element5[]).find((e) => SHENG[e] === dmElem)!;
  const selfPower = wuxingCount[dmElem] + wuxingCount[shengMe];
  const selfRatio = selfPower / totalPower;

  const strengthLabel: BaZiChart['strengthLabel'] =
    selfRatio >= 0.6 ? '身强' : selfRatio >= 0.45 ? '中和偏强' : selfRatio >= 0.35 ? '中和偏弱' : '身弱';

  // 得令：月支五行同我或生我（《滴天髓》论旺衰首看得令）
  const monthElem = BRANCH_ELEMENT[gz.monthBranch];
  const deLing = monthElem === dmElem || SHENG[monthElem] === dmElem;

  const strengthNotes: string[] = [
    deLing
      ? `日主${dayMaster}${dmElem}生于${gz.monthBranch}月（${monthElem}），${monthElem === dmElem ? '同气' : '得生'}，为得令（《滴天髓》：得令者旺）`
      : `日主${dayMaster}${dmElem}生于${gz.monthBranch}月（${monthElem}），不得月令之助（失令者多弱）`,
    `全局扶身之力（比劫+印枭）${selfPower} 分 / 总力量 ${totalPower} 分 ≈ ${(selfRatio * 100).toFixed(0)}%`,
    `综合判为「${strengthLabel}」（教学简化算法：天干计1、地支本气计1、月支权重×2；实际论命还需看得地、得势与通根，详见《滴天髓》《子平真诠》）`,
  ];

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
    wuxingCount,
    totalPower,
    selfPower,
    selfRatio,
    strengthLabel,
    strengthNotes,
    deLing,
    dayunDir,
    qiyunAge,
    qiyunNote,
    dayun,
  };
}
