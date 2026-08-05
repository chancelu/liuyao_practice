// 八字助教上下文：把命盘序列化为教学上下文，prompt 以八部典籍为解读依据
import type { BaZiChart } from './engine';
import { analyzeYongshen, analyzeDayun, analyzeLiunian } from './forecast';

export const BAZI_BOOKS = [
  { name: '《四柱预测学》', author: '邵伟华（当代）', use: '现代入门体系：排盘步骤、十神心性、断事程式，适合零基础建立框架' },
  { name: '《千里命稿》', author: '韦千里（民国）', use: '由浅入深的近代教科书：排四柱、起大运、六亲看法，程式清晰' },
  { name: '《渊海子平》', author: '托名徐子平（宋·明编）', use: '子平法奠基：以日干为主、十神六亲、格局源流' },
  { name: '《子平真诠》', author: '沈孝瞻（清）', use: '格局法集大成：月令取格、成格败格、相神救应' },
  { name: '《滴天髓》', author: '托名刘基·任铁樵注（清）', use: '旺衰喜忌的理气巅峰：天道地道、通根透干、体用精神' },
  { name: '《穷通宝鉴》', author: '余春台编（清）', use: '调候用神专书：十天干逐月宜忌，先调候后格局' },
  { name: '《三命通会》', author: '万民英（明）', use: '命理百科：格局、神煞、纳音、小运命宫，旁征博引' },
  { name: '《神峰通考》', author: '张楠（明）', use: '病药说：命局有病方为贵，取药为用；动静盖头诸说' },
];

const BOOK_NAMES = BAZI_BOOKS.map((b) => b.name).join('、');

export function buildBaziContext(c: BaZiChart, focus?: string): string {
  const g = c.ganzhi;
  const lines: string[] = [];
  lines.push('【当前命盘】');
  if (focus?.trim()) lines.push(`想了解的方面：「${focus.trim()}」`);
  lines.push(`${c.genderLabel}（${c.gender === 'male' ? '男' : '女'}命）：${g.year}年 ${g.month}月 ${g.day}日 ${g.hour}时（${g.jieqi}节后，日柱旬空${c.kong.join('')}，胎元${c.taiyuan}）`);
  lines.push(`日主：${c.dayMaster}${c.dayMasterElement}，生于${g.monthBranch}月（${c.deLing ? '得令' : '失令'}），旺衰三因子合计 ${c.strength.total}/100，判为「${c.strength.label}」`);
  lines.push(`格局：${c.geju.name}${c.geju.touGan ? `（月令人元${c.geju.touGan}透干而取）` : '（月令人元不透，以主气立格）'}；取格推演：${c.geju.steps.join('；')}`);
  if (c.relations.length) {
    lines.push(`干支合冲刑害：${c.relations.map((r) => `${r.pair} ${r.kind}`).join('；')}`);
  } else {
    lines.push('干支合冲刑害：四柱无合冲刑害（静局）');
  }
  lines.push(`旺衰明细：得令 ${c.strength.deling.score}/40（${c.strength.deling.verdict}）；得地 ${c.strength.dedi.score}/30（${c.strength.dedi.verdict}）；得势 ${c.strength.deshi.score}/30（${c.strength.deshi.verdict}）`);
  for (const p of c.pillars) {
    lines.push(
      `  ${p.name}：${p.gz}（${p.stemElement}${p.branchElement}）天干十神「${p.shiShen}」，藏干 ${p.canggan.map((x) => `${x.stem}(${x.shiShen})`).join('、')}，地势${p.dishi}，自坐${p.zizuo}，纳音${p.nayin}${p.kong ? '，临空亡' : ''}${p.shensha.length ? `，神煞：${p.shensha.join('、')}` : ''}`,
    );
  }
  lines.push(`五行力量：木${c.wuxingCount.木} 火${c.wuxingCount.火} 土${c.wuxingCount.土} 金${c.wuxingCount.金} 水${c.wuxingCount.水}（教学简化计分）`);

  // —— 用神四通道与质检 ——
  const nowYear = new Date().getFullYear();
  const yong = analyzeYongshen(c);
  lines.push(`【用神结论】${yong.summary}`);
  lines.push(`用神质检三问：${yong.quality.map((q) => `${q.q}${q.ok ? '过关' : '未过'}（${q.a}）`).join('；')}`);

  // —— 大运逐年分析 ——
  const dy = analyzeDayun(c, yong, nowYear);
  lines.push(`大运${c.dayunDir}：${c.qiyunNote}`);
  lines.push(`大运序列（含吉凶基调）：${dy.map((d) => `${d.startAge}岁起${d.gz}(${d.shiShen}·${d.tone}${d.current ? '·当前' : ''}${d.hits.length ? `，引爆点：${d.hits.join('；')}` : ''})`).join('，')}`);

  // —— 流年应期（过去验证 + 未来预测素材） ——
  const ln = analyzeLiunian(c, yong, dy, nowYear);
  const withTrig = ln.filter((y) => y.triggers.length > 0);
  const past = withTrig.filter((y) => y.past).slice(-5);
  const future = withTrig.filter((y) => !y.past).slice(0, 6);
  if (past.length) lines.push(`过去有引动的流年（供反推验证）：${past.map((y) => `${y.year}${y.gz}(${y.shiShen}·${y.tone})：${y.triggers.join('；')}`).join('｜')}`);
  if (future.length) lines.push(`未来有引动的流年（预测重点）：${future.map((y) => `${y.year}${y.gz}(${y.shiShen}·${y.tone})：${y.triggers.join('；')}`).join('｜')}`);
  lines.push(`全部流年基调：${ln.map((y) => `${y.year}${y.gz}${y.tone}`).join('、')}`);
  return lines.join('\n');
}

