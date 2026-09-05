// 梅花易数基础常量 —— 依据《梅花易数》（托名邵雍）：先天卦数起卦、体用生克、卦气旺衰、万物类象
import type { Element5 } from '../liuyao/constants';
import { TRIGRAM_ELEMENT } from '../liuyao/constants';

// ============ 先天八卦数（伏羲先天：乾一兑二离三震四巽五坎六艮七坤八） ============
export const XIANTIAN: Record<string, number> = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 };
export const NUM_TRIGRAM: Record<number, string> = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' };

/** 数→卦（先天数，0 作 8 坤） */
export function trigramOfNum(n: number): string {
  return NUM_TRIGRAM[((n - 1) % 8 + 8) % 8 + 1];
}
/** 数→动爻（0 作 6 上爻） */
export function yaoOfNum(n: number): number {
  return ((n - 1) % 6 + 6) % 6 + 1;
}

// ============ 八卦类象（《梅花易数·万物类象》精选） ============
export interface TrigramImage {
  gua: string; num: number; element: Element5;
  nature: string;   // 卦德
  person: string;   // 人物
  body: string;     // 身体
  thing: string;    // 事物
  direction: string; // 后天方位
  season: string;   // 主时
  color: string;
}
export const TRIGRAM_IMAGE: Record<string, TrigramImage> = {
  乾: { gua: '乾', num: 1, element: TRIGRAM_ELEMENT.乾, nature: '健', person: '君父、长辈、领导、名人', body: '头、骨、肺', thing: '金玉、圆形物、贵重物品、官方文书', direction: '西北', season: '秋冬之交', color: '白、金' },
  兑: { gua: '兑', num: 2, element: TRIGRAM_ELEMENT.兑, nature: '悦', person: '少女、歌者、演说者、中介', body: '口、舌、牙、气管', thing: '缺损之物、饮食器具、乐器', direction: '正西', season: '秋', color: '白' },
  离: { gua: '离', num: 3, element: TRIGRAM_ELEMENT.离, nature: '丽（依附）', person: '中女、文人、目明者', body: '目、心、血', thing: '文书、书画、火光、电、亮丽之物', direction: '正南', season: '夏', color: '红、紫' },
  震: { gua: '震', num: 4, element: TRIGRAM_ELEMENT.震, nature: '动', person: '长男、行动者、执法人员', body: '足、肝、筋', thing: '车辆、响声、竹木、新生事物', direction: '正东', season: '春', color: '青、绿' },
  巽: { gua: '巽', num: 5, element: TRIGRAM_ELEMENT.巽, nature: '入（顺伏）', person: '长女、僧道、犹豫之人', body: '股、胆、呼吸', thing: '绳索、长条物、风、香气、合同文书', direction: '东南', season: '春夏之交', color: '青、碧' },
  坎: { gua: '坎', num: 6, element: TRIGRAM_ELEMENT.坎, nature: '陷（险）', person: '中男、水手、暗昧之人', body: '耳、肾、血、泌尿', thing: '水、酒、油、暗昧之物、陷阱', direction: '正北', season: '冬', color: '黑、蓝' },
  艮: { gua: '艮', num: 7, element: TRIGRAM_ELEMENT.艮, nature: '止', person: '少男、孩童、守门人、静止之人', body: '手、指、鼻、背、脾胃', thing: '山、石、门、桌凳、停止之物', direction: '东北', season: '冬春之交', color: '黄、棕' },
  坤: { gua: '坤', num: 8, element: TRIGRAM_ELEMENT.坤, nature: '顺', person: '老母、众庶、农人、宽厚者', body: '腹、脾胃、肉', thing: '土地、布帛、谷物、方形物、大众之物', direction: '西南', season: '夏秋之交', color: '黄、黑' },
};

// ============ 卦气旺衰（按季节月令，《梅花易数·卦气旺衰》） ============
// 与六爻四时生旺同理：当令者旺，令生者相，生令者休，克令者囚，令克者死
export const SEASON_OF_BRANCH: Record<string, { name: string; element: Element5 }> = {
  寅: { name: '春', element: '木' }, 卯: { name: '春', element: '木' },
  巳: { name: '夏', element: '火' }, 午: { name: '夏', element: '火' },
  申: { name: '秋', element: '金' }, 酉: { name: '秋', element: '金' },
  亥: { name: '冬', element: '水' }, 子: { name: '冬', element: '水' },
  辰: { name: '四季月', element: '土' }, 戌: { name: '四季月', element: '土' },
  丑: { name: '四季月', element: '土' }, 未: { name: '四季月', element: '土' },
};

