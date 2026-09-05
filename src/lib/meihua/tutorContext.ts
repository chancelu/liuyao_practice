// 梅花助教上下文：把梅花卦序列化为教学上下文，prompt 以《梅花易数》体系为依据
import type { MeihuaChart } from './engine';
import { TRIGRAM_IMAGE } from './constants';

export const MEIHUA_BOOKS = [
  { name: '《梅花易数》', author: '托名邵雍（宋·明清辑本）', use: '梅花总纲：先天卦数起卦、体用生克、互变应期、万物类象、十应论' },
  { name: '《周易》经传', author: '先秦', use: '六十四卦卦爻辞与大象传——变卦之卦辞、动爻之爻辞的原始依据' },
  { name: '《易数一撮金》', author: '托名邵雍（明清坊间本）', use: '数字起课占断歌诀（江湖流传本，可作参考，不可尽信）' },
];

const BOOK_NAMES = MEIHUA_BOOKS.map((b) => b.name).join('、');

export function buildMeihuaContext(c: MeihuaChart, question: string, methodLabel: string): string {
  const lines: string[] = [];
  lines.push(`【当前梅花卦】（起卦方式：${methodLabel}）`);
  if (question.trim()) lines.push(`所问：「${question.trim()}」`);
  lines.push(`起卦推导：${c.lines[0]}`);
  lines.push(`本卦「${c.ben.name}」（上${c.ben.upper}·下${c.ben.lower}），第${c.moving}爻动`);
  lines.push(`互卦「${c.hu.name}」（上互${c.hu.upper}·下互${c.hu.lower}，${c.hu.note}）`);
  lines.push(`变卦「${c.bian.name}」（上${c.bian.upper}·下${c.bian.lower}）`);
  lines.push(`体用：动爻${c.moving > 3 ? '在上卦' : '在下卦'}，体=${c.tiGua}(${c.tiElement})，用=${c.yongGua}(${c.yongElement})`);
  lines.push(`体用关系：${c.relation}（${c.verdict.tone}）——${c.verdict.text}`);
  lines.push(`卦气旺衰：${c.season}（月建${c.monthBranch}）——体卦${c.tiGua}${c.tiWang}，用卦${c.yongGua}${c.yongWang}`);
  lines.push(`应期卦数：上卦数+下卦数+动爻数=${c.yingqiNum}（体旺则应快、体弱则应迟，兼看互变卦数）`);
  lines.push('');
  lines.push('【八卦类象速查】（取象依据《梅花易数·万物类象》）');
  const guas = Array.from(new Set([c.tiGua, c.yongGua, c.ben.upper, c.ben.lower, c.bian.upper, c.bian.lower]));
  for (const g of guas) {
    const img = TRIGRAM_IMAGE[g];
    if (img) lines.push(`  ${g}(${img.element}·卦德${img.nature})：人—${img.person}；物—${img.thing}；方位${img.direction}；身体${img.body}`);
  }
  return lines.join('\n');
}

const STEP_NAMES: Record<number, string> = {
  1: '起卦（先天卦数与各起法）',
  2: '排本卦（上下卦与动爻）',
  3: '排变卦（动爻阴阳互变）',
  4: '排互卦（二三四·三四五爻）',
  5: '分体用（动爻所在为用）',
  6: '体用生克（五关系吉凶总诀）',
  7: '卦气旺衰（按月令五行）',
  8: '类象取事（万物类象对应所问）',
  9: '应期推断（卦数法与旺衰迟速）',
  10: '综合断卦（AI 完整解读）',
};

export function buildMeihuaSystemPrompt(stepNo?: number): string {
  const stepLine = stepNo
    ? `学员当前正在研习第 ${stepNo} 步「${STEP_NAMES[stepNo]}」，请围绕这一步的规则与本卦在此步的具体推演来回答。`
    : '学员可以自由提问梅花易数任何问题。';
  return [
    `你是梅花易数助教，解读依据：${BOOK_NAMES}；兼知江湖报数法、新派梅花（易魂）、外应派等流派差异（学员问起时要讲清流派分歧，不混为一谈）。`,
    stepLine,
    '回答要求：',
    '1. 先直接回答问题，再结合下方给出的本卦数据做针对性讲解（引用具体卦名、体用、动爻）；',
    '2. 讲规则时注明出处（如《梅花易数·体用总诀》论生克吉凶、《万物类象》论取象、《十应论》论互变外应）；',
    '3. 语言通俗，面向零基础学员，用「先看…再看…」的步骤化表达；',
    '4. 梅花易数是传统文化中的取象比类思维模型，不做铁口断言；涉及健康、法律、重大财务决策时提醒以现实专业意见为准；',
    '5. 单次回答控制在 300 字以内，重点突出，可用短句分行。',
  ].join('\n');
}

/** AI 完整断卦 prompt */
export function buildMeihuaReadingPrompt(): string {
  return [
    `你是梅花易数占断师，依据${BOOK_NAMES}断卦。下面给你一个完整梅花卦数据（含起卦推导、本互变三卦、动爻、体用五行与关系、卦气旺衰、应期卦数、类象速查），请做完整断卦，读者是零基础学员。`,
    '严格按以下分节输出，每节以【标题】开头单独成行：',
    '【起卦成象】一两句说清：怎么起的这个卦，得什么本卦、哪爻动、变成什么卦，卦名卦象给人什么第一印象；',
    '【体用总断】体卦（求测人/事之主）与用卦（所问之事/对方）的五行关系直断吉凶：用生体/比和/体克用/体生用/用克体分别意味着什么，结合卦气旺衰加减分量（体旺能担、体弱难当）；',
    '【互卦看中途】互卦是事情发展的中间过程与内因：互卦上下卦与体卦的生克关系，说明事情中途会遇到什么助力或阻碍；',
    '【变卦看结局】变卦是最终结果：变出的卦与体卦的关系，说明事情最后落在什么状态；',
    '【类象取事】结合所问之事，从体卦、用卦、互卦、变卦的万物类象（人物/事物/方位/身体）里挑贴切的象来具体化：这件事像什么、关键人物是谁、往哪个方向应；',
    '【应期推断】用卦数法（主卦数总和、互卦数、变卦数三个数）与卦气旺衰推断事情可能兑现的时间节奏（用「可能」「倾向于」，说明体旺应快、体弱应迟的道理，不铁断）；',
    '【建议】给 2-3 条可操作建议：宜动宜守、往何方、找什么人、防什么；',
    '【给小白的话】两三句大白话总结，并提醒：梅花易数是古人取象比类的思维模型，供学习参考，具体行动以现实条件与专业意见为准。',
    '要求：总长度 1500 字以内；通俗但专业；一切判断基于给出的卦数据，不得编造卦名与五行；注明《梅花易数》出处。',
  ].join('\n');
}
