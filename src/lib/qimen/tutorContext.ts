// 奇门助教上下文：把奇门局序列化为教学上下文，prompt 以经典与转盘体系为依据
import type { QimenChart } from './engine';
import { PALACE, STAR_OF, GATE_OF, QI_YI_LABEL } from './constants';
import { STEM_ELEMENT } from '../liuyao/constants';

export const QIMEN_BOOKS = [
  { name: '《烟波钓叟歌》', author: '托名张良·宋人整理', use: '奇门总纲歌诀：阴阳遁、定局、值符值使、八神排布尽在其中' },
  { name: '《遁甲演义》', author: '程道生（明）', use: '三奇六仪名义、八门类象、法术择方的系统整理' },
  { name: '《奇门遁甲统宗》', author: '托名诸葛武侯（明清汇编）', use: '格局大全：伏吟反吟、击刑入墓、空亡马星、诸遁格' },
  { name: '《奇门法窍》', author: '锡孟樨（清）', use: '飞盘奇门代表，取用与起局的精细辨析' },
  { name: '《神奇之门》', author: '张志春（当代）', use: '转盘奇门现代教科书：拆补定局、转盘活盘操作、用神体系' },
  { name: '《开悟之门》', author: '张志春（当代）', use: '《神奇之门》续篇：断局思路与大量实例' },
];

const BOOK_NAMES = QIMEN_BOOKS.map((b) => b.name).join('、');

export function buildQimenContext(c: QimenChart, question: string, categoryLabel: string, categoryRule: string): string {
  const gz = c.ganzhi;
  const lines: string[] = [];
  lines.push('【当前奇门局】（时家转盘·拆补法）');
  if (question.trim()) lines.push(`所问：「${question.trim()}」（测事类别：${categoryLabel}）`);
  lines.push(`四柱：${gz.year}年 ${gz.month}月 ${gz.day}日 ${gz.hour}时（${c.jieqi}节气，日干${gz.dayStem}）`);
  lines.push(`定局：${c.juNote}`);
  lines.push(`旬首：时柱属${c.xun}旬，遁「${c.xunYi}」（${QI_YI_LABEL[c.xunYi]}）；值符${c.zhifuStar}（自${PALACE[c.zhifuSrcPalace].name}）、值使${c.zhifuGate}，值符加时干落${PALACE[c.zhifuDstPalace].name}`);
  const signals = [c.starFuyin && '星伏吟', c.starFanyin && '星反吟', c.gateFuyin && '门伏吟', c.gateFanyin && '门反吟', c.wubu && '五不遇时'].filter(Boolean).join('、');
  lines.push(`全局信号：${signals || '无伏吟反吟，非五不遇时（平）'}`);
  lines.push('');
  lines.push('【九宫盘面】（神 / 星 / 门 / 天盘干+地盘干）');
  for (const p of c.palaces) {
    const def = PALACE[p.num];
    if (p.num === 5) {
      lines.push(`  ${def.name}（中宫）：地盘${p.diGan}（寄坤二宫随天禽转）`);
      continue;
    }
    const marks = [
      p.kong ? '空亡' : '',
      p.horse ? '马星' : '',
      ...p.flags,
    ].filter(Boolean).join('·');
    lines.push(
      `  ${def.name}（${def.direction}·${def.element}）：神「${p.god}」星「${p.star}${STAR_OF[p.star]?.nature ?? ''}」门「${p.gate}${GATE_OF[p.gate]?.nature ?? ''}」天盘${p.tianGan}(${STEM_ELEMENT[p.tianGan]})${p.jiGan ? `寄${p.jiGan}` : ''}+地盘${p.diGan}(${STEM_ELEMENT[p.diGan]})${marks ? ` 〔${marks}〕` : ''}`,
    );
  }
  if (c.geju.length) lines.push(`【命中格局】${c.geju.join('；')}`);
  else lines.push('【命中格局】无经典格局（平局，以用神生克论）');
  lines.push(`【取用神】${categoryRule}`);
  lines.push(`日干${gz.dayStem}(${STEM_ELEMENT[gz.dayStem]})落宫为求测人，时干${gz.hour[0]}(${STEM_ELEMENT[gz.hour[0]]})落宫为所测事体`);
  lines.push(`排盘过程：${c.steps.join(' → ')}`);
  return lines.join('\n');
}

