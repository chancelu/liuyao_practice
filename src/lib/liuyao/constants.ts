// 六爻排盘基础常量 —— 依据六爻课程卷一~卷四

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export type Element5 = '木' | '火' | '土' | '金' | '水';

export const BRANCH_ELEMENT: Record<string, Element5> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

export const STEM_ELEMENT: Record<string, Element5> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 五行相生相克（卷一·第九课）：木生火火生土土生金金生水水生木；木克土土克水水克火火克金金克木
export const SHENG: Record<Element5, Element5> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const KE: Record<Element5, Element5> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** a 与 b 的五行关系：'same' | 'sheng'(a生b) | 'shengBy'(b生a) | 'ke'(a克b) | 'keBy'(b克a) */
export function elemRelation(a: Element5, b: Element5): 'same' | 'sheng' | 'shengBy' | 'ke' | 'keBy' {
  if (a === b) return 'same';
  if (SHENG[a] === b) return 'sheng';
  if (SHENG[b] === a) return 'shengBy';
  if (KE[a] === b) return 'ke';
  return 'keBy';
}

// 八卦（三画）二进制：自下而上，阳=1 阴=0
export const TRIGRAM_BITS: Record<string, [number, number, number]> = {
  乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
  巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
};
export const BITS_TRIGRAM: Record<string, string> = Object.fromEntries(
  Object.entries(TRIGRAM_BITS).map(([k, v]) => [v.join(''), k]),
);
export const TRIGRAM_ELEMENT: Record<string, Element5> = {
  乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土',
};
export const TRIGRAM_NATURE: Record<string, string> = {
  乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地',
};

