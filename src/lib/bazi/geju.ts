// 格局专册 —— 正格取舍细则 + 外格（变格）检测 + 每格白话解读与实战要点
// 正格体系据《子平真诠》（月令取格、相神成败救应）；外格据《滴天髓》从象化象专旺诸章、
// 《三命通会》杂格卷、《渊海子平》论格局法。检测为教学级启发式，真格与否须人工细核。
import type { PillarInfo } from './engine';
import { shiShen, TIAN_GAN_HE } from './engine';
import { BRANCH_ELEMENT } from '../liuyao/constants';
import type { Element5 } from '../liuyao/constants';

// ============ 正格（八正格 + 建禄阳刃）逐格解读 ============
// explain：把口诀翻成能照着用的白话；practice：实战派（算命师日常）怎么用这格
export interface GejuDetail {
  explain: string;   // 成格喜忌的白话解读
  chengjiu: string;  // 成格路线 → 破格路线（子平真诠成败救应的速查版）
  practice: string;  // 实战派要点（职业象、行运用法、派别分歧）
}

export const GEJU_DETAIL: Record<string, GejuDetail> = {
  正官格: {
    explain: '正官是「正当的约束」——官职、名誉、丈夫（女命）。它像个需要供养的上司：要财星当俸禄（财生官）、要印星当后台（印护官）。最怕伤官（下属顶撞上司）和七杀来混（正邪并立，须去一留一）。',
    chengjiu: '成：财生官、印护官、官印相生；败：伤官见官、官杀混杂、官星被合去、月令逢冲',
    practice: '实战上正官格重「清」字——官只一位透干、无杀无伤者上格，多应在体制、管理、名分之事。看大运：财运官运主升迁，伤官七杀运防口舌官非。女命正官一位清透为佳，官杀混杂须详辨去留。',
  },
  七杀格: {
    explain: '七杀是「带敌意的压力」——小人、灾祸、也是权柄。它像猛虎：必须有缰绳。食神制杀是驯兽（最有力），印绶化杀是感化（杀印相生主贵），羊刃驾杀是以暴制暴。无制无化则虎伤人。',
    chengjiu: '成：食神制杀、杀印相生、身杀两停；败：财党杀（财星生杀攻身）、制杀太过（杀被制死反无威）、身弱杀重无制',
    practice: '实战先问「身杀谁强」：身强杀浅，假杀为权；身弱杀重，终身受累。杀格成者多在竞争性行业、武职、技术权威。行运喜制杀之运，忌财运生杀。注意「制杀太过」——食伤太重把杀制死了，反而埋没才华，宜财运泄食生杀。',
  },
  正财格: {
    explain: '正财是「看得见的进项」——工资、田产、妻子（男命）。要自身有力才挑得动财（身旺任财），要食伤做源头（食伤生财）。最怕比劫来抢（群劫争财）和财多身弱（挑不动的财反压垮人，富屋贫人）。',
    chengjiu: '成：身旺任财、食伤生财、财生官；败：比劫争财、财多身弱、财被合去',
    practice: '实战看财格先称身财比重：身财两停最稳；身旺财弱，财运即发；身弱财旺，印比运才能接手。男命正财为妻，财格清透主妻贤家稳。财星最宜藏支透干一位，天干比劫林立则辛苦聚财被人分。',
  },
  偏财格: {
    explain: '偏财是「众人之财、流动之财」——生意、投资、偏门进账、父亲。众人之财人人可抢，故最忌比劫分夺；喜官星守财（官能制比劫）、身旺能担。',
    chengjiu: '成：身旺有官护财、食伤生偏财；败：比劫林立分夺、羊刃劫财',
    practice: '偏财格实战看「流动性」：多主经商、交际、意外之缘，人也大方豪爽。偏财透出又逢生扶者，一生不缺来钱机会，但守不守得住看官星与自身根气。男命偏财亦可看父亲与婚外缘，须结合宫位细辨。',
  },
  正印格: {
    explain: '正印是「庇护与输入」——学业、文凭、母亲、贵人。印格喜官星相生（官印相生，权印相扶）、喜身旺能受荫。最怕财星坏印——为钱财丢了体面、因享受废了学业，即「贪财坏印」。',
    chengjiu: '成：官印相生、杀印相生、身旺印缓；败：财星坏印、印重身旺无依（母慈灭子）',
    practice: '印格实战看「文气」：多主文教、学术、庇护性平台。印格用官者走仕途文教皆稳。注意反向情况：印太多身太旺反成「慈母多败儿」，此时反喜财星破印，这就是《神峰通考》的病药思路——印重为病，财为药。',
  },
  偏印格: {
    explain: '偏印（枭神）是「偏门的滋养」——冷门学问、直觉灵感、继母、副业。它性情孤僻，喜偏财来制（制枭则福气存）、喜身旺。最怕见食神——枭夺食即「倒食」，饭碗被夺、福气受损。',
    chengjiu: '成：偏财制枭、身旺用枭泄秀；败：枭印夺食、枭重身弱',
    practice: '实战上偏印格多出偏门专业人才：玄学、医药、艺术、技术、侦探类。枭神夺食之年防失业与健康（食为饭碗与口福）。偏印与正印混杂者，学业杂而不专，须取清。',
  },
  食神格: {
    explain: '食神是「温和的输出」——才华、口福、寿元、子女。食神生财是正道（才华变现），身旺食旺是福相。最怕枭印夺食（福星被夺）和食神被刑冲。食神只宜一位，多则化伤（食多变伤，反主傲气泄气）。',
    chengjiu: '成：食神生财、食神制杀（杀为权柄时）；败：枭印夺食、食多见泄、食神逢冲',
    practice: '实战看食格重「清透」：一位食神有力，主一生衣禄温和，宜技艺、餐饮、文化变现。食神制杀格是大格局（以技艺才华驾驭压力权柄），但须食杀两停——食重杀轻或杀重食轻皆要岁运调平。',
  },
  伤官格: {
    explain: '伤官是「带锋芒的输出」——聪明、傲气、艺术、反叛。出路有二：伤官生财（把聪明变成钱）、伤官配印（用学问收敛锋芒）。最大忌讳是伤官见官（顶撞规则惹祸）——唯金水伤官（金日主水伤官）喜见官，因冬金寒水需火调候，此为例外。',
    chengjiu: '成：伤官生财、伤官配印、金水伤官见官（调候故）；败：伤官见官（非金水）、伤重身轻',
    practice: '实战上伤官格人才华外露，宜创意、演艺、表达、自由职业，不宜按部就班。女命伤官旺须详看夫星——伤官克官，传统视为婚姻波折信号，须配财星通关（伤生财、财生官）方解。伤官配印格清贵，多在文教科技成名。',
  },
  建禄格: {
    explain: '月令是日主之禄（临官旺地），自身已强，比劫不能再算「格」——所以建禄不取月令人元立格，必须另找财官食伤当用神。身旺无依（无财官食伤者）则一身力气无处使，主劳碌。',
    chengjiu: '成：别取财官食为用神且透干有根；败：满盘比劫无制化、财官皆无',
    practice: '实战口诀「建禄生提月，财官喜透天」——禄格命硬，自成家业，不靠祖荫。看大运专找财官食伤运发力。禄格遇财官透干者反而格局清爽，多在自我打拼中成事。',
  },
  阳刃格: {
    explain: '阳刃（羊刃）是至刚至暴之物——劫财的极端形态。刃格如烈马：喜官杀制刃成权（将星之命）、喜食伤泄刃生财。忌刑冲合害动刃（动则伤人伤己）、忌财运（刃见财起争夺之祸）。',
    chengjiu: '成：官杀制刃、食伤泄秀；败：刃逢冲刑、财惹刀兵、刃重无制',
    practice: '实战遇刃格先找「制刃之物」：有杀制刃主武职、外科、竞技、果断之贵；无制则性格刚烈多灾。刃格行财运与冲刃之岁最要小心——古语「羊刃逢冲，勃然祸至」，实务上多应冲动决策、外伤、官非。',
  },
};

