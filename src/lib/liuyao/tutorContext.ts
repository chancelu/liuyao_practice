// 助教上下文装配：把当前排盘与解读状态序列化为教学上下文，供 Kimi 助教针对性答疑
import type { PaiPan } from './engine';
import type { Interpretation } from './interpret';

const POS_N = ['', '初', '二', '三', '四', '五', '上'];

export function buildGuaContext(p: PaiPan, it: Interpretation, question?: string): string {
  const g = p.ganzhi;
  const lines: string[] = [];
  lines.push(`【当前卦局】`);
  if (question?.trim()) lines.push(`所问何事：「${question.trim()}」`);
  lines.push(`起卦时间四柱：${g.year}年 ${g.month}月 ${g.day}日 ${g.hour}时（${g.jieqi}节后，月建${g.monthBranch}，日辰${g.dayBranch}，日干${g.dayStem}，旬空${p.kong.join('')}）`);
  lines.push(`本卦：${p.benGua.info.name}（${p.benGua.upper}上${p.benGua.lower}下）${p.bianGua ? `；变卦：${p.bianGua.info.name}` : '；六爻安静无变卦'}；互卦：${p.huGua?.name ?? '无'}`);
  lines.push(`卦宫：${p.palace}宫（五行属${p.palaceElement}），第${p.seq}卦；世在${POS_N[p.shiPos]}爻，应在${POS_N[p.yingPos]}爻，卦身${p.guaShenBranch}`);
  lines.push(`逐爻（初→上）：`);
  for (const l of p.lines) {
    const parts = [
      `${l.posName}爻`,
      `${l.liushen}`,
      `${l.liuqin}${l.stem}${l.branch}${l.element}`,
      l.shiYing ? `【${l.shiYing}】` : '',
      l.fuShen ? `（伏神：${l.fuShen.liuqin}${l.fuShen.stem}${l.fuShen.branch}${l.fuShen.element}）` : '',
      l.moving ? `动，化${l.bianLiuqin}${l.bianStem}${l.bianBranch}${l.bianElement}` : '静',
      l.anDong ? '暗动' : '',
      l.kong ? '旬空' : '',
      l.yuePo ? '月破' : '',
      l.riPo ? '日破' : '',
      l.riHe ? '日合' : '',
      l.jinTui || '',
      l.huitou && l.huitou !== '化比和' ? l.huitou : '',
      `月建下${l.monthState}·日辰下${l.dayState}·评分${l.score}`,
    ];
    lines.push('  ' + parts.filter(Boolean).join(' '));
  }
  lines.push(`【测事与取用】测事类别：${it.category.label}；${it.candidatesNote}${it.fuNote ? '；' + it.fuNote : ''}`);
  lines.push(`原神：${it.yuanshenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}${l.moving ? '动' : ''}`).join('、') || '不上卦'}；忌神：${it.jishenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}${l.moving ? '动' : ''}`).join('、') || '不上卦'}；仇神：${it.choushenLines.map((l) => `${l.posName}爻${l.branch}${l.liuqin}`).join('、') || '不上卦'}`);
  lines.push(`【系统断卦】结论「${it.verdict}」：${it.summary}`);
  for (const f of it.findings) lines.push(`  - ${f.title}：${f.detail}`);
  if (it.yingqi.length) lines.push(`应期参考：${it.yingqi.join('；')}`);
  lines.push(`世应关系：${it.shiyingNote}`);
  return lines.join('\n');
}

const STEP_NAMES: Record<number, string> = {
  1: '起卦成象（六掷成卦、定动变）',
  2: '定时定局（四柱、月建日辰、旬空）',
  3: '定宫安世应（卦宫、世应、卦身）',
  4: '纳甲装卦（天干地支五行）',
  5: '配六亲六神',
  6: '查动静参数（旬空月破日破暗动、化进退、反伏吟、互卦）',
  7: '取用神（主辅用神、双现取舍、伏神）',
  8: '旺衰生克（月建日辰作用、原神忌神仇神）',
  9: '综合断卦（吉凶、应期、卦义）',
};

export function buildSystemPrompt(stepNo?: number): string {
  const stepLine = stepNo
    ? `学员当前正在研习第 ${stepNo} 步「${STEP_NAMES[stepNo]}」，请围绕这一步的规则与当前卦局在此步的具体推演来回答。`
    : '学员可以自由提问六爻任何问题。';
  return [
    '你是「云笈书院」的六爻助教，教材为《云笈书院六爻卷》卷一（易理：阴阳五行、天干地支、十二长生、四时生旺）、卷二（卦理：八卦象意、六十四卦解析）、卷三（六爻基础：起卦、装卦四要素——世应/纳支/六亲/六神、旬空月破日破暗动、反伏吟、墓库、卦身、神煞）、卷四（用神：用神取用、原神忌神仇神、进神退神、飞伏神、用神双现）。',
    stepLine,
    '回答要求：',
    '1. 先直接回答问题，再结合下方给出的当前卦局数据做针对性讲解（引用具体爻位、干支、六亲）；',
    '2. 讲规则时注明出自哪一卷哪一课（如"卷三·第八课"）；',
    '3. 语言通俗，必要时用口诀帮助记忆；',
    '4. 学员的问题若超出教材范围，可以按传统六爻通例补充，但要说明"此非本课程所授"；',
    '5. 单次回答控制在 300 字以内，重点突出，可用短句分行。',
  ].join('\n');
}

/** 综合断卦专用 prompt：完整分析 + 应期 + 决策 + 化解，面向零基础学员 */
export function buildVerdictPrompt(): string {
  return [
    '你是「云笈书院」的六爻断卦助教，精通《云笈书院六爻卷》卷一~卷四（易理、卦理、装卦、用神）。下面给你一盘完整卦局数据和学员所问之事，请做完整综合断卦，读者是零基础学员。',
    '严格按以下分节输出，每节以【标题】开头单独成行：',
    '【结论】一句话断清吉凶成败（如"可成，但过程有阻滞"），并说明把握程度；',
    '【断卦过程】通俗讲你的断卦路径：用神旺衰死活 → 原神忌神谁旺谁动 → 动爻化进化退与回头生克 → 世应生合冲克 → 卦格（六冲/六合/反伏吟）与六神取象。每一点都要引用具体爻位干支（如"四爻妻财未土发动化回头生"），并注明卷次依据；',
    '【应期】推断事情应验或明朗的时间（何月何日或哪个节气前后），写清推断逻辑（空待出空、墓待冲开、静旺待冲、动待值合等，卷三/卷四）；',
    '【决策建议】学员接下来该怎么做、把握什么、避开什么，给 2~4 条具体可操作的建议；',
    '【化解趋避】从五行方位、时机选择、人事调整角度给趋吉避凶的做法；若卦象本吉，说明如何顺势承接而非胡乱化解；',
    '【给小白的话】两三句大白话总结全卦，并提醒：六爻明阴阳、示吉凶，反映发展趋势而非铁口定数（卷三·第三课）。',
    '要求：总长度 800 字以内；通俗但专业；一切判断必须基于给出的卦局数据，不得编造爻位或干支；所问之事若有具体疑问，结论必须正面回应。',
  ].join('\n');
}
