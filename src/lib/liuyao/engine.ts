// 六爻排盘引擎 —— 装卦流程依据六爻课程卷三（装卦法/基础参数）、卷四（用神卷）

import {
  BRANCHES, BRANCH_ELEMENT, BITS_TRIGRAM,
  NAJIA, PALACES, SHI_BY_SEQ, LIUSHEN_ORDER, LIUSHEN_START, LIUSHEN_ELEMENT,
  isChong, isHe, xunKong, changshengState, SEASON_WANG,
  JIN_SHEN, TUI_SHEN, MUKU, liuQinOf, elemRelation, KE, SHENG,
} from './constants';
import type { Element5, LiuQin } from './constants';
import type { GanZhi } from './calendar';
import { HEXAGRAMS_64 } from '../../data/hexagrams64';
import type { HexagramInfo } from '../../data/hexagrams64';

/** 摇卦结果：6=老阴(交) 7=少阳(单) 8=少阴(拆) 9=老阳(重) */
export type YaoValue = 6 | 7 | 8 | 9;

export const YAO_META: Record<YaoValue, { name: string; coin: string; mark: string; yang: boolean; moving: boolean; desc: string }> = {
  7: { name: '少阳', coin: '一背二字（单）', mark: '●', yang: true, moving: false, desc: '静爻·阳' },
  8: { name: '少阴', coin: '两背一字（拆）', mark: '●●', yang: false, moving: false, desc: '静爻·阴' },
  9: { name: '老阳', coin: '三背零字（重）', mark: 'O', yang: true, moving: true, desc: '动爻·阳变阴' },
  6: { name: '老阴', coin: '三字零背（交）', mark: 'X', yang: false, moving: true, desc: '动爻·阴变阳' },
};

export interface LineInfo {
  pos: number;           // 1-6 初到上
  posName: string;       // 初/二/三/四/五/上
  value: YaoValue;
  yang: boolean;
  moving: boolean;
  stem: string;          // 纳干
  branch: string;        // 纳支
  element: Element5;     // 支五行
  liuqin: LiuQin;        // 六亲（依主卦宫五行）
  liushen: string;       // 六神
  shiYing: '' | '世' | '应';
  jianYao: boolean;      // 间爻
  guashen: boolean;      // 卦身
  // 变爻信息
  bianStem?: string;
  bianBranch?: string;
  bianElement?: Element5;
  bianLiuqin?: LiuQin;
  // 状态标记
  kong: boolean;         // 旬空
  yuePo: boolean;        // 月破
  riPo: boolean;         // 日破
  anDong: boolean;       // 暗动
  monthState: string;    // 旺相休囚死（对月建）
  dayState: string;      // 十二长生（对日辰）
  riHe: boolean;         // 日合
  jinTui: '' | '化进神' | '化退神';
  huitou: '' | '化回头生' | '化回头克' | '化回头泄' | '化回头耗' | '化比和';
  huaKong: boolean;      // 动而化空
  huaMu: boolean;        // 动而化墓
  score: number;         // 旺衰量化分
  scoreNotes: string[];  // 评分明细
  fuShen?: { stem: string; branch: string; element: Element5; liuqin: LiuQin }; // 伏神
}

export interface PaiPan {
  lines: LineInfo[];                 // 初→上
  benGua: { lower: string; upper: string; key: string; info: HexagramInfo };
  bianGua: { lower: string; upper: string; key: string; info: HexagramInfo } | null;
  huGua: { lower: string; upper: string; name: string } | null;
  palace: string;                    // 卦宫
  palaceElement: Element5;           // 宫五行
  seq: number;                       // 宫内卦序
  shiPos: number; yingPos: number;   // 世应爻位
  guaShenBranch: string;             // 卦身地支
  ganzhi: GanZhi;
  kong: [string, string];            // 旬空
  movingCount: number;
  duFa: boolean;                     // 独发
  duJing: boolean;                   // 独静
  fanYin: '' | '卦反吟' | '内卦反吟' | '外卦反吟';
  fuYin: '' | '卦伏吟' | '内卦伏吟' | '外卦伏吟';
  liuChong: boolean;                 // 六冲卦
  liuHe: boolean;                    // 六合卦
}

const POS_NAMES = ['', '初', '二', '三', '四', '五', '上'];

function trigramOf(bits: number[]): string {
  return BITS_TRIGRAM[bits.join('')];
}

