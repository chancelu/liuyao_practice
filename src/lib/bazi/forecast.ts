// 用神四通道 / 用神质检 / 大运逐年分析 / 流年应期 / 流月细化
// 依据：《滴天髓》扶抑；《穷通宝鉴》调候；《神峰通考》病药通关；《子平真诠》从格顺势；
// 应期机制据《三命通会》《渊海子平》「原局为库、岁运为引」体系的教学简化实现
import type { BaZiChart, DaYunItem } from './engine';
import { CANGGAN, LIU_CHONG, LIU_HE, XING_PAIR, TIAN_GAN_HE, SANHE_JU, shiShen } from './engine';
import { STEM_ELEMENT, BRANCH_ELEMENT, SHENG, KE } from '../liuyao/constants';
import type { Element5 } from '../liuyao/constants';
import { computeGanZhi, jiaziOf } from '../liuyao/calendar';

const shengMe = (e: Element5): Element5 => (Object.keys(SHENG) as Element5[]).find((x) => SHENG[x] === e)!;
const keMe = (e: Element5): Element5 => (Object.keys(KE) as Element5[]).find((x) => KE[x] === e)!;

// ============ ① 取用神：四通道校验 ============
export interface YongshenChannel {
  name: string;        // 扶抑 / 调候 / 通关 / 顺势
  book: string;        // 典籍依据
  verdict: string;     // 本盘在此通道的判断
  elem: Element5[];    // 该通道给出的用神五行（空=此通道无需求）
  active: boolean;     // 是否被采为主用通道
}

export interface YongshenQuality {
  q: string;      // 三问之一
  a: string;      // 回答
  ok: boolean;
}

export interface YongshenResult {
  channels: YongshenChannel[];
  yongshen: Element5[];   // 主用神
  xishen: Element5[];     // 喜神
  jishen: Element5[];     // 忌神
  xianshen: Element5[];   // 闲神
  congge: '无' | '从强倾向' | '从弱倾向';
  quality: YongshenQuality[];
  summary: string;
}

const TIAOHOU: Record<string, { need: Element5; why: string }> = {
  子: { need: '火', why: '仲冬严寒，水冷金寒土冻，非丙丁火不能解寒' },
  丑: { need: '火', why: '季冬湿寒，冻土不生万物，先取火暖局' },
  亥: { need: '火', why: '初冬水旺，寒气渐盛，喜火暖局' },
  巳: { need: '水', why: '初夏火炎，土燥木枯，先取水润泽' },
  午: { need: '水', why: '仲夏酷暑，火土焦躁，非壬癸水不能济' },
  未: { need: '水', why: '季夏燥土，炎威未退，喜水润局' },
  寅: { need: '火', why: '初春余寒未消，木嫩宜火温暖（寒谷回春）' },
  申: { need: '火', why: '初秋金气渐肃，金水将寒，酌取火暖' },
};