// ============ 体用五关系断语（《梅花易数·体用总诀》） ============
export const TIYONG_VERDICT: Record<string, { tone: '吉' | '凶' | '平'; text: string }> = {
  用生体: { tone: '吉', text: '用卦生体：有进益之喜，事来助我，大吉——如贵人相助、意外得财' },
  体克用: { tone: '吉', text: '体卦克用：我可制事，小吉——需主动争取方能成' },
  比和: { tone: '吉', text: '体用比和：势均力敌、同心同德，事顺而成，多吉' },
  体生用: { tone: '平', text: '体卦生用：我生助于事，泄气耗力——小凶，主破耗、付出多而回报迟' },
  用克体: { tone: '凶', text: '用卦克体：事来克我，大凶——谋事不成，防损害、疾病、口舌' },
};

// ============ 起卦方法定义（左侧输入区用） ============
export interface QiMethodDef {
  id: string;
  label: string;
  classic: string;   // 经典出处与原文
  howto: string;     // 怎么起（白话步骤）
  scene: string;     // 适用场景
}
export const QI_METHODS: QiMethodDef[] = [
  {
    id: 'time',
    label: '年月日时起卦（经典）',
    classic: '《梅花易数·年月日时起例》：以年之地支数加月数、日数，除八余数为上卦；加时数除八为下卦；总数除六取动爻。观梅占即此法。',
    howto: '年支数（子1丑2…亥12）＋农历月数＋农历日数 → ÷8 余数得上卦；再加时辰数（子1…亥12）→ ÷8 得下卦；总和 ÷6 得动爻。本工具自动做公历→农历换算。',
    scene: '有明确起念时刻的任何事——最常用、最正统',
  },
  {
    id: 'number2',
    label: '报数起卦',
    classic: '《梅花易数》数字占之活用：「物数占」以可数之物为数。后人简化为随口报数。',
    howto: '随口报两个数：第一数 ÷8 余数为上卦，第二数 ÷8 余数为下卦；两数之和（可加时辰数）÷6 取动爻。只报一个数时，该数为上卦，加时辰数为下卦。',
    scene: '来人当面求测、电话求测，或心中忽动时——江湖最常用',
  },
  {
    id: 'numstr',
    label: '数字串起卦',
    classic: '《梅花易数·数字占》：「以数之多寡平分之，前数为上卦，后数为下卦；奇数则前少一位。」',
    howto: '一串数字（车牌、电话、编号等）：平分两段，前段各位之和 ÷8 得上卦，后段之和 ÷8 得下卦；总和 ÷6 取动爻。位数为奇时前段少一位。',
    scene: '测与某个编号、电话、车牌相关的事',
  },
  {
    id: 'text',
    label: '测字起卦',
    classic: '《梅花易数·字画占》：一字以笔画数（或分左右/上下结构）；二字以前字笔画为上卦、后字为下卦；多字平分。笔画以楷体正笔为准。',
    howto: '单字：填其楷体笔画数为上卦，加时辰数为下卦。双字：前字笔画上卦、后字笔画下卦，笔画和取动爻（本工具输入笔画数，自动计算）。',
    scene: '测字、问名、书签式占问',
  },
  {
    id: 'sound',
    label: '声音起卦',
    classic: '《梅花易数·声音占》：「闻几声，数到几，即以为上卦；加时数配为下卦。」邻夜扣门借物占即此法。',
    howto: '听到（或心中默记）的声音次数为上卦；声数＋时辰数为下卦；总和 ÷6 取动爻。',
    scene: '叩门声、鸟鸣、器物声响等突发声象起念',
  },
  {
    id: 'waiying',
    label: '外应起卦（方位/物象）',
    classic: '《梅花易数·端法后天起卦》：以所见之物/来人所自方位为上卦（后天卦位），加时数为下卦。如「老人有忧色占」老人为乾、自巽方来等例。',
    howto: '选起念时所见物象或方位对应的卦为上卦；加时辰数（或所报数）为下卦；总和 ÷6 取动爻。',
    scene: '见人、见物、见异象心动而占——外应派的入门功夫',
  },
  {
    id: 'manual',
    label: '手动直排',
    classic: '已知本卦与动爻（如从别处起得），直接指定上卦、下卦、动爻。',
    howto: '直接选上卦、下卦与动爻，引擎排变卦互卦与体用。',
    scene: '复盘旧课、录入书上卦例',
  },
];

// ============ 十应（《梅花易数·十应论》简表） ============
export const SHI_YING = [
  ['正应', '以体用生克正断，是断卦的主干'],
  ['互应', '看互卦——事情中途的变化与内因'],
  ['变应', '看变卦——事情的最终结果'],
  ['方应', '看来人所占方位之卦气'],
  ['日应', '看日辰与体卦的生克扶抑'],
  ['刻应', '看起卦时刻的外应'],
  ['外应', '起卦时所见闻的异象直读'],
  ['天时应', '阴晴风雨雷电与卦象相应'],
  ['地理应', '山川草木环境之应'],
  ['人事应', '人事动静言语之应'],
] as const;