/** 取格名兜底（如「食神格」直接查；「从财格」等外格另由外格区解读） */
export function gejuDetail(name: string): GejuDetail | null {
  return GEJU_DETAIL[name] ?? null;
}

// ============ 正格取舍细则（《子平真诠》原文逻辑的白话补全） ============
// 这几段解决「多透怎么取、会局怎么办、相神是什么」的跳步问题
export const QU_GE_RULES = [
  {
    title: '多透怎么取（人元并透）',
    text: '月支主气、中气、余气同时透出两个以上时：先取主气所透；主气不透而中气余气并透者，取力量强者（通根多、贴月令者为强）。《子平真诠·论用神》「一宫透干，则用神专一；二三并透，则须较量轻重」——并透不清，格反不纯，实务上须看何者得地、何者有根。',
  },
  {
    title: '月支逢合会（会合变气）',
    text: '月支被三合、三会牵动时，月令之气已变：如寅月逢午戌会火，则寅中丙火权重上升，可取火之人元为格——即「会合解透干之局，亦变月令之气」。《子平真诠》谓之「用神随合会而变」。实务口诀：月令被会化成他行，就从会成之行论格。',
  },
  {
    title: '相神是什么（成败的关键）',
    text: '格是月令定的（君），相神是辅佐成格的那个字（相）。例：正官格见财，财是相神（财生官则格成）；见伤官是坏格，但有印制伤，印也是相神（败中有成）。看格局高低，八成看相神得力与否：相神有根无伤则格高，相神坏则格破。',
  },
  {
    title: '成中有败、败中有成',
    text: '成中有败：正官格透财生（成）却带伤官（败）；败中有成：正官格带伤官（败）却有印制伤（救应）。救应四法：合（合去坏神）、制（克制坏神）、化（化敌为友）、位置（坏神远隔则力轻）。定格局不能只看一个名字，要把「格—相—忌—救」四字查完。',
  },
];