// 纳甲（卷三·第八课+纳甲卦歌诀）：内外卦天干与纳支（自下而上）
export const NAJIA: Record<string, { innerStem: string; outerStem: string; inner: string[]; outer: string[] }> = {
  乾: { innerStem: '甲', outerStem: '壬', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  坎: { innerStem: '戊', outerStem: '戊', inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  艮: { innerStem: '丙', outerStem: '丙', inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  震: { innerStem: '庚', outerStem: '庚', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  巽: { innerStem: '辛', outerStem: '辛', inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  离: { innerStem: '己', outerStem: '己', inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  兑: { innerStem: '丁', outerStem: '丁', inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
  坤: { innerStem: '乙', outerStem: '癸', inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
};

// 京房八宫卦序（卷三·第七课）：key = 下卦名+上卦名；1本宫 2一世…6五世 7游魂 8归魂
export interface PalaceHex { key: string; name: string; seq: number }
export const PALACES: Record<string, { element: Element5; hexes: PalaceHex[] }> = {
  乾: { element: '金', hexes: [
    { key: '乾乾', name: '乾为天', seq: 1 }, { key: '巽乾', name: '天风姤', seq: 2 },
    { key: '艮乾', name: '天山遁', seq: 3 }, { key: '坤乾', name: '天地否', seq: 4 },
    { key: '坤巽', name: '风地观', seq: 5 }, { key: '坤艮', name: '山地剥', seq: 6 },
    { key: '坤离', name: '火地晋', seq: 7 }, { key: '乾离', name: '火天大有', seq: 8 },
  ] },
  坎: { element: '水', hexes: [
    { key: '坎坎', name: '坎为水', seq: 1 }, { key: '兑坎', name: '水泽节', seq: 2 },
    { key: '震坎', name: '水雷屯', seq: 3 }, { key: '离坎', name: '水火既济', seq: 4 },
    { key: '离兑', name: '泽火革', seq: 5 }, { key: '离震', name: '雷火丰', seq: 6 },
    { key: '离坤', name: '地火明夷', seq: 7 }, { key: '坎坤', name: '地水师', seq: 8 },
  ] },
  艮: { element: '土', hexes: [
    { key: '艮艮', name: '艮为山', seq: 1 }, { key: '离艮', name: '山火贲', seq: 2 },
    { key: '乾艮', name: '山天大畜', seq: 3 }, { key: '兑艮', name: '山泽损', seq: 4 },
    { key: '兑离', name: '火泽睽', seq: 5 }, { key: '兑乾', name: '天泽履', seq: 6 },
    { key: '兑巽', name: '风泽中孚', seq: 7 }, { key: '艮巽', name: '风山渐', seq: 8 },
  ] },
  震: { element: '木', hexes: [
    { key: '震震', name: '震为雷', seq: 1 }, { key: '坤震', name: '雷地豫', seq: 2 },
    { key: '坎震', name: '雷水解', seq: 3 }, { key: '巽震', name: '雷风恒', seq: 4 },
    { key: '巽坤', name: '地风升', seq: 5 }, { key: '巽坎', name: '水风井', seq: 6 },
    { key: '巽兑', name: '泽风大过', seq: 7 }, { key: '震兑', name: '泽雷随', seq: 8 },
  ] },
  巽: { element: '木', hexes: [
    { key: '巽巽', name: '巽为风', seq: 1 }, { key: '乾巽', name: '风天小畜', seq: 2 },
    { key: '离巽', name: '风火家人', seq: 3 }, { key: '震巽', name: '风雷益', seq: 4 },
    { key: '震乾', name: '天雷无妄', seq: 5 }, { key: '震离', name: '火雷噬嗑', seq: 6 },
    { key: '震艮', name: '山雷颐', seq: 7 }, { key: '艮巽', name: '山风蛊', seq: 8 },
  ] },
  离: { element: '火', hexes: [
    { key: '离离', name: '离为火', seq: 1 }, { key: '艮离', name: '火山旅', seq: 2 },
    { key: '巽离', name: '火风鼎', seq: 3 }, { key: '坎离', name: '火水未济', seq: 4 },
    { key: '坎艮', name: '山水蒙', seq: 5 }, { key: '坎巽', name: '风水涣', seq: 6 },
    { key: '坎乾', name: '天水讼', seq: 7 }, { key: '乾离', name: '天火同人', seq: 8 },
  ] },
  坤: { element: '土', hexes: [
    { key: '坤坤', name: '坤为地', seq: 1 }, { key: '震坤', name: '地雷复', seq: 2 },
    { key: '兑坤', name: '地泽临', seq: 3 }, { key: '乾坤', name: '地天泰', seq: 4 },
    { key: '乾震', name: '雷天大壮', seq: 5 }, { key: '乾兑', name: '泽天夬', seq: 6 },
    { key: '乾坎', name: '水天需', seq: 7 }, { key: '坤坎', name: '水地比', seq: 8 },
  ] },
  兑: { element: '金', hexes: [
    { key: '兑兑', name: '兑为泽', seq: 1 }, { key: '坎兑', name: '泽水困', seq: 2 },
    { key: '坤兑', name: '泽地萃', seq: 3 }, { key: '艮兑', name: '泽山咸', seq: 4 },
    { key: '艮坎', name: '水山蹇', seq: 5 }, { key: '艮坤', name: '地山谦', seq: 6 },
    { key: '艮震', name: '雷山小过', seq: 7 }, { key: '兑震', name: '雷泽归妹', seq: 8 },
  ] },
};

// 世爻位置（卦序→世爻爻位1-6）：八卦首宫世六当，以下初爻轮上扬，游魂七卦四爻立，归魂八卦三爻详
export const SHI_BY_SEQ = [0, 6, 1, 2, 3, 4, 5, 4, 3];

// 六神（卷三·第十课）：甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起腾蛇，庚辛起白虎，壬癸起玄武
export const LIUSHEN_ORDER = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const;
export const LIUSHEN_ELEMENT: Record<string, Element5> = {
  青龙: '木', 朱雀: '火', 勾陈: '土', 螣蛇: '土', 白虎: '金', 玄武: '水',
};
export const LIUSHEN_START: Record<string, number> = {
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
};

// 六合（卷一·第二十七课）
export const LIUHE: [string, string][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];
// 六冲（卷一·第二十八课）：子午丑未寅申卯酉辰戌巳亥
export function isChong(a: string, b: string): boolean {
  return (BRANCHES.indexOf(a as never) - BRANCHES.indexOf(b as never) + 12) % 12 === 6;
}
export function chongOf(b: string): string {
  return BRANCHES[(BRANCHES.indexOf(b as never) + 6) % 12];
}
export function isHe(a: string, b: string): boolean {
  return LIUHE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
// 三合局
export const SANHE: Record<string, Element5> = {
  申子辰: '水', 亥卯未: '木', 寅午戌: '火', 巳酉丑: '金',
};

// 旬空（卷三·第十一课）：甲子旬中戌亥空…甲寅旬中子丑空
export function xunKong(dayIndex: number): [string, string] {
  const xunStart = dayIndex - (dayIndex % 10); // 旬首（甲X）
  const startBranch = xunStart % 12;
  return [BRANCHES[(startBranch + 10) % 12], BRANCHES[(startBranch + 11) % 12]];
}

// 十二长生（卷一·第三十七课）：木长亥 火长寅 金长巳 水土长申
export const CHANGSHENG_START: Record<Element5, number> = { 木: 11, 火: 2, 金: 5, 水: 8, 土: 8 };
export const CHANGSHENG_STATES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
export function changshengState(elem: Element5, branch: string): string {
  const start = CHANGSHENG_START[elem];
  const idx = (BRANCHES.indexOf(branch as never) - start + 12) % 12;
  return CHANGSHENG_STATES[idx];
}

// 四时生旺（卷一·第三十八课）：当令者旺，令生者相，生令者休，克令者囚，令克者死
export const SEASON_WANG: Record<string, Record<Element5, string>> = {
  木: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  火: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  金: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  水: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  土: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
};

// 进神退神（卷四·第三课）
export const JIN_SHEN: Record<string, string> = { 寅: '卯', 巳: '午', 申: '酉', 亥: '子', 丑: '辰', 辰: '未', 未: '戌', 戌: '丑' };
export const TUI_SHEN: Record<string, string> = Object.fromEntries(
  Object.entries(JIN_SHEN).map(([k, v]) => [v, k]),
);

// 四墓库（卷三·第十一课）：辰为水土之墓库，戌为火墓库，丑为金墓库，未为木墓库
export const MUKU: Record<Element5, string> = { 水: '辰', 土: '辰', 火: '戌', 金: '丑', 木: '未' };

// 六亲（卷三·第九课）：生我者父母、比和者兄弟、我生者子孙、我克者妻财、克我者官鬼
export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';
export function liuQinOf(palaceElem: Element5, branchElem: Element5): LiuQin {
  const rel = elemRelation(palaceElem, branchElem);
  switch (rel) {
    case 'sheng': return '子孙';      // 我生者
    case 'shengBy': return '父母';    // 生我者
    case 'ke': return '妻财';         // 我克者
    case 'keBy': return '官鬼';       // 克我者
    default: return '兄弟';           // 比和者
  }
}
