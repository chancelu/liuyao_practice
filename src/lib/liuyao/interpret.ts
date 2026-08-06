// 卦象解读引擎 —— 断卦流程与依据出自六爻课程卷三、卷四及习题卷
// 总纲（习题卷问答题65）：以用神为主线，兼看世、应，分析五行生克冲合关系，
// 考虑月建、日辰影响，以及旺相休囚、动变、旬空、月破、暗动，结合六神、卦象综合判断。

import { wangShuaiLabel } from './engine';
import type { PaiPan, LineInfo } from './engine';
import { elemRelation, BRANCH_ELEMENT, MUKU, isChong, isHe } from './constants';
import type { LiuQin } from './constants';
import { jiaziOf } from './calendar';

export interface QuestionCategory {
  id: string;
  label: string;
  yongshen: LiuQin | '世' | '应';
  fuShenAux?: (LiuQin | '世' | '应')[];
  basis: string;   // 取用依据（卷四）
}

// 测事类别 → 用神（卷四·第一课/第七课百题库）
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  { id: 'caiyun', label: '财运求财（生意、投资、奖金）', yongshen: '妻财', fuShenAux: ['子孙', '世'],
    basis: '卷四·第一课：妻财爻——金银、钱、粮、货物等，一切为我所掌握、控制者，以妻财爻为用神。' },
  { id: 'shiye', label: '事业工作（升职、调动、名气）', yongshen: '官鬼', fuShenAux: ['父母', '世'],
    basis: '卷四·第一课：官鬼爻——求官、求名、升迁调动，一切约束我、限制我者。百题库26：升职取父母爻（委任书），官鬼爻辅助。' },
  { id: 'kaoshi', label: '考试升学（录取、文书、合同）', yongshen: '父母', fuShenAux: ['官鬼', '世'],
    basis: '卷四·百题库8/86：能否考中/入职以录取通知书为准，取父母爻为用神，官鬼辅助。' },
  { id: 'changbei', label: '父母长辈（房屋、证件、单位）', yongshen: '父母', fuShenAux: ['世'],
    basis: '卷四·第一课：父母爻——一切扶养我、庇护我者，房屋、文书、证件、工作单位皆是。' },
  { id: 'zinv', label: '子女晚辈（学生、宠物、医药）', yongshen: '子孙', fuShenAux: ['世'],
    basis: '卷四·第一课：子孙爻——儿子、孙子、徒弟、学生，一切小辈及医生、医药、家禽家畜。百题库12：被"我"所养之物皆为子孙。' },
  { id: 'hunyin_nan', label: '婚姻感情·男问女', yongshen: '妻财', fuShenAux: ['世', '应'],
    basis: '卷四·百题库24：男问女感情取妻财爻。习题卷69：男测婚姻以妻财爻为用神。' },
  { id: 'hunyin_nv', label: '婚姻感情·女问男', yongshen: '官鬼', fuShenAux: ['世', '应'],
    basis: '卷四·第一课：官鬼爻——女测夫以官鬼为用神。习题卷69：女测婚姻以官鬼爻为用神。' },
  { id: 'xiongdi', label: '兄弟朋友（同辈、同事、竞争者）', yongshen: '兄弟', fuShenAux: ['世'],
    basis: '卷四·第一课：兄弟爻——兄弟姐妹、结拜兄弟、知心好友，与我同类者。百题库5：问六亲之事以六亲为主用神。' },
  { id: 'guansi', label: '官司诉讼（是非、纠纷）', yongshen: '官鬼', fuShenAux: ['世', '应'],
    basis: '卷四·百题库88：问官司取官鬼爻兼看世应，官鬼爻为官司，世为己应为对方。' },
  { id: 'jibing', label: '疾病健康（病情、医治）', yongshen: '官鬼', fuShenAux: ['子孙', '世'],
    basis: '卷四·第一课：官鬼爻——疑惑、忧虑、疾病。百题库53/99：问病取官鬼（病），子孙爻为医药医生辅看。' },
  { id: 'chuxing', label: '出行远行（旅途、行人）', yongshen: '世', fuShenAux: ['应'],
    basis: '卷四·百题库16/67/89：核心问题是"我"能否出行顺利，取世爻为用神。' },
  { id: 'shiwu', label: '失物寻找（财物遗失）', yongshen: '妻财', fuShenAux: ['世'],
    basis: '卷四·百题库25/43：失物取妻财爻（本质上就是找财物）。' },
  { id: 'zishen', label: '自身之事（运气、平安、能力）', yongshen: '世', fuShenAux: [],
    basis: '卷四·第一课：自占，占自己之事，为我、我方，取世爻为用神。' },
  { id: 'taren', label: '他人之事（陌生人、射覆）', yongshen: '应', fuShenAux: [],
    basis: '卷四·第五课：所分析之事不在六亲之类，则取应为用。百题库68/69：不知其人其物，取应爻。' },
];