// ============ 外格（变格）检测 ============
export interface WaigeCheck { text: string; ok: boolean }

export interface WaigeMatch {
  name: string;        // 从财格 / 曲直格 / 甲己化土格 …
  family: '从格' | '专旺格' | '化气格' | '两神成象';
  zhen: '真' | '假' | '存疑';  // 真格/假格倾向
  checks: WaigeCheck[];        // 成格条件逐项核对
  brief: string;       // 一句话定性 + 白话解读
  yong: string;        // 用神取向
  practice: string;    // 实战要点
  source: string;
}

const ZHUANWANG: { elem: Element5; stems: string[]; groups: string[][]; name: string; also: string; brief: string }[] = [
  { elem: '木', stems: ['甲', '乙'], groups: [['亥', '卯', '未'], ['寅', '卯', '辰']], name: '曲直格', also: '仁寿格', brief: '木气专旺，主仁寿慈和、直率生长，如参天林木' },
  { elem: '火', stems: ['丙', '丁'], groups: [['寅', '午', '戌'], ['巳', '午', '未']], name: '炎上格', also: '', brief: '火气专旺，主文明礼乐、热情外显，如烈焰腾空' },
  { elem: '土', stems: ['戊', '己'], groups: [['辰', '戌', '丑', '未']], name: '稼穑格', also: '', brief: '土气专旺，主厚重诚信、包容载物，如大地生养' },
  { elem: '金', stems: ['庚', '辛'], groups: [['巳', '酉', '丑'], ['申', '酉', '戌']], name: '从革格', also: '', brief: '金气专旺，主义气果决、变革锐利，如百炼精金' },
  { elem: '水', stems: ['壬', '癸'], groups: [['申', '子', '辰'], ['亥', '子', '丑']], name: '润下格', also: '', brief: '水气专旺，主智慧流通、深远机变，如江河归海' },
];

const LIANGSHEN: [Element5, Element5, string][] = [ // [生方, 受生方, 象名]
  ['木', '火', '木火通明'], ['火', '土', '火土成慈'], ['土', '金', '土金毓秀'], ['金', '水', '金水相涵'], ['水', '木', '水木清华'],
];

export interface WaigeInput {
  dayMaster: string;
  dmElem: Element5;
  pillars: PillarInfo[];
  wuxingCount: Record<Element5, number>;
  totalPower: number;
  strengthTotal: number;
  dediScore: number;   // 得地分（0-30）
  deshiScore: number;  // 得势分（0-20）
  monthBranch: string;
}