function hexInfo(lower: string, upper: string): HexagramInfo {
  const found = HEXAGRAMS_64.find((h) => h.lower === lower && h.upper === upper);
  if (!found) throw new Error(`未找到卦象 ${lower}${upper}`);
  return found;
}

/** 完整排盘 */
export function paipan(yaos: YaoValue[], ganzhi: GanZhi): PaiPan {
  // 1. 本卦/变卦卦形（自下而上）
  const benBits = yaos.map((v) => (YAO_META[v].yang ? 1 : 0));
  const bianBits = yaos.map((v) => {
    if (v === 9) return 0;
    if (v === 6) return 1;
    return YAO_META[v].yang ? 1 : 0;
  });
  const lower = trigramOf(benBits.slice(0, 3));
  const upper = trigramOf(benBits.slice(3, 6));
  const key = lower + upper;
  const hasBian = yaos.some((v) => v === 6 || v === 9);
  const bLower = trigramOf(bianBits.slice(0, 3));
  const bUpper = trigramOf(bianBits.slice(3, 6));

  // 2. 卦宫与世应（卷三·第七课）
  const palaceEntry = Object.entries(PALACES).find(([, p]) => p.hexes.some((h) => h.key === key));
  if (!palaceEntry) throw new Error('未找到卦宫');
  const [palace, palaceData] = palaceEntry;
  const hexInPalace = palaceData.hexes.find((h) => h.key === key)!;
  const seq = hexInPalace.seq;
  const shiPos = SHI_BY_SEQ[seq];
  const yingPos = shiPos > 3 ? shiPos - 3 : shiPos + 3;

  // 3. 卦身（卷三·第十一课）：阴世从午起，阳世从子生，从初数至世方真
  const shiYang = YAO_META[yaos[shiPos - 1]].yang;
  const guaShenStart = shiYang ? 0 : 6; // 子=0 午=6
  const guaShenBranch = BRANCHES[(guaShenStart + shiPos - 1) % 12];

  // 4. 旬空
  const kong = xunKong(ganzhi.dayIndex);

  // 5. 六神起点
  const shenStart = LIUSHEN_START[ganzhi.dayStem];

  // 6. 逐爻装配
  const lines: LineInfo[] = yaos.map((v, i) => {
    const pos = i + 1;
    const isInner = pos <= 3;
    const trig = isInner ? lower : upper;
    const najia = NAJIA[trig];
    const branch = isInner ? najia.inner[pos - 1] : najia.outer[pos - 4];
    const stem = isInner ? najia.innerStem : najia.outerStem;
    const element = BRANCH_ELEMENT[branch];

    // 变爻纳支（卷三·第九课：变卦六亲随主卦宫五行）
    let bianStem: string | undefined, bianBranch: string | undefined, bianElement: Element5 | undefined, bianLiuqin: LiuQin | undefined;
    if (YAO_META[v].moving) {
      const bTrig = isInner ? bLower : bUpper;
      const bNajia = NAJIA[bTrig];
      bianBranch = isInner ? bNajia.inner[pos - 1] : bNajia.outer[pos - 4];
      bianStem = isInner ? bNajia.innerStem : bNajia.outerStem;
      bianElement = BRANCH_ELEMENT[bianBranch];
      bianLiuqin = liuQinOf(palaceData.element, bianElement);
    }

    return {
      pos, posName: POS_NAMES[pos], value: v,
      yang: YAO_META[v].yang, moving: YAO_META[v].moving,
      stem, branch, element,
      liuqin: liuQinOf(palaceData.element, element),
      liushen: LIUSHEN_ORDER[(shenStart + i) % 6],
      shiYing: pos === shiPos ? '世' : pos === yingPos ? '应' : '',
      jianYao: false, guashen: branch === guaShenBranch,
      bianStem, bianBranch, bianElement, bianLiuqin,
      kong: kong.includes(branch),
      yuePo: false, riPo: false, anDong: false, riHe: false,
      monthState: '', dayState: '', jinTui: '', huitou: '', huaKong: false, huaMu: false,
      score: 0, scoreNotes: [],
    } as LineInfo;
  });

  // 间爻
  const [lo, hi] = [Math.min(shiPos, yingPos), Math.max(shiPos, yingPos)];
  lines.forEach((l) => { if (l.pos > lo && l.pos < hi) l.jianYao = true; });

  // 7. 月建日辰作用（卷三·第十一课、习题卷问答题53/54/59）
  const mBranch = ganzhi.monthBranch;
  const dBranch = ganzhi.dayBranch;
  const mElem = BRANCH_ELEMENT[mBranch];
  const dElem = BRANCH_ELEMENT[dBranch];

  lines.forEach((l) => {
    const notes: string[] = [];
    let score = 0;
    // 月建：旺相休囚死
    l.monthState = SEASON_WANG[mElem][l.element];
    const mScore: Record<string, number> = { 旺: 2, 相: 1.5, 休: -0.5, 囚: -1, 死: -1.5 };
    score += mScore[l.monthState];
    notes.push(`月建${mBranch}${mElem}：${l.element}${l.monthState}（${mScore[l.monthState] > 0 ? '+' : ''}${mScore[l.monthState]}）`);
    // 月破：月建所冲的休囚之爻（卷三）
    if (isChong(l.branch, mBranch)) {
      const strong = mScore[l.monthState] >= 0 || isHe(l.branch, dBranch) || elemRelation(dElem, l.element) === 'shengBy' || dElem === l.element;
      if (!strong) {
        l.yuePo = true; score -= 1; notes.push(`月建${mBranch}冲${l.branch}：月破（-1）`);
      } else {
        score -= 0.5; notes.push(`月建${mBranch}冲${l.branch}：得助冲而不破（-0.5）`);
      }
    }
    // 日辰
    const dRel = elemRelation(dElem, l.element);
    if (dRel === 'same') { score += 2; notes.push(`临日辰${dBranch}（+2）`); }
    else if (dRel === 'shengBy') { score += 1.5; notes.push(`日辰${dBranch}${dElem}生${l.branch}${l.element}（+1.5）`); }
    else if (dRel === 'sheng') { score -= 0.25; notes.push(`${l.branch}生日辰，泄气（-0.25）`); }
    else if (dRel === 'ke') { score -= 0.5; notes.push(`${l.branch}克日辰（-0.5）`); }
    else { score -= 1.5; notes.push(`日辰${dBranch}克${l.branch}（-1.5）`); }
    // 日合
    if (isHe(l.branch, dBranch)) { l.riHe = true; score += 0.5; notes.push(`日辰${dBranch}合${l.branch}（+0.5，旺则合起衰则合绊）`); }
    // 日冲：旺相之静爻逢日冲为暗动；休囚静爻逢日冲为日破
    if (isChong(l.branch, dBranch)) {
      if (!l.moving) {
        if (score >= 1) { l.anDong = true; score += 1; notes.push(`旺相静爻逢日冲：暗动（+1，与动爻通论）`); }
        else { l.riPo = true; score -= 1; notes.push(`休囚静爻逢日冲：日破（-1）`); }
      } else {
        score -= 0.5; notes.push(`动爻逢日辰${dBranch}冲（-0.5）`);
      }
    }
    // 旬空：旺不为空、动不为空（卷三）
    if (l.kong) {
      if (l.moving || score >= 1.5) notes.push(`临旬空（${kong[0]}${kong[1]}空）：旺/动不为真空，出空填实有用（-0.25）`), score -= 0.25;
      else { score -= 1; notes.push(`临旬空且休囚无气：真空（-1）`); }
    }
    // 动爻
    if (l.moving) {
      score += 1; notes.push(`发动（+1）`);
      // 化进化退（卷四·第三课）
      if (JIN_SHEN[l.branch] === l.bianBranch) { l.jinTui = '化进神'; score += 0.5; notes.push(`${l.branch}化${l.bianBranch}：化进神（+0.5）`); }
      if (TUI_SHEN[l.branch] === l.bianBranch) { l.jinTui = '化退神'; score -= 0.5; notes.push(`${l.branch}化${l.bianBranch}：化退神（-0.5）`); }
      // 回头生克（bRel = 变爻对动爻的关系）
      const bRel = elemRelation(l.bianElement!, l.element);
      if (bRel === 'sheng') { l.huitou = '化回头生'; score += 1; notes.push(`变爻${l.bianBranch}${l.bianElement}生动爻：化回头生（+1）`); }
      else if (bRel === 'ke') { l.huitou = '化回头克'; score -= 1; notes.push(`变爻${l.bianBranch}${l.bianElement}克动爻：化回头克（-1）`); }
      else if (bRel === 'shengBy') { l.huitou = '化回头泄'; score -= 0.25; notes.push(`动爻生变爻：泄气（-0.25）`); }
      else if (bRel === 'keBy') { l.huitou = '化回头耗'; notes.push(`动爻克变爻（耗）`); }
      else { l.huitou = '化比和'; notes.push(`动变比和`); }
      // 化空
      if (l.bianBranch && kong.includes(l.bianBranch)) { l.huaKong = true; score -= 0.5; notes.push(`动而化空（${l.bianBranch}旬空）（-0.5）`); }
      // 化墓
      if (l.bianBranch && MUKU[l.element] === l.bianBranch) { l.huaMu = true; notes.push(`动而化墓（${l.bianBranch}为${l.element}之墓库）`); }
    }
    // 十二长生（对日辰）
    l.dayState = changshengState(l.element, dBranch);
    l.score = Math.round(score * 4) / 4;
    l.scoreNotes = notes;
  });

  // 8. 伏神：卦中六亲不全，从本宫首卦借（卷四·第四课）
  const presentQin = new Set(lines.map((l) => l.liuqin));
  const allQin: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
  const missing = allQin.filter((q) => !presentQin.has(q));
  if (missing.length > 0) {
    // 首卦（纯卦）纳支
    const pure = PALACES[palace].hexes[0];
    const pureLower = pure.key[0];
    const pureUpper = pure.key[1];
    for (let pos = 1; pos <= 6; pos++) {
      const isInner = pos <= 3;
      const trig = isInner ? pureLower : pureUpper;
      const najia = NAJIA[trig];
      const branch = isInner ? najia.inner[pos - 1] : najia.outer[pos - 4];
      const elem = BRANCH_ELEMENT[branch];
      const qin = liuQinOf(palaceData.element, elem);
      if (missing.includes(qin)) {
        lines[pos - 1].fuShen = {
          stem: isInner ? najia.innerStem : najia.outerStem,
          branch, element: elem, liuqin: qin,
        };
      }
    }
  }

  // 9. 反吟伏吟（卷三·第十一课）
  let fanYin: PaiPan['fanYin'] = '';
  let fuYin: PaiPan['fuYin'] = '';
  if (hasBian) {
    const innerChong = [0, 1, 2].every((i) => isChong(lines[i].branch, lines[i].bianBranch!));
    const outerChong = [3, 4, 5].every((i) => isChong(lines[i].branch, lines[i].bianBranch!));
    const innerSame = [0, 1, 2].every((i) => lines[i].branch === lines[i].bianBranch) && lower !== bLower;
    const outerSame = [3, 4, 5].every((i) => lines[i].branch === lines[i].bianBranch) && upper !== bUpper;
    const allSame = innerSame && outerSame;
    const innerChanged = lower !== bLower, outerChanged = upper !== bUpper;
    if (innerChong && outerChong) fanYin = '卦反吟';
    else if (innerChong && innerChanged) fanYin = '内卦反吟';
    else if (outerChong && outerChanged) fanYin = '外卦反吟';
    if (allSame) fuYin = '卦伏吟';
    else if (innerSame) fuYin = '内卦伏吟';
    else if (outerSame) fuYin = '外卦伏吟';
  }

  // 10. 六冲卦/六合卦（上下卦爻位对冲/合）
  const liuChong = [0, 1, 2].every((i) => isChong(lines[i].branch, lines[i + 3].branch));
  const liuHe = [0, 1, 2].every((i) => isHe(lines[i].branch, lines[i + 3].branch));

  // 11. 互卦（卷三·第四课：二三四爻为下卦，三四五爻为上卦）
  const huLower = trigramOf(benBits.slice(1, 4));
  const huUpper = trigramOf(benBits.slice(2, 5));

  const movingCount = yaos.filter((v) => v === 6 || v === 9).length;

  return {
    lines,
    benGua: { lower, upper, key, info: hexInfo(lower, upper) },
    bianGua: hasBian ? { lower: bLower, upper: bUpper, key: bLower + bUpper, info: hexInfo(bLower, bUpper) } : null,
    huGua: { lower: huLower, upper: huUpper, name: hexInfo(huLower, huUpper).name },
    palace, palaceElement: palaceData.element, seq,
    shiPos, yingPos, guaShenBranch,
    ganzhi, kong,
    movingCount,
    duFa: movingCount === 1,
    duJing: movingCount === 5,
    fanYin, fuYin, liuChong, liuHe,
  };
}

/** 旺衰评级 */
export function wangShuaiLabel(score: number): string {
  if (score >= 3.5) return '极旺';
  if (score >= 1.5) return '旺相';
  if (score >= 0) return '有气';
  if (score >= -1.5) return '休囚';
  return '衰败';
}

export { LIUSHEN_ELEMENT, KE, SHENG };