const STEP_NAMES: Record<number, string> = {
  1: '日主定性（十天干性情）',
  2: '月令环境（季节寒暖与调候伏笔）',
  3: '强弱判断（得令得地得势）',
  4: '取用神（扶抑·调候·通关·顺势四通道）',
  5: '用神质检（局里有吗·有根吗·受伤吗）',
  6: '定格局（月令透干取格与相神成败）',
  7: '十神读人（十神×宫位）',
  8: '刑冲合害（机关引线）',
  9: '神煞标注（应象润色）',
  10: '排大运（顺逆与起运数）',
  11: '大运分析（喜忌定调与引爆点）',
  12: '流年应期（七大触发机制）',
  13: '流月细化（应期到月）',
  14: '综合论命（AI 完整解读）',
};

export function buildBaziSystemPrompt(stepNo?: number): string {
  const stepLine = stepNo
    ? `学员当前正在研习第 ${stepNo} 步「${STEP_NAMES[stepNo]}」，请围绕这一步的规则与本命盘在此步的具体推演来回答。`
    : '学员可以自由提问八字命理任何问题。';
  return [
    `你是八字命理助教，解读依据八部典籍：${BOOK_NAMES}。论命体系以子平法为主：以日干为主、月令为纲、十神论六亲、旺衰定喜忌、格局论成败、大运看起伏。`,
    stepLine,
    '回答要求：',
    '1. 先直接回答问题，再结合下方给出的命盘数据做针对性讲解（引用具体柱位、干支、十神）；',
    '2. 讲规则时注明出自哪部典籍（如《滴天髓》论旺衰、《子平真诠》论格局、《穷通宝鉴》论调候、《神峰通考》论病药）；',
    '3. 语言通俗，面向零基础学员，必要时用口诀帮助记忆；',
    '4. 命理是传统文化中的趋势参考，不做铁口断言；涉及健康、重大决策时提醒以现实专业意见为准；',
    '5. 单次回答控制在 300 字以内，重点突出，可用短句分行。',
  ].join('\n');
}

/** AI 完整命理解读 prompt */
export function buildBaziReadingPrompt(): string {
  return [
    `你是八字命理师，精通${BOOK_NAMES}八部典籍。下面给你一个完整命盘数据（含强弱、用神四通道、格局、刑冲合害、大运吉凶基调、过去与未来有引动的流年，以及学员想了解的方面），请做完整解读，读者是零基础学员。`,
    '严格按以下分节输出，每节以【标题】开头单独成行：',
    '【命盘总览】一两句话概括此命的整体气象（日主、月令、五行偏向、强弱与格局）；',
    '【性格天赋】从十天干本性、五行力量与十神组合讲性格特质与天赋倾向（《滴天髓》论性情、《渊海子平》论十神心性），引用具体干支十神；',
    '【格局与用神】结合给出的取格推演与用神四通道校验，点评格局成败（《子平真诠》）、调候需要（《穷通宝鉴》）、病药通关（《神峰通考》），说明用神质检三问的结果对格局高低的影响；',
    '【过去回顾】从给出的「过去有引动的流年」中挑 2-3 个最有标志性的年份，说明该年触发了什么机制（如冲动夫妻宫、填实空亡、岁运并临）、理论上容易发生哪类事情（如变动、婚恋、压力、破财），语气为「据盘理推测」，请学员自行对照验证——这是检验命盘判读是否正确的环节；',
    '【未来展望】从「未来有引动的流年」出发，逐年指出未来 3-5 年哪些年份较顺（引动喜用）、哪些年份宜守（冲忌、天克地冲），给出当年的主题词与注意事项；',
    '【大运走势】结合大运序列的吉凶基调，指出哪几步运较顺、哪几步宜守（注明起止年龄与「当前」运），说明判断逻辑；',
    '【逐项分析】针对学员想了解的方面（若无则说明事业、财运、感情、健康大意），结合十神与柱位（年月日时分主祖辈早年/父母青年/自身夫妻/子女晚年）分析；',
    '【建议与趋避】从五行喜用角度给具体建议：适合的行业方向、方位、颜色、人际合作属相等；',
    '【给小白的话】两三句大白话总结，并提醒：八字是传统术数的趋势参考，「命好不如运好，运好不如心态好」，具体人生选择以现实努力与专业意见为准。',
    '要求：总长度 1200 字以内；通俗但专业；一切判断基于给出的命盘数据，不得编造干支与年份；注明典籍出处。',
  ].join('\n');
}