/** 外格启发式检测：返回初步符合的外格（可多候选，按符合度排序），全部须人工细核 */
export function detectWaige(inp: WaigeInput): WaigeMatch[] {
  const out: WaigeMatch[] = [];
  const branches = inp.pillars.map((p) => p.branch);
  const share = (e: Element5) => inp.wuxingCount[e] / Math.max(1, inp.totalPower);
  const noRoot = inp.dediScore === 0;
  const weakBody = inp.strengthTotal < 30;

  // —— 专旺格（一行得气，日主即旺行） ——
  for (const z of ZHUANWANG) {
    if (!z.stems.includes(inp.dayMaster)) continue;
    for (const grp of z.groups) {
      const full = grp.every((b) => branches.includes(b));
      const dominant = share(z.elem) >= 0.5;
      if (full || dominant) {
        // 破格信号：官杀（克我者）有力
        const officerElem = ELEMENT_KE[z.elem]; // 克本行者为官杀
        const officerWeak = share(officerElem) < 0.2;
        out.push({
          name: z.name, family: '专旺格',
          zhen: full && officerWeak ? '真' : '存疑',
          checks: [
            { text: `日主为${z.elem}（${z.stems.join('/')}）`, ok: true },
            { text: `地支${full ? `全${grp.join('')}（${grp.length === 3 ? '三合/三会成局' : '四库全'}）` : `${z.elem}气占比 ${(share(z.elem) * 100).toFixed(0)}%（未全${grp.join('')}）`}`, ok: full },
            { text: `官杀（${officerElem}）衰弱不破格`, ok: officerWeak },
          ],
          brief: `${z.name}（${z.also ? `一名${z.also}，` : ''}${z.brief}）。专旺格的要点是「一行得气、顺其旺势」——不可逆制，只宜顺泄。`,
          yong: `喜印（生本行）与食伤（泄秀），顺其势；忌官杀（逆旺神）与财星搅局。岁运同理。`,
          practice: `实战派口诀：专旺格看「纯不纯」——全局无官杀手者真格，贵气大；带一点官杀无根，谓之「旺神冲衰神」，反主大起大伏。${z.name}行运喜生地泄地，忌官杀运激旺神之怒，实务上多应骤变。`,
          source: '《滴天髓》专旺诸格；《三命通会》论一行得气',
        });
        break;
      }
    }
  }

  // —— 从格（日主极弱无根，弃命相从） ——
  if (weakBody && noRoot) {
    // 找最旺一行及其十神
    const sorted = (Object.entries(inp.wuxingCount) as [Element5, number][]).sort((a, b) => b[1] - a[1]);
    const [topElem] = sorted[0];
    const topSS = shiShen(inp.dayMaster, Z_STEM_OF[topElem]); // 用该行之阳干定十神类
    const helpShare = share(inp.dmElem) + share(ELEMENT_SHENG_ME(inp.dmElem)); // 比劫+印
    const familyName: Record<string, string> = {
      正财: '从财格', 偏财: '从财格', 正官: '从杀格', 七杀: '从杀格',
      食神: '从儿格', 伤官: '从儿格', 比肩: '从强格', 劫财: '从强格', 正印: '从强格', 偏印: '从强格',
    };
    const name = familyName[topSS] ?? '从势格';
    const yongMap: Record<string, string> = {
      从财格: '顺财之势：喜财星、食伤（生财），忌比劫印绶（帮身逆局）',
      从杀格: '顺杀之势：喜官杀、财星（生杀），忌印比食伤（帮身抗杀）',
      从儿格: '顺食伤之势：喜食伤、财星（儿又生儿），忌印绶夺食、官杀逆之',
      从强格: '顺印比之势：喜比劫印绶，忌财官逆其旺气',
      从势格: '财食官杀并旺而杂，从其所向——以通关顺势取用',
    };
    const briefMap: Record<string, string> = {
      从财格: '日主无根，满盘财星成势，索性弃命从财——以财为主，反主大富（为人作嫁亦自得利）',
      从杀格: '日主无根，官杀成势围身，索性弃命从杀——以杀为主，反主权柄（寄人篱下而成事）',
      从儿格: '日主无根，食伤成势，索性从儿——以才华子女为主，反主技艺成名',
      从强格: '印比重重、日主极强无制，顺其强势——强之极者不可折，顺用印比反吉',
      从势格: '日主无根而财食官杀并旺，无一行独专，随其最强之势而从',
    };
    out.push({
      name, family: '从格',
      zhen: helpShare < 0.25 ? '真' : '假',
      checks: [
        { text: `日主${inp.dmElem}四支无根（得地 ${inp.dediScore}/30）`, ok: noRoot },
        { text: `旺衰总分 ${inp.strengthTotal}/100，极弱`, ok: weakBody },
        { text: `${topElem}气最旺（${(share(topElem) * 100).toFixed(0)}%），为${topSS}方`, ok: share(topElem) >= 0.35 },
        { text: `印比帮扶之气 ${(helpShare * 100).toFixed(0)}%（<25% 为真从）`, ok: helpShare < 0.25 },
      ],
      brief: `${name}：${briefMap[name]}。`,
      yong: yongMap[name],
      practice: `实战派最重「真从假从」之辨：真从（全局无一印比）以所从之神为用，富贵大；假从（带一点印比虚浮无根）是「病根」，岁运合去、冲去这个病根之年反大发，岁运帮起身来则破局生灾。从格命忌见根——流年大运给日主通根，如「叛国投敌」，多应灾咎。`,
      source: '《滴天髓》从象章：真从之象有几人，假从亦可发其身；《子平真诠》论弃命从财从杀',
    });
  }

  // —— 化气格（日干与月/时干五合，化神当令） ——
  const he = TIAN_GAN_HE[inp.dayMaster];
  if (he) {
    const [partner, huaElem] = he;
    const partnerAt = inp.pillars.find((p) => (p.name === '月柱' || p.name === '时柱') && p.stem === partner);
    if (partnerAt) {
      const mbElem = BRANCH_ELEMENT[inp.monthBranch];
      const huaDangLing = mbElem === huaElem;
      out.push({
        name: `${inp.dayMaster}${partner}化${huaElem}格`, family: '化气格',
        zhen: huaDangLing && noRoot ? '真' : '存疑',
        checks: [
          { text: `日主${inp.dayMaster}与${partnerAt.name}干${partner}五合`, ok: true },
          { text: `化神${huaElem}当令（月支${inp.monthBranch}属${mbElem}）`, ok: huaDangLing },
          { text: `日主无根（不从原五行论）`, ok: noRoot },
        ],
        brief: `化气格：日主${inp.dayMaster}与${partnerAt.name}${partner}相合，化神为${huaElem}。化得真者，日主「改换门庭」，以化神论命，多主非常之贵；化而不真（月令不助、日主有根）则为「合而不化」，仍以正格论。`,
        yong: `以化神${huaElem}为主：喜生扶化神之五行，忌克制化神与「争合」（别干再来合${partner}）`,
        practice: '实战派验化气三看：一看月令是否化神之乡（不当令多假化）；二看日主在地支有无根气（有根则恋本难化）；三看有无争合妒合。化气成真格者少，命理师遇到合多先按「合绊」处理——合而不化则日主被牵绊，以正格兼看。',
        source: '《滴天髓》化象章；《渊海子平》论十干化气',
      });
    }
  }

  // —— 两神成象（全局仅两行且相生） ——
  {
    const present = (Object.entries(inp.wuxingCount) as [Element5, number][]).filter(([, v]) => v > 0);
    if (present.length === 2) {
      const [a] = present[0];
      const [b] = present[1];
      const pair = LIANGSHEN.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
      if (pair) {
        const [sheng, shou, xiang] = pair;
        out.push({
          name: `两神成象·${xiang}`, family: '两神成象',
          zhen: '存疑',
          checks: [
            { text: `全局只有${a}、${b}两种五行`, ok: true },
            { text: `${sheng}生${shou}，两气相生成象（${xiang}）`, ok: true },
            { text: `两行力量接近（${present[0][1]}:${present[1][1]}）`, ok: Math.abs(present[0][1] - present[1][1]) <= 2 },
          ],
          brief: `两神成象：全局${sheng}生${shou}，两行清纯相生，气象专一，为「${xiang}」之贵格。其要在「两行皆停、相生不悖」——力均则气象流转，偏枯则减色。`,
          yong: `顺其相生之势：岁运喜维护两行平衡，忌插入第三种克制之五行（如${xiang}见克${shou}之行破局）`,
          practice: '实战上两神成象看「纯与均」：两行各半相生者上格；一行过重则以重者为体、轻者发用。此格人专才明显，气象清贵，但五行偏枯亦须防六亲缘薄（缺行之十神所主之人事淡薄）。',
          source: '《滴天髓》两神成象章；《三命通会》论气象',
        });
      }
    }
  }

  // 排序：真 > 存疑 > 假，同序按检测顺序
  const rank = { 真: 0, 存疑: 1, 假: 2 };
  return out.sort((x, y) => rank[x.zhen] - rank[y.zhen]);
}

// —— 内部工具 ——
const Z_STEM_OF: Record<Element5, string> = { 木: '甲', 火: '丙', 土: '戊', 金: '庚', 水: '壬' };
const ELEMENT_KE: Record<Element5, Element5> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }; // 克我者
function ELEMENT_SHENG_ME(e: Element5): Element5 { // 生我者
  const m: Record<Element5, Element5> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
  return m[e];
}
