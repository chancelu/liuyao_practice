// 奇门遁甲（转盘）基础常量 —— 依据《烟波钓叟歌》《遁甲演义》《奇门遁甲统宗》与张志春《神奇之门》转盘体系
// 九宫洛书：戴九履一、左三右七、二四为肩、六八为足、五居中宫
import type { Element5 } from '../liuyao/constants';

// ============ 九宫 ============
export interface PalaceDef {
  num: number;          // 宫位数 1-9
  name: string;         // 坎一宫…
  gua: string;          // 后天卦
  element: Element5;
  direction: string;    // 方位
  branches: string[];   // 宫中地支（空亡/马星/击刑判定用）
}
export const PALACE: Record<number, PalaceDef> = {
  1: { num: 1, name: '坎一宫', gua: '坎', element: '水', direction: '正北', branches: ['子'] },
  2: { num: 2, name: '坤二宫', gua: '坤', element: '土', direction: '西南', branches: ['未', '申'] },
  3: { num: 3, name: '震三宫', gua: '震', element: '木', direction: '正东', branches: ['卯'] },
  4: { num: 4, name: '巽四宫', gua: '巽', element: '木', direction: '东南', branches: ['辰', '巳'] },
  5: { num: 5, name: '中五宫', gua: '中', element: '土', direction: '中央', branches: [] },
  6: { num: 6, name: '乾六宫', gua: '乾', element: '金', direction: '西北', branches: ['戌', '亥'] },
  7: { num: 7, name: '兑七宫', gua: '兑', element: '金', direction: '正西', branches: ['酉'] },
  8: { num: 8, name: '艮八宫', gua: '艮', element: '土', direction: '东北', branches: ['丑', '寅'] },
  9: { num: 9, name: '离九宫', gua: '离', element: '火', direction: '正南', branches: ['午'] },
};

/** 转盘环形顺序（后天八卦位）：坎1→艮8→震3→巽4→离9→坤2→兑7→乾6（顺时针飞转，不含中五宫） */
export const RING: number[] = [1, 8, 3, 4, 9, 2, 7, 6];
/** 飞布顺序（布地盘用，含中宫）：1→2→3→4→5→6→7→8→9 */
export const FLY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ============ 三奇六仪 ============
/** 布盘顺序固定：戊己庚辛壬癸丁丙乙（六仪+三奇） */
export const YIQI_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;
export const SAN_QI = ['乙', '丙', '丁'] as const; // 日奇、月奇、星奇
export const LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸'] as const;
export const QI_YI_LABEL: Record<string, string> = {
  乙: '日奇', 丙: '月奇', 丁: '星奇',
  戊: '六仪·甲子', 己: '六仪·甲戌', 庚: '六仪·甲申', 辛: '六仪·甲午', 壬: '六仪·甲辰', 癸: '六仪·甲寅',
};

// ============ 九星 ============
export interface StarDef { name: string; palace: number; element: Element5; nature: '吉' | '凶' | '平'; desc: string }
export const STARS: StarDef[] = [
  { name: '天蓬', palace: 1, element: '水', nature: '凶', desc: '大盗之星，主冒险、暗中之事，宜守不宜进' },
  { name: '天任', palace: 8, element: '土', nature: '吉', desc: '富星，主田土、积累、勤劳致富' },
  { name: '天冲', palace: 3, element: '木', nature: '平', desc: '禄星，主行动、果决、军警武职' },
  { name: '天辅', palace: 4, element: '木', nature: '吉', desc: '文曲星，主文化、教育、贵人扶助' },
  { name: '天禽', palace: 5, element: '土', nature: '吉', desc: '中正之星，主权威、公正，寄坤二宫' },
  { name: '天英', palace: 9, element: '火', nature: '平', desc: '景星，主名声、文书、血光，性烈' },
  { name: '天芮', palace: 2, element: '土', nature: '凶', desc: '病星，主疾病、学习、宗教玄学' },
  { name: '天柱', palace: 7, element: '金', nature: '凶', desc: '破军星，主口舌、破坏、法律' },
  { name: '天心', palace: 6, element: '金', nature: '吉', desc: '武曲星，主领导、医药、谋略决断' },
];
/** 九星转盘序（按 RING 环形宫位的原地配属）：蓬任冲辅英芮柱心（禽寄芮） */
export const STAR_RING = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'] as const;
export const STAR_OF: Record<string, StarDef> = Object.fromEntries(STARS.map((s) => [s.name, s]));