export interface Finding {
  kind: 'ji' | 'xiong' | 'zhong';   // 吉象/凶象/中性
  title: string;
  detail: string;
  basis: string;    // 课程依据
}

export interface Interpretation {
  category: QuestionCategory;
  yongshenLine: LineInfo | null;      // 主用神爻
  yongshenIsFu: boolean;              // 是否伏神为用
  fuNote: string;
  candidatesNote: string;             // 双现取舍说明
  yuanshenLines: LineInfo[];
  jishenLines: LineInfo[];
  choushenLines: LineInfo[];
  findings: Finding[];
  verdict: '大吉' | '吉' | '小吉' | '平' | '小凶' | '凶' | '大凶';
  verdictScore: number;
  summary: string;
  yingqi: string[];                   // 应期推断
  shiyingNote: string;                // 世应关系
}

function lineDesc(l: LineInfo): string {
  return `${l.posName}爻${l.stem}${l.branch}${l.element}${l.liuqin}${l.shiYing ? `（${l.shiYing}）` : ''}`;
}

/** 用神双现取舍（卷四·第五课）：动爻 > 持世 > 持应 > 离世爻近（同距取旺相） */
function pickYongshen(p: PaiPan, qin: LiuQin): { line: LineInfo; note: string } | null {
  const cands = p.lines.filter((l) => l.liuqin === qin);
  if (cands.length === 0) return null;
  if (cands.length === 1) return { line: cands[0], note: `卦中${qin}爻独现，即取${lineDesc(cands[0])}为用神。` };
  const moving = cands.filter((l) => l.moving || l.anDong);
  let chosen: LineInfo; let rule: string;
  if (moving.length > 0) {
    chosen = moving.reduce((a, b) => (b.score > a.score ? b : a));
    rule = `双现取动：${moving.length > 1 ? '均为动爻，取旺相者' : '动爻优先级最强'}`;
  } else {
    const shi = cands.find((l) => l.shiYing === '世');
    const ying = cands.find((l) => l.shiYing === '应');
    if (shi) { chosen = shi; rule = '双现无动，舍其闲爻用其持世'; }
    else if (ying) { chosen = ying; rule = '双现无动无持世，取持应者'; }
    else {
      chosen = cands.reduce((a, b) => {
        const da = Math.abs(a.pos - p.shiPos), db = Math.abs(b.pos - p.shiPos);
        if (da !== db) return db < da ? b : a;
        return b.score > a.score ? b : a;
      });
      rule = '无动无持世应，取离世爻近者（同距取旺相）';
    }
  }
  return {
    line: chosen,
    note: `卦中${qin}爻双现（${cands.map((c) => `${c.posName}爻${c.branch}`).join('、')}），依据"动爻>持世>持应>离世近"优先级：${rule}，故取${lineDesc(chosen)}。`,
  };
}