export function analyzeYongshen(c: BaZiChart): YongshenResult {
  const dm = c.dayMasterElement;
  const strong = c.strength.label === '从强倾向' || c.strength.label === '偏强';
  const weak = c.strength.label === '偏弱' || c.strength.label === '从弱倾向';
  const congge: YongshenResult['congge'] =
    c.strength.label === '从强倾向' ? '从强倾向' : c.strength.label === '从弱倾向' ? '从弱倾向' : '无';

  // 扶抑通道
  const fuyiElems: Element5[] = strong ? [KE[dm], keMe(dm), SHENG[dm]] : [shengMe(dm), dm];
  const fuyiText = strong
    ? `日主${dm}偏强（${c.strength.total}分），扶抑法取克泄耗：我克之财（${KE[dm]}）、克我之官杀（${keMe(dm)}）、我生之食伤（${SHENG[dm]}）`
    : weak
      ? `日主${dm}偏弱（${c.strength.total}分），扶抑法取生扶：生我之印枭（${shengMe(dm)}）、同我之比劫（${dm}）`
      : `日主中和（${c.strength.total}分），扶抑需求不迫切，更多参看调候与格局`;

  // 调候通道
  const th = TIAOHOU[c.ganzhi.monthBranch];
  const tiaohouText = th
    ? `生于${c.ganzhi.monthBranch}月：${th.why}——调候为急，不论旺衰先取${th.need}（《穷通宝鉴》）`
    : `生于${c.ganzhi.monthBranch}月，季节寒暖平和，无迫切调候需求`;

  // 通关通道：两种最强五行相克且力量接近 → 取中间通关之五行
  const sorted = (Object.entries(c.wuxingCount) as [Element5, number][]).sort((a, b) => b[1] - a[1]);
  let tongguanElem: Element5[] = [];
  let tongguanText = '全局五行无两强对峙，无需通关';
  if (sorted.length >= 2 && sorted[0][1] >= 2 && sorted[1][1] >= 2 && sorted[0][1] - sorted[1][1] <= 2) {
    const [a] = sorted[0];
    const [b] = sorted[1];
    const aKeB = KE[a] === b;
    const bKeA = KE[b] === a;
    if (aKeB || bKeA) {
      const attacker = aKeB ? a : b;
      const victim = aKeB ? b : a;
      const bridge = SHENG[attacker]; // 攻击者所生 → 泄攻击者而生受克者
      tongguanElem = [bridge];
      tongguanText = `${attacker}（${sorted.find((x) => x[0] === attacker)![1]}）与${victim}（${sorted.find((x) => x[0] === victim)![1]}）两强相克，互不相让——取${bridge}通关：${attacker}生${bridge}、${bridge}生${victim}，化敌为友（《神峰通考》通关法）`;
    }
  }

  // 顺势通道（从格倾向）
  let shunshiElem: Element5[] = [];
  let shunshiText = '日主有根有助，不构成从格，此通道不适用';
  if (congge === '从强倾向') {
    shunshiElem = [dm, shengMe(dm)];
    shunshiText = `全局印比重重、日主极强——「强之极者不可折」，宜顺其势：继续用比劫（${dm}）、印枭（${shengMe(dm)})，逆之则凶（《滴天髓》从象）`;
  } else if (congge === '从弱倾向') {
    shunshiElem = [KE[dm], keMe(dm), SHENG[dm]];
    shunshiText = `日主极弱无根——「弱之极者不可扶」，宜弃命相从：顺财官食伤之势（${shunshiElem.join('、')}），生扶反触其忌`;
  }

  // 主用通道裁定：调候急迫 > 从格顺势 > 两强通关 > 扶抑
  const channels: YongshenChannel[] = [
    { name: '扶抑', book: '《滴天髓》', verdict: fuyiText, elem: fuyiElems, active: false },
    { name: '调候', book: '《穷通宝鉴》', verdict: tiaohouText, elem: th ? [th.need] : [], active: false },
    { name: '通关', book: '《神峰通考》', verdict: tongguanText, elem: tongguanElem, active: false },
    { name: '顺势', book: '《子平真诠》从格', verdict: shunshiText, elem: shunshiElem, active: false },
  ];
  let primary: Element5[];
  let primaryName: string;
  if (th && congge === '无') { primary = [th.need]; primaryName = '调候'; }
  else if (congge !== '无') { primary = shunshiElem; primaryName = '顺势'; }
  else if (tongguanElem.length) { primary = tongguanElem; primaryName = '通关'; }
  else { primary = fuyiElems.slice(0, 1); primaryName = '扶抑'; }
  channels.find((ch) => ch.name === primaryName)!.active = true;

  // 喜忌闲分级：喜=生扶用神者，忌=克泄用神/助纣者，闲=其余
  const yongshen = primary;
  const xishen: Element5[] = [];
  const jishen: Element5[] = [];
  const xianshen: Element5[] = [];
  const sideElems = strong ? [KE[dm], keMe(dm), SHENG[dm]] : [shengMe(dm), dm]; // 扶抑同侧
  for (const e of ['木', '火', '土', '金', '水'] as Element5[]) {
    if (yongshen.includes(e)) continue;
    if (shengMe(e) && SHENG[e] === yongshen[0]) xishen.push(e);        // 生用神者
    else if (sideElems.includes(e)) xishen.push(e);                     // 扶抑同侧
    else if (KE[e] === yongshen[0] || KE[yongshen[0]] === e) jishen.push(e); // 与用神相克
    else xianshen.push(e);
  }

  // —— 用神质检三问：局里有吗？有根吗？受伤吗？ ——
  const ye = yongshen[0];
  const inStems = c.pillars.filter((p) => p.stemElement === ye && p.name !== '日柱');
  const inBranches = c.pillars.filter((p) => p.branchElement === ye || CANGGAN[p.branch].some((s) => STEM_ELEMENT[s] === ye));
  const hasIt = inStems.length > 0 || inBranches.length > 0;
  // 有根吗：用神之干（任一属ye的天干）在地支藏干中有根
  const hasRoot = c.pillars.some((p) => p.branchElement === ye);
  // 受伤吗：含用神五行的地支逢冲
  const hurtBranch = inBranches.filter((p) =>
    c.pillars.some((q) => q.name !== p.name && LIU_CHONG[p.branch] === q.branch));
  const quality: YongshenQuality[] = [
    {
      q: '① 局里有吗？', ok: hasIt,
      a: hasIt
        ? `有——${[...inStems.map((p) => `${p.name.slice(0, 1)}干${p.stem}`), ...inBranches.map((p) => `${p.name.slice(0, 1)}支${p.branch}`)].join('、')}带${ye}气。用神现于局中，「有病有药」，格局可期`
        : `原局不见${ye}——用神虚设，须待大运流年补出（岁运见${ye}则为应期），格局先打折扣`,
    },
    {
      q: '② 有根吗？', ok: hasRoot,
      a: hasRoot
        ? `有根——地支${inBranches.filter((p) => p.branchElement === ye).map((p) => p.branch).join('、')}为${ye}之本气，用神落地有力`
        : `${ye}仅浮于天干或藏于人元——虚浮无力，「天干为苗、地支为根」，用时力减三分`,
    },
    {
      q: '③ 受伤吗？', ok: hurtBranch.length === 0,
      a: hurtBranch.length
        ? `受伤——${hurtBranch.map((p) => `${p.name.slice(0, 1)}支${p.branch}逢冲`).join('、')}，用神被冲动摇，吉力打折，逢冲之岁运尤须留意`
        : '无伤——用神之支不逢冲克，根基安稳',
    },
  ];
  const grade = quality.filter((q) => q.ok).length;

  return {
    channels, yongshen, xishen, jishen, xianshen, congge, quality,
    summary: `四通道校验后，以「${primaryName}」通道为主：用神 ${yongshen.join('、')}，喜神 ${xishen.join('、') || '—'}，忌神 ${jishen.join('、') || '—'}，闲神 ${xianshen.join('、') || '—'}。质检三问过 ${grade}/3 关${grade === 3 ? '，用神有力，格局清亮' : grade === 2 ? '，用神尚可用而带瑕疵' : '，用神孱弱，格局先低看一线，待岁运补救'}。`,
  };
}