// ============ 八门 ============
export interface GateDef { name: string; palace: number; element: Element5; nature: '吉' | '凶' | '平'; desc: string }
export const GATES: GateDef[] = [
  { name: '休门', palace: 1, element: '水', nature: '吉', desc: '吉门，主休息、安逸、求财、婚姻、谒贵' },
  { name: '生门', palace: 8, element: '土', nature: '吉', desc: '大吉门，主财利、生意、房产、生养' },
  { name: '伤门', palace: 3, element: '木', nature: '凶', desc: '凶门，主伤病、争斗、讨债、渔猎' },
  { name: '杜门', palace: 4, element: '木', nature: '平', desc: '平门，主堵塞、保密、躲藏、技术专研' },
  { name: '景门', palace: 9, element: '火', nature: '平', desc: '中平门，主文书、考试、广告、血光' },
  { name: '死门', palace: 2, element: '土', nature: '凶', desc: '凶门，主死亡、坟地、结束，宜丧葬吊唁' },
  { name: '惊门', palace: 7, element: '金', nature: '凶', desc: '凶门，主惊恐、口舌、官司、盗窃' },
  { name: '开门', palace: 6, element: '金', nature: '吉', desc: '大吉门，主开创、事业、出行、求名' },
];
/** 八门转盘序：休生伤杜景死惊开 */
export const GATE_RING = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'] as const;
export const GATE_OF: Record<string, GateDef> = Object.fromEntries(GATES.map((g) => [g.name, g]));

// ============ 八神 ============
/** 阳遁序（阴遁逆布）：值符、螣蛇、太阴、六合、勾陈（白虎）、朱雀（玄武）、九地、九天 */
export const GODS_YANG = ['值符', '螣蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'] as const;
export const GOD_DESC: Record<string, { nature: '吉' | '凶' | '平'; desc: string }> = {
  值符: { nature: '吉', desc: '诸神之首，主贵人、领导、官方力量，所到之宫百恶消散' },
  螣蛇: { nature: '凶', desc: '主虚惊、缠绕、怪异、文书反复、睡眠不安' },
  太阴: { nature: '吉', desc: '主暗助、庇护、密谋、女性贵人，宜暗中行事' },
  六合: { nature: '吉', desc: '主合作、婚姻、中介、人缘，利谈判结盟' },
  勾陈: { nature: '凶', desc: '主迟滞、田土纠纷、官非牵缠（一说阳遁为白虎）' },
  朱雀: { nature: '凶', desc: '主口舌、文书、音信、火灾（一说阳遁为玄武）' },
  九地: { nature: '吉', desc: '主稳定、潜藏、长久、老母，宜守成囤聚' },
  九天: { nature: '吉', desc: '主高远、飞动、扬名、出行，利开拓向上' },
};

// ============ 定局：二十四节气三元局数（《烟波钓叟歌》诀，拆补法通用） ============
// 每节气 [上元, 中元, 下元]
export const JU_SHU: Record<string, { dun: '阳' | '阴'; ju: [number, number, number] }> = {
  冬至: { dun: '阳', ju: [1, 7, 4] }, 惊蛰: { dun: '阳', ju: [1, 7, 4] },
  小寒: { dun: '阳', ju: [2, 8, 5] },
  大寒: { dun: '阳', ju: [3, 9, 6] }, 春分: { dun: '阳', ju: [3, 9, 6] },
  雨水: { dun: '阳', ju: [9, 6, 3] },
  清明: { dun: '阳', ju: [4, 1, 7] }, 立夏: { dun: '阳', ju: [4, 1, 7] },
  谷雨: { dun: '阳', ju: [5, 2, 8] }, 小满: { dun: '阳', ju: [5, 2, 8] },
  芒种: { dun: '阳', ju: [6, 3, 9] },
  夏至: { dun: '阴', ju: [9, 3, 6] }, 白露: { dun: '阴', ju: [9, 3, 6] },
  小暑: { dun: '阴', ju: [8, 2, 5] },
  大暑: { dun: '阴', ju: [7, 1, 4] }, 秋分: { dun: '阴', ju: [7, 1, 4] },
  立秋: { dun: '阴', ju: [2, 5, 8] },
  处暑: { dun: '阴', ju: [1, 4, 7] },
  寒露: { dun: '阴', ju: [6, 9, 3] }, 立冬: { dun: '阴', ju: [6, 9, 3] },
  霜降: { dun: '阴', ju: [5, 8, 2] }, 小雪: { dun: '阴', ju: [5, 8, 2] },
  大雪: { dun: '阴', ju: [4, 7, 1] },
};

