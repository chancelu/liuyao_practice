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
const TAIJI: Record<string, string[]> = { // 太极贵人：甲乙子午中…
  甲: ['子', '午'], 乙: ['子', '午'],
  丙: ['卯', '酉'], 丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'], 己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'], 辛: ['寅', '亥'],
  壬: ['巳', '申'], 癸: ['巳', '申'],
};
const WENCHANG: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LUSHEN: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const JINYU: Record<string, string> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' }; // 金舆
const HONGYAN: Record<string, string> = { 甲: '午', 乙: '申', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' }; // 红艳
const YANGREN: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }; // 羊刃（阳干论刃）
const TIANDE: Record<string, string> = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' }; // 天德（按月支，干或支）
const YUEDE: Record<string, string> = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' }; // 月德（按月支三合局之阳干）
// 红鸾天喜（按年支，互为对冲）
const HONGLUAN: Record<string, string> = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };
// 孤辰寡宿（按年支三会局）
const GUCHEN: Record<string, string> = { 亥: '寅', 子: '寅', 丑: '寅', 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥' };
const GUASU: Record<string, string> = { 亥: '戌', 子: '戌', 丑: '戌', 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未' };
// 日柱级神煞
const SHILING_RI = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];
const KUIGANG_RI = ['庚辰', '庚戌', '壬辰', '戊戌'];
const YINYANG_CHACUO_RI = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
// 三合局神煞：桃花/驿马/华盖/将星/劫煞/亡神（按年支与日支两支查）
const SANHE_GROUP: Record<string, string> = {}; // 支 → 局名
for (const b of ['申', '子', '辰']) SANHE_GROUP[b] = '申子辰';
for (const b of ['寅', '午', '戌']) SANHE_GROUP[b] = '寅午戌';
for (const b of ['巳', '酉', '丑']) SANHE_GROUP[b] = '巳酉丑';
for (const b of ['亥', '卯', '未']) SANHE_GROUP[b] = '亥卯未';
const GROUP_SHA: Record<string, Record<string, string>> = {
  申子辰: { 桃花: '酉', 驿马: '寅', 华盖: '辰', 将星: '子', 劫煞: '巳', 亡神: '亥' },
  寅午戌: { 桃花: '卯', 驿马: '申', 华盖: '戌', 将星: '午', 劫煞: '亥', 亡神: '巳' },
  巳酉丑: { 桃花: '午', 驿马: '亥', 华盖: '丑', 将星: '酉', 劫煞: '寅', 亡神: '申' },
  亥卯未: { 桃花: '子', 驿马: '巳', 华盖: '未', 将星: '卯', 劫煞: '申', 亡神: '寅' },
};

interface ShaCtx { dayStem: string; yearBranch: string; dayBranch: string; monthBranch: string; dayGz: string }

/** 汇总某柱所临神煞（日干查贵人禄刃等，年/日支查三合局煞，月支查天德月德天医，年支查红鸾天喜孤辰寡宿） */
function shenshaOfPillar(stem: string, branch: string, isDayPillar: boolean, c: ShaCtx): string[] {
  const out: string[] = [];
  const add = (s: string) => { if (!out.includes(s)) out.push(s); };
  // 日干所查
  if (TIANYI[c.dayStem]?.includes(branch)) add('天乙贵人');
  if (TAIJI[c.dayStem]?.includes(branch)) add('太极贵人');
  if (WENCHANG[c.dayStem] === branch) add('文昌');
  if (LUSHEN[c.dayStem] === branch) add('禄神');
  if (JINYU[c.dayStem] === branch) add('金舆');
  if (HONGYAN[c.dayStem] === branch) add('红艳');
  if (YANGREN[c.dayStem] === branch) add('羊刃');
  // 月支所查（天德月德可能是天干也可能是地支）
  if (TIANDE[c.monthBranch] === branch || TIANDE[c.monthBranch] === stem) add('天德贵人');
  if (YUEDE[c.monthBranch] === stem) add('月德贵人');
  // 天医：月支退一位
  const mbIdx = BRANCHES.indexOf(c.monthBranch as never);
  if (BRANCHES[(mbIdx + 11) % 12] === branch) add('天医');
  // 年支所查
  if (HONGLUAN[c.yearBranch] === branch) add('红鸾');
  const hlIdx = BRANCHES.indexOf(HONGLUAN[c.yearBranch] as never);
  if (BRANCHES[(hlIdx + 6) % 12] === branch) add('天喜');
  if (GUCHEN[c.yearBranch] === branch) add('孤辰');
  if (GUASU[c.yearBranch] === branch) add('寡宿');
  // 三合局煞（日支为主，年支兼查加注）
  for (const [label, ref] of [['日支', c.dayBranch], ['年支', c.yearBranch]] as const) {
    const g = GROUP_SHA[SANHE_GROUP[ref]];
    if (!g) continue;
    for (const [name, target] of Object.entries(g)) {
      if (target === branch) add(label === '日支' ? name : `${name}(年)`);
    }
  }
  // 日柱级
  if (isDayPillar) {
    if (SHILING_RI.includes(c.dayGz)) add('十灵日');
    if (KUIGANG_RI.includes(c.dayGz)) add('魁罡');
    if (YINYANG_CHACUO_RI.includes(c.dayGz)) add('阴阳差错');
  }
  return out;
}

// ============ 月令取格（《子平真诠》） ============
export interface GejuResult {
  name: string;      // 正官格 / 七杀格 / 建禄格……
  touGan: string;    // 透出之干（无则空串）
  steps: string[];   // 取格推演过程
  note: string;      // 成格喜忌一句话
}

/** 八正格喜忌口诀（教学一句话版，据《子平真诠》各格论） */
const GEJU_NOTES: Record<string, string> = {
  正官格: '喜财星生官、印星护官；忌伤官见官、七杀混杂（官杀混杂须去留）。',
  七杀格: '喜食神制杀、印绶化杀；忌财星生杀、身弱无制——杀无制则为祸。',
  正财格: '喜身旺任财、食伤生财；忌比劫争财、财多身弱（富屋贫人）。',
  偏财格: '喜身旺有官星护财；忌比劫分夺。偏财为众人之财，最忌分夺。',
  正印格: '喜官星相生、身旺任印；忌财星坏印（贪财坏印，因财失义）。',
  偏印格: '喜偏财制枭、身旺；忌枭印夺食（见食神则为倒食，主福气受损）。',
  食神格: '喜身旺、食神生财；忌枭印夺食。食神为寿星福星，最宜无伤。',
  伤官格: '喜伤官生财、伤官配印；忌伤官见官（唯金水伤官喜见官，须辨寒暖）。',
  建禄格: '月建为禄，不取比劫为格——须别取财官食伤为用，身旺无依则劳碌。',
  阳刃格: '刃为至刚之物，喜官杀制刃成权；忌刑冲合害动刃、财运惹刃之祸。',
};

/** 月令取格：月令人元透干者取格；不透则以主气立格；月建比劫则为建禄/阳刃（《子平真诠·论用神》） */
export function analyzeGeju(dayMaster: string, pillars: PillarInfo[]): GejuResult {
  const monthPillar = pillars[1];
  const mb = monthPillar.branch;
  const hidden = CANGGAN[mb]; // [主气, 中气, 余气]
  const outerStems = pillars.filter((p) => p.name !== '日柱').map((p) => ({ name: p.name.slice(0, 1), stem: p.stem }));
  const steps: string[] = [];
  steps.push(`《子平真诠》：「八字用神，专求月令」——先看月支 ${mb} 的藏干（人元）：${hidden.map((s, i) => `${s}${STEM_ELEMENT[s]}（${['主气', '中气', '余气'][i]}，十神${shiShen(dayMaster, s)}）`).join('、')}`);

  const mainSS = shiShen(dayMaster, hidden[0]);
  // 月建比劫不取为格：建禄 / 阳刃
  if (mainSS === '比肩' || mainSS === '劫财') {
    const isLu = mainSS === '比肩';
    steps.push(`月支主气 ${hidden[0]} 是日主的${mainSS}——月令为日主之${isLu ? '禄地（临官）' : '刃地（劫财旺乡）'}，比劫不立为正格，名为「${isLu ? '建禄' : '阳刃'}格」，用神须别取财官食伤。`);
    return { name: isLu ? '建禄格' : '阳刃格', touGan: '', steps, note: GEJU_NOTES[isLu ? '建禄格' : '阳刃格'] };
  }

  // 依次看主气→中气→余气是否透出年月时干
  for (let i = 0; i < hidden.length; i++) {
    const hs = hidden[i];
    const ss = shiShen(dayMaster, hs);
    const hit = outerStems.find((o) => o.stem === hs);
    const qiName = ['主气', '中气', '余气'][i];
    if (hit) {
      steps.push(`${qiName} ${hs} 透出${hit.name}柱天干——透干则清而有力，即以「${ss}」立格。`);
      return { name: `${ss}格`, touGan: hs, steps, note: GEJU_NOTES[`${ss}格`] ?? '' };
    }
    steps.push(`${qiName} ${hs}（${ss}）未透出天干${i < hidden.length - 1 ? '，再看下一层人元' : ''}。`);
  }
  steps.push(`三任人元皆不透，以月支主气 ${hidden[0]} 立格——虽不透干，月令之气仍是一局之纲。`);
  return { name: `${mainSS}格`, touGan: '', steps, note: GEJU_NOTES[`${mainSS}格`] ?? '' };
}

// ============ 刑冲合害（地支关系） ============
export interface RelationItem {
  kind: string;   // 六冲 / 六合 / 三合局 / 三会方 / 相刑 / 自刑 / 六害 / 相破 / 天干五合
  pair: string;   // 「月支子 × 日支午」
  detail: string; // 教学解释
  tone: 'good' | 'bad' | 'neutral';
}

const LIU_CHONG: Record<string, string> = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const LIU_HE: Record<string, [string, string]> = { // 六合 → [对方, 合化五行]
  子: ['丑', '土'], 丑: ['子', '土'], 寅: ['亥', '木'], 亥: ['寅', '木'], 卯: ['戌', '火'], 戌: ['卯', '火'],
  辰: ['酉', '金'], 酉: ['辰', '金'], 巳: ['申', '水'], 申: ['巳', '水'], 午: ['未', '土'], 未: ['午', '土'],
};
const LIU_HAI: Record<string, string> = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const LIU_PO: Record<string, string> = { 子: '酉', 酉: '子', 丑: '辰', 辰: '丑', 寅: '亥', 亥: '寅', 卯: '午', 午: '卯', 巳: '申', 申: '巳', 未: '戌', 戌: '未' };
const XING_PAIR: Record<string, [string, string]> = { // 相刑 → [对方, 刑名]
  寅: ['巳', '恃势之刑'], 巳: ['申', '恃势之刑'], 申: ['寅', '恃势之刑'],
  丑: ['戌', '无恩之刑'], 戌: ['未', '无恩之刑'], 未: ['丑', '无恩之刑'],
  子: ['卯', '无礼之刑'], 卯: ['子', '无礼之刑'],
};
const ZI_XING = ['辰', '午', '酉', '亥'];
const TIAN_GAN_HE: Record<string, [string, string]> = { 甲: ['己', '土'], 己: ['甲', '土'], 乙: ['庚', '金'], 庚: ['乙', '金'], 丙: ['辛', '水'], 辛: ['丙', '水'], 丁: ['壬', '木'], 壬: ['丁', '木'], 戊: ['癸', '火'], 癸: ['戊', '火'] };
const SANHE_JU: [string[], string][] = [[['申', '子', '辰'], '水'], [['寅', '午', '戌'], '火'], [['巳', '酉', '丑'], '金'], [['亥', '卯', '未'], '木']];
const SANHUI_FANG: [string[], string][] = [[['寅', '卯', '辰'], '木（东方）'], [['巳', '午', '未'], '火（南方）'], [['申', '酉', '戌'], '金（西方）'], [['亥', '子', '丑'], '水（北方）']];

/** 柱位组合的人事含义（教学简版） */
const POSITION_MEANING: Record<string, string> = {
  年月: '早年、祖辈与父母宫', 月日: '父母与夫妻宫（门户之内）', 日时: '夫妻与子女宫（中晚年）',
  年日: '祖辈与自身', 月时: '父母与子女宫', 年时: '早年与晚景（隔位遥应，力减）',
};

/** 分析四柱干支间的合冲刑害（《三命通会》《渊海子平》） */
export function analyzeRelations(pillars: PillarInfo[]): RelationItem[] {
  const items: RelationItem[] = [];
  const bs = pillars.map((p) => ({ pos: p.name.slice(0, 1), branch: p.branch }));
  const ss = pillars.map((p) => ({ pos: p.name.slice(0, 1), stem: p.stem }));
  const branchOf = (b: string) => bs.filter((x) => x.branch === b);

  // —— 天干五合 ——
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const [other, elem] = TIAN_GAN_HE[ss[i].stem] ?? [];
    if (other === ss[j].stem) {
      items.push({
        kind: '天干五合', pair: `${ss[i].pos}干${ss[i].stem} × ${ss[j].pos}干${ss[j].stem}`, tone: 'good',
        detail: `${ss[i].stem}${ss[j].stem}合化${elem}。天干之合主情投意合、相互牵绊；合而化与不化须看月令是否扶助化神（《渊海子平》）。`,
      });
    }
  }

  // —— 地支两两关系 ——
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = bs[i], b = bs[j];
    const pairLabel = `${a.pos}支${a.branch} × ${b.pos}支${b.branch}`;
    const posKey = [a.pos, b.pos].sort().join('');
    const where = POSITION_MEANING[posKey] ?? '';
    if (LIU_CHONG[a.branch] === b.branch) {
      items.push({ kind: '六冲', pair: pairLabel, tone: 'bad', detail: `${a.branch}${b.branch}相冲，波及${where}。冲者动也、散也——主变动、冲突、分离；两旺相冲为「冲起」，弱冲旺为「冲不动」，须看双方力量（《三命通会》）。` });
    }
    const he = LIU_HE[a.branch];
    if (he && he[0] === b.branch) {
      items.push({ kind: '六合', pair: pairLabel, tone: 'good', detail: `${a.branch}${b.branch}合化${he[1]}，涉及${where}。合者亲也——主亲近、合作、牵绊；合而逢冲则先合后分。` });
    }
    const xing = XING_PAIR[a.branch];
    if (xing && xing[0] === b.branch) {
      items.push({ kind: '相刑', pair: pairLabel, tone: 'bad', detail: `${a.branch}${b.branch}相刑（${xing[1]}），涉及${where}。刑主刑伤、是非、人际失和；恃势之刑易仗势招祸，无恩之刑主恩将仇报，无礼之刑主男女失礼。` });
    }
    if (LIU_HAI[a.branch] === b.branch) {
      items.push({ kind: '六害', pair: pairLabel, tone: 'bad', detail: `${a.branch}${b.branch}相害，涉及${where}。害主暗中损害、妨碍、口舌是非，力轻于冲刑，如绵里藏针。` });
    }
    if (LIU_PO[a.branch] === b.branch) {
      items.push({ kind: '相破', pair: pairLabel, tone: 'neutral', detail: `${a.branch}${b.branch}相破，涉及${where}。破为六组关系中最轻者，主小有破损、美中不足；寅亥、巳申皆合中带破，主亲中有隙。` });
    }
  }

  // —— 自刑（同支重现） ——
  for (const zb of ZI_XING) {
    const hits = branchOf(zb);
    if (hits.length >= 2) {
      items.push({ kind: '自刑', pair: hits.map((h) => `${h.pos}支${h.branch}`).join(' × '), tone: 'bad', detail: `${zb}${zb}自刑——自寻烦恼、纠结内耗，应期多在${zb}年${zb}月引动（《三命通会》辰午酉亥自刑）。` });
    }
  }

  // —— 三合局 / 半合 ——
  const branchList = bs.map((x) => x.branch);
  for (const [members, elem] of SANHE_JU) {
    const hit = members.filter((b) => branchList.includes(b));
    if (hit.length === 3) {
      const poses = members.map((b) => bs.find((x) => x.branch === b)!.pos).join('');
      items.push({ kind: '三合局', pair: `${members.join('')}（${poses}三支）`, tone: 'good', detail: `${members.join('')}三合${elem}局——三支同心化${elem}，力量远大于单支，${elem === '火' ? '全局偏燥' : elem === '水' ? '全局偏寒' : `局中${elem}气独旺`}，会改变全局五行气候（《三命通会》）。` });
    } else if (hit.length === 2) {
      const poses = hit.map((b) => bs.find((x) => x.branch === b)!.pos).join('、');
      items.push({ kind: '半合', pair: `${hit.join('')}（${poses}支）`, tone: 'neutral', detail: `${hit.join('')}为${members.join('')}${elem}局之半合，有化${elem}之意而力不全，待岁运补全${members.find((b) => !hit.includes(b))}则成局。` });
    }
  }

  // —— 三会方 ——
  for (const [members, fang] of SANHUI_FANG) {
    if (members.every((b) => branchList.includes(b))) {
      items.push({ kind: '三会方', pair: members.join(''), tone: 'good', detail: `${members.join('')}三会${fang}方——一方之气尽聚，力量更胜于三合，全局气候以此为纲。` });
    }
  }

  // 排序：大局优先，冲刑次之
  const order: Record<string, number> = { 三合局: 0, 三会方: 1, 六冲: 2, 相刑: 3, 自刑: 4, 六合: 5, 天干五合: 6, 六害: 7, 半合: 8, 相破: 9 };
  return items.sort((x, y) => order[x.kind] - order[y.kind]);
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
  geju: GejuResult;          // 月令取格（《子平真诠》）
  relations: RelationItem[]; // 干支合冲刑害
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
      shensha: shenshaOfPillar(stem, branch, name === '日柱', {
        dayStem: dayMaster, yearBranch: gz.year[1], dayBranch: gz.dayBranch, monthBranch: gz.monthBranch, dayGz: gz.day,
      }),
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
  const geju = analyzeGeju(dayMaster, pillars);
  const relations = analyzeRelations(pillars);

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
    geju,
    relations,
    deLing,
    dayunDir,
    qiyunAge,
    qiyunNote,
    dayun,
  };
}