// ============ ② 大运逐年分析（五关法教学简化） ============
export interface DaYunAnalysis extends DaYunItem {
  stemElem: Element5;
  branchElem: Element5;
  tone: '吉' | '忌' | '平';
  theme: string;    // 十年主题（十神）
  hits: string[];   // 与原局的作用关系
  current: boolean; // 当前所处大运
}

const SHISHEN_THEME: Record<string, string> = {
  比肩: '自立竞争、朋友合作之十年', 劫财: '魄力开拓、亦防破耗之十年',
  食神: '才华发挥、口福安逸之十年', 伤官: '锋芒展露、创意变迁之十年',
  偏财: '财缘活络、人缘广阔之十年', 正财: '勤积蓄财、成家立业之十年',
  七杀: '压力挑战、拼搏权柄之十年', 正官: '名誉职位、稳步升迁之十年',
  偏印: '偏门钻研、孤独灵感之十年', 正印: '学业庇护、贵人提携之十年',
};

export function analyzeDayun(c: BaZiChart, yong: YongshenResult, nowYear: number): DaYunAnalysis[] {
  const like = [...yong.yongshen, ...yong.xishen];
  return c.dayun.map((d) => {
    const stemElem = STEM_ELEMENT[d.stem];
    const branchElem = BRANCH_ELEMENT[d.branch];
    const stemGood = like.includes(stemElem);
    const branchGood = like.includes(branchElem);
    const stemBad = yong.jishen.includes(stemElem);
    const branchBad = yong.jishen.includes(branchElem);
    const tone: DaYunAnalysis['tone'] =
      (stemGood && branchGood) ? '吉'
      : (stemBad && branchBad) ? '忌'
      : (stemGood || branchGood) && !stemBad && !branchBad ? '吉'
      : (stemBad || branchBad) && !stemGood && !branchGood ? '忌' : '平';

    const hits: string[] = [];
    for (const p of c.pillars) {
      const pos = p.name.slice(0, 1);
      if (LIU_CHONG[d.branch] === p.branch) hits.push(`运支${d.branch}冲${pos}支${p.branch}——冲动${pos === '年' ? '祖基早年' : pos === '月' ? '父母事业宫' : pos === '日' ? '夫妻宫' : '子女宫'}，此运多变动`);
      if (LIU_HE[d.branch]?.[0] === p.branch) hits.push(`运支${d.branch}合${pos}支${p.branch}——牵绊和合，事多缠绵`);
      const x = XING_PAIR[d.branch];
      if (x && x[0] === p.branch) hits.push(`运支${d.branch}刑${pos}支${p.branch}（${x[1]}）——防是非刑伤`);
      const tg = TIAN_GAN_HE[d.stem];
      if (tg && tg[0] === p.stem) hits.push(`运干${d.stem}合${pos}干${p.stem}（化${tg[1]}）——外缘和合`);
    }
    const startYear = d.startYear;
    return {
      ...d, stemElem, branchElem, tone, hits,
      theme: SHISHEN_THEME[d.shiShen] ?? '',
      current: startYear > 0 && nowYear >= startYear && nowYear < startYear + 10,
    };
  });
}