export function interpret(p: PaiPan, categoryId: string): Interpretation {
  const category = QUESTION_CATEGORIES.find((c) => c.id === categoryId) ?? QUESTION_CATEGORIES[0];
  const findings: Finding[] = [];
  const yingqi: string[] = [];

  // —— 第一步：取用神 ——
  let yongshenLine: LineInfo | null = null;
  let yongshenIsFu = false;
  let fuNote = '';
  let candidatesNote = '';
  let ysQin: LiuQin | null = null;

  if (category.yongshen === '世') {
    yongshenLine = p.lines[p.shiPos - 1];
    candidatesNote = `自占之事，取世爻为用神，即${lineDesc(yongshenLine)}。`;
  } else if (category.yongshen === '应') {
    yongshenLine = p.lines[p.yingPos - 1];
    candidatesNote = `所测不在六亲之类，取应爻为用神，即${lineDesc(yongshenLine)}。`;
  } else {
    ysQin = category.yongshen;
    const picked = pickYongshen(p, ysQin);
    if (picked) {
      yongshenLine = picked.line;
      candidatesNote = picked.note;
    } else {
      // 用神不上卦 → 取伏神（卷四·第四课）
      const fuLine = p.lines.find((l) => l.fuShen?.liuqin === ysQin);
      if (fuLine?.fuShen) {
        yongshenLine = fuLine;
        yongshenIsFu = true;
        fuNote = `卦中${ysQin}爻不上卦（六亲不全），从${p.palace}宫首卦（纯卦）借用神，${ysQin}${fuLine.fuShen.branch}${fuLine.fuShen.element}伏于${lineDesc(fuLine)}（飞神）之下，为伏神。`;
      } else {
        fuNote = `卦中${ysQin}爻不上卦，且未能寻得伏神，此卦信息不全，建议另起一卦。`;
      }
    }
  }

  // —— 第二步：定原神忌神仇神（卷四·第二课）——
  let yuanshenLines: LineInfo[] = [], jishenLines: LineInfo[] = [], choushenLines: LineInfo[] = [];
  const ysElem = yongshenIsFu && yongshenLine?.fuShen ? yongshenLine.fuShen.element : yongshenLine?.element;
  if (ysElem) {
    yuanshenLines = p.lines.filter((l) => l !== yongshenLine && elemRelation(l.element, ysElem) === 'shengBy');
    jishenLines = p.lines.filter((l) => l !== yongshenLine && elemRelation(l.element, ysElem) === 'keBy');
    choushenLines = p.lines.filter((l) => l !== yongshenLine && elemRelation(l.element, ysElem) === 'ke');
    // 注：原神=生用神者；忌神=克用神者；仇神=用神所克（生忌神者）
    choushenLines = choushenLines.filter((l) => !yuanshenLines.includes(l) && !jishenLines.includes(l));
  }

  // —— 第三步：旺衰与吉凶分析 ——
  let v = 0; // 断卦量化分

  if (yongshenLine && !yongshenIsFu) {
    const l = yongshenLine;
    const label = wangShuaiLabel(l.score);
    if (l.score >= 1.5) {
      findings.push({ kind: 'ji', title: `用神${label}`, detail: `用神${lineDesc(l)}，月建${p.ganzhi.monthBranch}下为「${l.monthState}」，日辰${p.ganzhi.dayBranch}下处「${l.dayState}」，综合评分${l.score}，用神有力，所测之事根基稳固。`, basis: '卷三·第十一课：凡用神临日辰或得日辰生旺为用神有力。习题卷60：用神逢长生、临官、帝旺则吉利。' });
      v += 2;
    } else if (l.score >= 0) {
      findings.push({ kind: 'zhong', title: `用神${label}`, detail: `用神${lineDesc(l)}，月建下「${l.monthState}」，日辰下「${l.dayState}」，评分${l.score}，用神有气但不算旺，事情可成但需付出努力或等待时机。`, basis: '卷一·第三十八课：当令者旺，令生者相，生令者休，克令者囚，令克者死。' });
      v += 0.5;
    } else {
      findings.push({ kind: 'xiong', title: `用神${label}`, detail: `用神${lineDesc(l)}休囚无力，月建下「${l.monthState}」，日辰下「${l.dayState}」，评分${l.score}，所测之事先天不足，推进艰难。`, basis: '卷三·第十一课：用神处休囚死地无力而受克，则事不如意。' });
      v -= 2;
    }
    // 旬空
    if (l.kong) {
      if (l.moving || l.score >= 1) {
        findings.push({ kind: 'zhong', title: '用神旬空（假空）', detail: `用神${l.branch}临旬空（${p.kong[0]}${p.kong[1]}空），但${l.moving ? '发动' : '旺相'}不为真空，出空填实之时应事。`, basis: '卷三·第十一课：旺不为空，动不为空；出空填实之时、日、月、年为应事之期，其用神出空，通常为吉。' });
        v += 0;
        yingqi.push(`出空填实之期：${l.branch}日/${l.branch}月（旬空出空则有用）`);
      } else {
        findings.push({ kind: 'xiong', title: '用神真空', detail: `用神${l.branch}临旬空且休囚无助，此为真空，所测之事多成泡影。`, basis: '卷三·第十一课：空爻不得日辰、月建生旺，休囚无助此为真空；空爻真空为用神通常应凶事。' });
        v -= 2;
      }
    }
    // 月破日破
    if (l.yuePo) {
      findings.push({ kind: 'xiong', title: '用神月破', detail: `用神${l.branch}被月建${p.ganzhi.monthBranch}冲破，当月不得生扶，事情眼下破败；但出月不破，逢合填实之日有救。`, basis: '卷三·第十一课：用神临月破，当月既不得生又怕伤，逢日辰帮扶也只是有救；眼下虽破，出月不破。' });
      v -= 1.5;
      yingqi.push(`出月或${l.branch}逢值填实之月/日（月破出月不破）`);
    }
    if (l.riPo) {
      findings.push({ kind: 'xiong', title: '用神日破', detail: `用神${l.branch}休囚逢日辰${p.ganzhi.dayBranch}冲，为日破，生克之力大减，事情难以为继。`, basis: '习题卷51：日破之爻生克力量变弱，对其他爻的生克作用往往难以有效发挥。' });
      v -= 1.5;
    }
    // 暗动
    if (l.anDong) {
      findings.push({ kind: 'ji', title: '用神暗动', detail: `用神${l.branch}旺相静爻逢日辰${p.ganzhi.dayBranch}冲，为暗动，虽表面安静实则暗中发力，事情有暗中转机。`, basis: '卷三·第十一课：旺相之静爻与日辰对冲，冲则动，分析时与动爻通论。' });
      v += 1;
    }
    // 动爻状态
    if (l.moving) {
      findings.push({ kind: 'ji', title: '用神发动', detail: `用神${lineDesc(l)}发动，用神动于卦中，事情正在发生变化推进，即使休囚亦不凶。`, basis: '卷四·六亲用神诀：用神发动在宫中，即使休囚亦不凶，更得生扶兼旺相，管教做亨永亨通。' });
      v += 1;
      if (l.jinTui === '化进神') {
        findings.push({ kind: 'ji', title: '用神化进神', detail: `用神${l.branch}化${l.bianBranch}，为化进神，事物呈进一步发展的趋势，吉神遇之主好的进展和结果。`, basis: '卷四·第三课：进神代表事物进一步的发展趋势，吉神遇之，事物有好的进展和结果。' });
        v += 1;
      }
      if (l.jinTui === '化退神') {
        findings.push({ kind: 'xiong', title: '用神化退神', detail: `用神${l.branch}化${l.bianBranch}，为化退神，事物呈倒退下降的趋势，所求之事渐渐退缩难成。`, basis: '卷四·第三课：退神代表倒退、下降的趋势，吉神化退则吉神不吉。' });
        v -= 1;
      }
      if (l.huitou === '化回头生') {
        findings.push({ kind: 'ji', title: '用神化回头生', detail: `用神动化${l.bianBranch}${l.bianElement}回头生扶，动而得益，愈动愈旺，事情向利好方向发展。`, basis: '卷三·第九课变卦六亲配置；六爻通例：动而化回头生者为吉。' });
        v += 1.5;
      }
      if (l.huitou === '化回头克') {
        findings.push({ kind: 'xiong', title: '用神化回头克', detail: `用神动化${l.bianBranch}${l.bianElement}回头克伐，动而受伤，事情发展过程中自招损伤。`, basis: '卷四·六亲元神诀：敁嫌化克及逢伤。' });
        v -= 1.5;
      }
      if (l.huaKong) {
        findings.push({ kind: 'xiong', title: '用神动而化空', detail: `用神动化${l.bianBranch}旬空，动而化空，事情终将落空，须待出空方可言实。`, basis: '习题卷38：空化空爻呈真空。卷三：动而化空，伏而旺相皆不为空（需旺相方解）。' });
        v -= 1;
      }
      if (l.huaMu) {
        findings.push({ kind: 'zhong', title: '用神动而化墓', detail: `用神动化${l.bianBranch}墓库，为化入墓，事情暂时收藏停滞，待冲开墓库之日月方能进展。`, basis: '卷三·第十一课：爻动化墓，若此墓库爻不逢日、月之合，为爻化入墓，待冲时出墓。' });
        v -= 0.5;
        yingqi.push(`冲墓出墓之期：${l.bianBranch ? '逢' + l.bianBranch + '之冲（' + l.branch + '日/月或冲' + l.bianBranch + '之辰戌丑未日）' : ''}`);
      }
    }
    // 持世/持应
    if (l.shiYing === '世') {
      findings.push({ kind: 'ji', title: '用神持世', detail: `用神即世爻，所测之事与自身紧密相连，事在身掌之中，吉凶直接应于己身。`, basis: '卷四·六亲持世诀及第五课：舍其闲爻，用其持世。' });
      v += 0.5;
    }
  }

  // 伏神分析（卷四·第四课）
  if (yongshenIsFu && yongshenLine?.fuShen && ysElem) {
    const fei = yongshenLine;
    const feiRel = elemRelation(fei.element, ysElem);
    const fuUseful: string[] = [];
    const fuUseless: string[] = [];
    if (elemRelation(BRANCH_ELEMENT[p.ganzhi.dayBranch], ysElem) === 'shengBy' || BRANCH_ELEMENT[p.ganzhi.dayBranch] === ysElem) fuUseful.push('伏神得日生/临日');
    if (elemRelation(BRANCH_ELEMENT[p.ganzhi.monthBranch], ysElem) === 'shengBy' || BRANCH_ELEMENT[p.ganzhi.monthBranch] === ysElem) fuUseful.push('伏神得月生/临月');
    if (feiRel === 'shengBy') fuUseful.push('伏神得飞神生（飞来生伏得长生）');
    if (feiRel === 'keBy') fuUseless.push('伏神被飞神克害（飞来克伏反伤身）');
    if (fei.kong || fei.yuePo || fei.score < 0) fuUseful.push('飞神空破休囚，无力压伏，伏神易出');
    if (p.kong.includes(yongshenLine.fuShen.branch)) fuUseless.push('伏神旬空');
    if (feiRel === 'ke') fuUseful.push('伏神克飞神（伏克飞神为出暴）');
    if (fuUseful.length > fuUseless.length) {
      findings.push({ kind: 'ji', title: '伏神有用', detail: `${fuNote} ${fuUseful.join('；')}，伏神有用则与用神同力，所测之事虽隐而可成。`, basis: '卷四·第四课伏神有用论：伏神得日月生者有用；得飞神生者有用；飞神空破休囚，无力克害伏神，伏神自然得出有用。飞伏生克吉凶诀：飞来生伏得长生。' });
      v += 0.5;
    } else {
      findings.push({ kind: 'xiong', title: '伏神无用', detail: `${fuNote} ${fuUseless.join('；') || '伏神不得日月飞神生扶'}，用神无用则事事无望。`, basis: '卷四·第四课：伏神有用则与用神同力，若用神无用则事事无望。伏神无用论：伏神被旺相之飞神克害、休囚旬空。' });
      v -= 1.5;
    }
  }

  // —— 原神忌神动态（卷四·第二课、六亲元神诀/忌神诀）——
  const movingYuan = yuanshenLines.filter((l) => l.moving || l.anDong);
  const movingJi = jishenLines.filter((l) => l.moving || l.anDong);
  const strongYuan = yuanshenLines.filter((l) => l.score >= 1);
  const strongJi = jishenLines.filter((l) => l.score >= 1);

  if (movingYuan.length > 0) {
    findings.push({ kind: 'ji', title: '原神发动生用', detail: `原神${movingYuan.map(lineDesc).join('、')}发动生扶用神，用神得源源之助，吉上添吉。`, basis: '卷四·第二课：原神旺，主助用神就有力。六亲元神诀：元神发动志扬扬，用神伏藏也不妨。' });
    v += 1.5;
  } else if (strongYuan.length > 0) {
    findings.push({ kind: 'ji', title: '原神旺相', detail: `原神${strongYuan.map(lineDesc).join('、')}旺相安静，用神有根有源，虽缓而稳。`, basis: '卷四·第二课：原神是生助用神的爻，原神旺，主助用神就有力。' });
    v += 0.75;
  } else if (yuanshenLines.length === 0 && ysElem) {
    findings.push({ kind: 'xiong', title: '原神不上卦', detail: `卦中无生扶用神之爻，用神如无源之水、无根之木，遇凶神克害则无救。`, basis: '卷四·第二课：原神衰弱、或没有、或受克伤，无法生助用神，用神犹如无源之水，无根之木。' });
    v -= 0.75;
  }

  if (movingJi.length > 0) {
    const jiKong = movingJi.filter((l) => l.kong || l.yuePo || l.riPo);
    if (jiKong.length === movingJi.length) {
      findings.push({ kind: 'ji', title: '忌神动而空破', detail: `忌神${movingJi.map(lineDesc).join('、')}虽发动但逢空破，欲克用神而力不从心，凶而不凶。`, basis: '卷四·六亲忌神诀：忌神宜静不宜兴，忌神急要逢冲克。' });
      v += 0.5;
    } else {
      findings.push({ kind: 'xiong', title: '忌神发动克用', detail: `忌神${movingJi.map(lineDesc).join('、')}发动直克用神，所测之事阻力当面而至，须防${movingJi[0].liuqin}类人事之妨害。`, basis: '卷四·第二课：忌神是克用神的爻，原神和忌神哪一个更旺更有力，就将对用神的吉凶起决定性作用。六亲忌神诀：看卦先须看忌神，忌神宜静不宜兴。' });
      v -= 1.5;
    }
  } else if (strongJi.length > 0) {
    findings.push({ kind: 'zhong', title: '忌神旺而安静', detail: `忌神${strongJi.map(lineDesc).join('、')}旺相但未发动，隐患潜伏，目前无碍，忌神逢冲逢动之时须防。`, basis: '卷四·六亲忌神诀：忌神宜静不宜兴。' });
    v -= 0.5;
  } else if (jishenLines.length > 0) {
    findings.push({ kind: 'ji', title: '忌神衰弱安静', detail: `忌神${jishenLines.map(lineDesc).join('、')}休囚安静，无力克害用神，不利因素不足为患。`, basis: '卷四·第二课：原神和忌神哪一个更旺更有力，就将对用神的吉凶起决定性作用。' });
    v += 0.5;
  }

  // 仇神
  const movingChou = choushenLines.filter((l) => l.moving || l.anDong);
  if (movingChou.length > 0) {
    findings.push({ kind: 'xiong', title: '仇神发动', detail: `仇神${movingChou.map(lineDesc).join('、')}发动，伤原神而助忌神，助纣为虐，间接损用。`, basis: '卷四·第二课：卦中若仇神发动，原神被伤；仇神发动生忌神，助纣为虐，倍力其祸。' });
    v -= 0.75;
  }

  // —— 世应关系（习题卷70）——
  const shi = p.lines[p.shiPos - 1];
  const ying = p.lines[p.yingPos - 1];
  let shiyingNote = '';
  {
    const rel = elemRelation(shi.element, ying.element);
    const he = isHe(shi.branch, ying.branch);
    const chong = isChong(shi.branch, ying.branch);
    if (he) shiyingNote = `世${shi.branch}应${ying.branch}相合，宾主相投，双方关系和谐，事情易成。`;
    else if (chong) shiyingNote = `世${shi.branch}应${ying.branch}相冲，宾主相背，双方有矛盾冲突，事情多反复。`;
    else if (rel === 'sheng') shiyingNote = `世爻${shi.element}生应爻${ying.element}，我方生助对方，我主动付出。`;
    else if (rel === 'shengBy') shiyingNote = `应爻${ying.element}生世爻${shi.element}，对方来生我，多得外力相助。`;
    else if (rel === 'ke') shiyingNote = `世爻${shi.element}克应爻${ying.element}，我能制对方，事在掌握。`;
    else if (rel === 'keBy') shiyingNote = `应爻${ying.element}克世爻${shi.element}，对方压制于我，须防受制于人。`;
    else shiyingNote = `世应比和（皆${shi.element}），双方势均力敌，和平共处。`;
    if (shi.score < 0) shiyingNote += ` 世爻${wangShuaiLabel(shi.score)}，自身状态欠佳。`;
  }

  // —— 卦象层面 ——
  if (p.liuChong) {
    findings.push({ kind: 'zhong', title: '六冲卦', detail: `${p.benGua.info.name}为六冲卦，主散、主快、主分离：测吉事逢冲则散，测凶事逢冲则解；近病逢冲即愈，久病逢冲则危。`, basis: '卷一·第二十八课：凡冲则气散；好事、吉庆之事喜合，坏事、忧烦、凶咎之事宜冲。' });
  }
  if (p.liuHe) {
    findings.push({ kind: 'zhong', title: '六合卦', detail: `${p.benGua.info.name}为六合卦，主合、主缓、主团聚：测吉事得合则成，测凶事得合则缠。`, basis: '卷一·第二十七课地支六合；六爻通例：六合主事之缠绵聚合。' });
  }
  if (p.fanYin) {
    findings.push({ kind: 'xiong', title: p.fanYin, detail: `卦遇${p.fanYin}（卦变相冲相克），主反复不安，事情多变动波折。`, basis: '卷三·第十一课：反吟者，卦之反吟即是卦变相冲、相克。' });
    v -= 0.75;
  }
  if (p.fuYin) {
    findings.push({ kind: 'xiong', title: p.fuYin, detail: `卦遇${p.fuYin}（卦变而地支五行不变），皆主忧虑呻吟之象，凡遇之不称心如意。`, basis: '卷三·第十一课：伏吟，皆主忧虑、呻吟之象，凡遇之都不称心如意。' });
    v -= 0.75;
  }
  if (p.duFa) {
    findings.push({ kind: 'zhong', title: '独发', detail: `卦中仅${p.lines.find((l) => l.moving)?.posName}爻一爻独发，事情的关键变化全系于此爻，此爻之动向即事情之动向。`, basis: '卷三·第四课：独发，卦中只有一个爻发动，其它五个爻均安静。' });
  }
  if (p.movingCount >= 4) {
    findings.push({ kind: 'zhong', title: '六爻乱动', detail: `卦中${p.movingCount}爻发动，为乱动之象，事情头绪繁多变化剧烈，须紧抓用神主线方不为所惑。`, basis: '卷四·六爻乱动诀：六爻乱动事难明，须向亲宫看用神，用若休囚遭克害，须知此事费精神。' });
  }
  // 间爻发动
  const jianMoving = p.lines.filter((l) => l.jianYao && (l.moving || l.anDong));
  if (jianMoving.length > 0) {
    findings.push({ kind: 'zhong', title: '间爻发动', detail: `间爻${jianMoving.map(lineDesc).join('、')}发动，世应之间有阻隔或中间人运作，所求多经周折。`, basis: '卷三·第十一课：世应中间两间爻发动，所求多阻隔；间爻为喜时宜旺，多为媒人、中间人。' });
  }

  // —— 应期补充 ——
  if (yongshenLine && !yongshenIsFu) {
    const l = yongshenLine;
    if (!l.kong && !l.yuePo) {
      if (l.moving) yingqi.push(`用神发动：逢值（${l.branch}日/月）或逢合（${l.branch}之合支）之期应事`);
      else if (!l.anDong && l.score >= 1) yingqi.push(`用神静而旺相：逢冲起（${l.branch}对冲之日/月）或逢值之期应事`);
    }
    if (l.riHe) yingqi.push(`用神被日辰合绊：逢冲开（冲${l.branch}或冲${p.ganzhi.dayBranch}之日）应事`);
  }
  if (yongshenIsFu && yongshenLine?.fuShen) {
    yingqi.push(`伏神出现之期：${yongshenLine.fuShen.branch}逢值之日月，或冲开飞神${yongshenLine.branch}之日`);
  }

  // —— 综合断语 ——
  const verdictScore = v;
  let verdict: Interpretation['verdict'];
  if (v >= 5) verdict = '大吉';
  else if (v >= 3) verdict = '吉';
  else if (v >= 1.5) verdict = '小吉';
  else if (v > -1.5) verdict = '平';
  else if (v > -3) verdict = '小凶';
  else if (v > -5) verdict = '凶';
  else verdict = '大凶';

  const ysName = category.yongshen === '世' ? '世爻' : category.yongshen === '应' ? '应爻' : `${category.yongshen}爻`;
  const summary = [
    `测「${category.label}」，取${ysName}为用神。`,
    yongshenLine && !yongshenIsFu ? `用神${lineDesc(yongshenLine)}，旺衰${wangShuaiLabel(yongshenLine.score)}（${yongshenLine.score}分）。` : '',
    yongshenIsFu ? '用神不上卦，以伏神为用。' : '',
    `原神${yuanshenLines.length}爻${movingYuan.length ? `（${movingYuan.length}爻发动）` : ''}，忌神${jishenLines.length}爻${movingJi.length ? `（${movingJi.length}爻发动）` : ''}。`,
    `综合评分 ${verdictScore}，断为「${verdict}」。`,
  ].filter(Boolean).join('');

  return {
    category, yongshenLine, yongshenIsFu, fuNote, candidatesNote,
    yuanshenLines, jishenLines, choushenLines,
    findings, verdict, verdictScore, summary, yingqi, shiyingNote,
  };
}

export { jiaziOf, MUKU };