/** 三元判定（拆补法看日支）：子午卯酉=上元，寅申巳亥=中元，辰戌丑未=下元 */
export function yuanOfDay(dayBranch: string): '上元' | '中元' | '下元' {
  if ('子午卯酉'.includes(dayBranch)) return '上元';
  if ('寅申巳亥'.includes(dayBranch)) return '中元';
  return '下元';
}

/** 旬首六仪：甲子旬→戊，甲戌旬→己，甲申旬→庚，甲午旬→辛，甲辰旬→壬，甲寅旬→癸 */
export function xunshouYi(gzIndex: number): { xun: string; yi: string } {
  const xunStart = gzIndex - (gzIndex % 10);
  const XUNS = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  const YIS = ['戊', '己', '庚', '辛', '壬', '癸'];
  const i = Math.floor((xunStart % 60) / 10);
  return { xun: XUNS[i], yi: YIS[i] };
}

// ============ 凶格标注规则 ============
/** 六仪击刑：戊到震三（卯）、己到坤二（未申）、庚到艮八（丑寅）、辛到离九（午）、壬癸到巽四（辰巳） */
export const JIXING: Record<string, number[]> = { 戊: [3], 己: [2], 庚: [8], 辛: [9], 壬: [4], 癸: [4] };
/** 入墓（地盘墓库宫）：乙→坤二（未）、丙戊→乾六（戌）、丁己庚→艮八（丑）、辛壬→巽四（辰）、癸→坤二（未） */
export const RUMU: Record<string, number> = { 乙: 2, 丙: 6, 戊: 6, 丁: 8, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2 };
/** 门迫：门五行克所落宫五行即为门迫（如惊开金到震巽木） */
export function isMenPo(gateElement: Element5, palaceElement: Element5, KE: Record<Element5, Element5>): boolean {
  return KE[gateElement] === palaceElement;
}

// ============ 专项用神表（转盘经典取用） ============
export const QIMEN_YONGSHEN = [
  { id: 'zonghe', label: '综合/不明', rule: '日干为求测人，时干为所测事体，兼看值符（大环境）与值使（事的执行）' },
  { id: 'shiye', label: '事业工作', rule: '开门为事业/单位/官职，日干为自己，年干为上级领导，值符为顶头上司' },
  { id: 'caiyun', label: '财运生意', rule: '生门为财利/生意，戊为资本本钱，日干为求财人；生门生日干宫则财易求' },
  { id: 'ganqing', label: '感情婚姻', rule: '乙为妻/女方，庚为夫/男方，六合为婚姻介绍与感情；乙庚相生相合为吉' },
  { id: 'jiankang', label: '疾病健康', rule: '天芮为疾病，乙为医生医药，天心为良医；芮落宫看病位，芮克乙医难治' },
  { id: 'xueye', label: '学业考试', rule: '丁为文章/分数，景门为试卷文书，天辅为考学文昌；日干为考生' },
  { id: 'guansi', label: '官司是非', rule: '开门为法官/官方，惊门为诉讼口舌，天柱为律师；日干为己，时干为对方' },
  { id: 'chuxing', label: '出行远行', rule: '开门为道路，九天为远行高飞，日干为行人；门迫击刑之方不宜往' },
  { id: 'fangchan', label: '房产家宅', rule: '生门为房屋阳宅，死门为地基坟地，值符为宅主；生门旺相生身宅吉' },
  { id: 'liuqin', label: '六亲寻人', rule: '年干为长辈父母，月干为兄弟同辈，时干为子女晚辈；走失看六合与用神宫方位' },
] as const;