// ============ ③ 流年应期（七大触发机制） ============
export interface LiuNianItem {
  year: number;
  gz: string;
  shiShen: string;
  elem: Element5;
  tone: '吉' | '忌' | '平';
  triggers: string[];
  past: boolean;
  current: boolean;
}

export function analyzeLiunian(c: BaZiChart, yong: YongshenResult, dayunList: DaYunAnalysis[], nowYear: number, span = 8): LiuNianItem[] {
  const like = [...yong.yongshen, ...yong.xishen];
  const out: LiuNianItem[] = [];
  const natalBranches = c.pillars.map((p) => ({ pos: p.name.slice(0, 1), branch: p.branch, gz: p.gz, stem: p.stem }));
  for (let year = nowYear - span; year <= nowYear + span; year++) {
    const gz = jiaziOf((((year - 4) % 60) + 60) % 60);
    const stem = gz[0];
    const branch = gz[1];
    const elem = STEM_ELEMENT[stem];
    const ss = shiShen(c.dayMaster, stem);
    const dy = dayunList.find((d) => d.startYear > 0 && year >= d.startYear && year < d.startYear + 10);
    const triggers: string[] = [];
    for (const nb of natalBranches) {
      if (nb.gz === gz) triggers.push(`逢值（伏吟${nb.pos}柱${nb.gz}）——该宫位之事反复牵动`);
      else if (nb.branch === branch) triggers.push(`逢值（${nb.pos}支${branch}伏吟）——引动${nb.pos}柱宫位`);
      if (LIU_CHONG[branch] === nb.branch) triggers.push(`冲动（岁支${branch}冲${nb.pos}支${nb.branch}）——变动应期`);
      if (LIU_HE[branch]?.[0] === nb.branch) triggers.push(`合动（岁支${branch}合${nb.pos}支${nb.branch}）——和合牵绊`);
      const x = XING_PAIR[branch];
      if (x && x[0] === nb.branch) triggers.push(`凑刑（${branch}${nb.branch}${x[1]}）——防是非`);
    }
    // 天克地冲：岁干克柱干 且 岁支冲柱支
    for (const p of c.pillars) {
      if (KE[STEM_ELEMENT[stem]] === STEM_ELEMENT[p.stem] && LIU_CHONG[branch] === p.branch) {
        triggers.push(`天克地冲（${gz} 冲克 ${p.name}${p.gz}）——重大变动信号`);
      }
    }
    // 填实空亡
    if (c.kong.includes(branch)) triggers.push(`填实空亡（${branch}为旬空之字）——空者逢值则实，悬空之事落地`);
    // 凑齐三合
    for (const [members, el] of SANHE_JU) {
      if (members.includes(branch)) {
        const others = members.filter((b) => b !== branch);
        if (others.every((b) => natalBranches.some((nb) => nb.branch === b))) {
          triggers.push(`凑齐三合${members.join('')}${el}局——局中${el}气暴涨`);
        }
      }
    }
    // 岁运并临
    if (dy && dy.gz === gz) triggers.push(`岁运并临（流年与大运同为${gz}）——吉凶之力加倍，大事之年`);
    const tone: LiuNianItem['tone'] = like.includes(elem) ? '吉' : yong.jishen.includes(elem) ? '忌' : '平';
    out.push({ year, gz, shiShen: ss, elem, tone, triggers, past: year < nowYear, current: year === nowYear });
  }
  return out;
}

// ============ ④ 流月细化（当年十二个月的应事月） ============
export interface LiuYueItem {
  month: number;
  gz: string;
  trigger: string;
}

export function analyzeLiuyue(c: BaZiChart, year: number): LiuYueItem[] {
  const out: LiuYueItem[] = [];
  const natalBranches = c.pillars.map((p) => ({ pos: p.name.slice(0, 1), branch: p.branch }));
  const yearBranch = jiaziOf((((year - 4) % 60) + 60) % 60)[1];
  for (let m = 1; m <= 12; m++) {
    // 取每月 15 日近似定月柱（节气换月，月中必在当月建内）
    const g = computeGanZhi(new Date(year, m - 1, 15));
    const mb = g.monthBranch;
    const hits: string[] = [];
    if (LIU_CHONG[mb] === yearBranch) hits.push(`冲太岁${yearBranch}`);
    if (LIU_HE[mb]?.[0] === yearBranch) hits.push(`合太岁${yearBranch}`);
    for (const nb of natalBranches) {
      if (LIU_CHONG[mb] === nb.branch) hits.push(`冲${nb.pos}支${nb.branch}`);
      if (LIU_HE[mb]?.[0] === nb.branch) hits.push(`合${nb.pos}支${nb.branch}`);
    }
    if (hits.length) out.push({ month: m, gz: g.month, trigger: hits.join('、') });
  }
  return out;
}