const STEP_NAMES: Record<number, string> = {
  1: '定局（节气三元与阴阳遁）',
  2: '布地盘（三奇六仪顺逆飞布）',
  3: '定值符值使（旬首与仪奇）',
  4: '转天盘（值符加时干）',
  5: '布八门（值使随时支）',
  6: '布八神（阳顺阴逆）',
  7: '标注（空亡·马星·击刑·入墓·门迫）',
  8: '取用神（日干人时干事与专项取用）',
  9: '看格局（吉凶格与伏反吟）',
  10: '门派拓展（阴盘/飞盘/江湖法）',
  11: '综合断局（AI 完整解读）',
};

export function buildQimenSystemPrompt(stepNo?: number): string {
  const stepLine = stepNo
    ? `学员当前正在研习第 ${stepNo} 步「${STEP_NAMES[stepNo]}」，请围绕这一步的规则与本局在此步的具体推演来回答。`
    : '学员可以自由提问奇门遁甲任何问题。';
  return [
    `你是奇门遁甲助教，主修时家转盘奇门，解读依据：${BOOK_NAMES}；兼知阴盘奇门、飞盘奇门等门派差异（学员问起时要讲清门派分歧，不混为一谈）。`,
    stepLine,
    '回答要求：',
    '1. 先直接回答问题，再结合下方给出的本局数据做针对性讲解（引用具体宫位、星门神干）；',
    '2. 讲规则时注明出处（如《烟波钓叟歌》论定局、《神奇之门》论转盘操作、《遁甲演义》论八门类象）；',
    '3. 语言通俗，面向零基础学员，用「先看…再看…」的步骤化表达；',
    '4. 奇门是传统文化中的时空决策参考，不做铁口断言；涉及健康、法律、重大财务决策时提醒以现实专业意见为准；',
    '5. 单次回答控制在 300 字以内，重点突出，可用短句分行。',
  ].join('\n');
}

/** AI 完整断局 prompt */
export function buildQimenReadingPrompt(): string {
  return [
    `你是奇门遁甲遁甲师，精通时家转盘，依据${BOOK_NAMES}断局。下面给你一个完整奇门局数据（含定局、值符值使、九宫星门神干、空亡马星击刑入墓、命中格局与取用规则），请做完整断局，读者是零基础学员。`,
    '严格按以下分节输出，每节以【标题】开头单独成行：',
    '【本局总览】一两句话概括：什么局（阴阳遁几局）、值符值使是什么、有没有伏吟反吟/五不遇时等大信号，全局是宜动还是宜守；',
    '【人与事】日干宫（求测人处境）与时干宫（事情本身状态）各自的星门神干组合直读：人在什么状态、事在往哪走；两宫生克关系说明事与人谁顺手谁费劲；',
    '【用神细断】按测事类别的取用规则，找专项用神落宫，分析其星、门、神、天地盘干组合与空亡马星击刑入墓等标注，给出这件事的具体判断（成不成、顺不顺、卡在哪）；',
    '【格局加减分】若有命中格局（青龙返首/飞鸟跌穴/玉女守门/遁格/伏反吟等），说明它对所问之事的加成或减损；格局带伤（空亡击刑入墓门迫）要明说打折；',
    '【应期推断】用空亡出空、马星冲动、值使门落宫远近等线索，推测事情可能的时间节点或节奏（用「可能」「倾向于」，不铁断）；',
    '【方位建议】若有宜往之方（吉门吉星吉神之宫），指出方向与场景用法（如谈判坐向、出行方位）；',
    '【决策建议】综合给出 2-3 条可操作建议：宜动/宜守、何时动、找什么人、防什么坑；',
    '【给小白的话】两三句大白话总结，并提醒：奇门是古人时空决策模型的参考，「急则从神缓从门」，具体行动以现实条件与专业意见为准。',
    '要求：总长度 1500 字以内；通俗但专业；一切判断基于给出的局数据，不得编造干支宫位；注明典籍或体系出处。',
  ].join('\n');
}
