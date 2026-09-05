// 转盘奇门排盘引擎 —— 经典时家转盘（拆补法定局，教学简化）
// 依据：《烟波钓叟歌》定局歌诀；《遁甲演义》《奇门遁甲统宗》排盘法；张志春《神奇之门》转盘操作步骤
// 流程：排四柱 → 定局（节气三元+阴阳遁）→ 布地盘三奇六仪 → 定值符值使 → 转天盘 → 布八门 → 布八神 → 标注格局
import { STEMS, BRANCHES, STEM_ELEMENT, KE } from '../liuyao/constants';
import { computeGanZhi } from '../liuyao/calendar';
import type { GanZhi } from '../liuyao/calendar';
import { gzIndexOf } from '../bazi/engine';
import {
  PALACE, RING, FLY_ORDER, YIQI_ORDER, STAR_RING, GATE_RING, GODS_YANG,
  GATE_OF, JU_SHU, yuanOfDay, xunshouYi, JIXING, RUMU, isMenPo,
} from './constants';

// ============ 二十四节气（含中气，近似公式 1901-2100，误差±1天） ============
interface QiDef { name: string; month: number; c21: number; c20: number }
const QI24: QiDef[] = [
  { name: '小寒', month: 1, c21: 6.11, c20: 6.9 },
  { name: '大寒', month: 1, c21: 20.84, c20: 21.43 },
  { name: '立春', month: 2, c21: 3.87, c20: 4.6295 },
  { name: '雨水', month: 2, c21: 18.73, c20: 19.4599 },
  { name: '惊蛰', month: 3, c21: 5.63, c20: 6.3826 },
  { name: '春分', month: 3, c21: 20.646, c20: 21.4155 },
  { name: '清明', month: 4, c21: 4.81, c20: 5.59 },
  { name: '谷雨', month: 4, c21: 20.1, c20: 20.888 },
  { name: '立夏', month: 5, c21: 5.52, c20: 6.318 },
  { name: '小满', month: 5, c21: 21.04, c20: 21.86 },
  { name: '芒种', month: 6, c21: 5.678, c20: 6.5 },
  { name: '夏至', month: 6, c21: 21.37, c20: 22.2 },
  { name: '小暑', month: 7, c21: 7.108, c20: 7.928 },
  { name: '大暑', month: 7, c21: 22.83, c20: 23.65 },
  { name: '立秋', month: 8, c21: 7.5, c20: 8.35 },
  { name: '处暑', month: 8, c21: 23.13, c20: 23.95 },
  { name: '白露', month: 9, c21: 7.646, c20: 8.44 },
  { name: '秋分', month: 9, c21: 23.042, c20: 23.822 },
  { name: '寒露', month: 10, c21: 8.318, c20: 9.098 },
  { name: '霜降', month: 10, c21: 23.438, c20: 24.218 },
  { name: '立冬', month: 11, c21: 7.438, c20: 8.218 },
  { name: '小雪', month: 11, c21: 22.36, c20: 23.08 },
  { name: '大雪', month: 12, c21: 7.18, c20: 7.9 },
  { name: '冬至', month: 12, c21: 21.94, c20: 22.6 },
];
function qiDay(year: number, q: QiDef): number {
  const y = year % 100;
  const c = year >= 2000 ? q.c21 : q.c20;
  return Math.floor(y * 0.2422 + c) - Math.floor((y - 1) / 4);
}
/** 当前所属节气（最近一个已过的节气，含中气） */
export function currentJieqi(y: number, m: number, d: number): string {
  let best = '';
  let bestT = -1;
  const cur = y * 10000 + m * 100 + d;
  for (let year = y - 1; year <= y; year++) {
    for (const q of QI24) {
      const t = year * 10000 + q.month * 100 + qiDay(year, q);
      if (t <= cur && t > bestT) { bestT = t; best = q.name; }
    }
  }
  return best;
}

// ============ 盘面结构 ============
export interface QimenPalace {
  num: number;
  diGan: string;        // 地盘干（中五宫也有，寄坤用）
  star: string;         // 天盘九星（中五宫无）
  tianGan: string;      // 天盘干（星携带的原地盘干）
  jiGan: string;        // 天禽寄来的中五宫地盘干（仅天禽所寄宫有）
  gate: string;         // 八门（中五宫无）
  god: string;          // 八神（中五宫无）
  kong: boolean;        // 空亡（日柱旬空支在此宫）
  horse: boolean;       // 马星（时支三合马在此宫）
  flags: string[];      // 击刑/入墓/门迫等标注
}

export interface QimenChart {
  ganzhi: GanZhi;
  jieqi: string;
  dun: '阳' | '阴';
  yuan: '上元' | '中元' | '下元';
  ju: number;           // 局数 1-9
  juNote: string;       // 定局说明
  xun: string;          // 时柱旬首（如 甲午）
  xunYi: string;        // 旬首所遁之仪（如 辛）
  zhifuStar: string;    // 值符星
  zhifuGate: string;    // 值使门
  zhifuSrcPalace: number;   // 值符星原地盘宫（5 记为寄宫 2）
  zhifuDstPalace: number;   // 值符星所到宫
  palaces: QimenPalace[];   // 按宫数 1-9
  starFuyin: boolean; starFanyin: boolean;
  gateFuyin: boolean; gateFanyin: boolean;
  geju: string[];       // 命中的经典格局
  wubu: boolean;        // 五不遇时
  steps: string[];      // 排盘过程记录（教学展示）
}

/** 宫数在转盘环上的序位（中五宫寄坤二宫处理） */
function ringPos(num: number): number {
  return RING.indexOf(num === 5 ? 2 : num);
}

export function paipanQimen(date: Date, juOverride?: number): QimenChart {
  const steps: string[] = [];
  const gz = computeGanZhi(date);
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();

  // —— ① 定局 ——
  const jieqi = currentJieqi(y, m, d);
  const juRow = JU_SHU[jieqi];
  if (!juRow) throw new Error(`未找到节气「${jieqi}」的局数配置`);
  const dun = juRow.dun;
  const yuan = yuanOfDay(gz.dayBranch);
  const juAuto = juRow.ju[yuan === '上元' ? 0 : yuan === '中元' ? 1 : 2];
  const ju = juOverride && juOverride >= 1 && juOverride <= 9 ? juOverride : juAuto;
  const juNote = juOverride && juOverride !== juAuto
    ? `${jieqi}·${yuan}按节气应为${dun}遁${juAuto}局；当前用报数指定为${dun}遁${ju}局（江湖报数起局法）`
    : `${jieqi}节气${yuan}（日支${gz.dayBranch}），歌诀定为${dun}遁${ju}局`;
  steps.push(`定局：${juNote}`);

  // —— ② 布地盘三奇六仪 ——
  const diPan: Record<number, string> = {};
  YIQI_ORDER.forEach((g, i) => {
    // 阳遁顺布（宫数递增），阴遁逆布（宫数递减）
    const offset = dun === '阳' ? i : -i;
    const idx = ((FLY_ORDER.indexOf(ju) + offset) % 9 + 9) % 9;
    diPan[FLY_ORDER[idx]] = g;
  });
  steps.push(`地盘：${dun}遁${ju}局，戊起${PALACE[ju].name}，${dun === '阳' ? '顺' : '逆'}布六仪三奇——${FLY_ORDER.map((p) => `${PALACE[p].gua}${diPan[p]}`).join(' ')}`);

  // —— ③ 定值符值使 ——
  const hourIdx = gzIndexOf(gz.hour[0], gz.hour[1]);
  const { xun, yi } = xunshouYi(hourIdx);
  const srcPalaceRaw = FLY_ORDER.find((p) => diPan[p] === yi)!;
  const srcPalace = srcPalaceRaw === 5 ? 2 : srcPalaceRaw; // 中五宫寄坤二宫
  const srcRingPos = ringPos(srcPalace);
  const zhifuStar = STAR_RING[srcRingPos];
  const zhifuGate = GATE_RING[srcRingPos];
  steps.push(`值符值使：时柱${gz.hour}属${xun}旬，旬首遁于「${yi}」；${yi}在地盘${PALACE[srcPalaceRaw].name}${srcPalaceRaw === 5 ? '（中五寄坤二）' : ''}，该宫本宫星「${zhifuStar}」为值符，本宫门「${zhifuGate}」为值使`);

  // —— ④ 转天盘（值符加时干） ——
  const hourStem = gz.hour[0];
  const targetGan = hourStem === '甲' ? yi : hourStem; // 甲时看旬首仪（时干即值符，伏吟）
  let dstPalaceRaw = FLY_ORDER.find((p) => diPan[p] === targetGan)!;
  if (dstPalaceRaw === 5) dstPalaceRaw = 2; // 时干落中宫，寄坤二宫
  const starOffset = (ringPos(dstPalaceRaw) - srcRingPos + 8) % 8;
  const starFuyin = starOffset === 0;
  const starFanyin = starOffset === 4;
  const starAt: Record<number, string> = {};   // 宫 → 天盘星
  const tianGanAt: Record<number, string> = {}; // 宫 → 天盘干（星携带原地盘干）
  RING.forEach((p, i) => {
    const dest = RING[(i + starOffset) % 8];
    starAt[dest] = STAR_RING[i];
    tianGanAt[dest] = diPan[p];
  });
  // 天禽寄随天芮：中五宫地盘干作为寄干随芮走
  const ruiDest = RING[(RING.indexOf(2) + starOffset) % 8];
  const jiGanAt: Record<number, string> = { [ruiDest]: diPan[5] };
  steps.push(`天盘：值符${zhifuStar}加时干「${targetGan}」于${PALACE[dstPalaceRaw].name}，九星${starOffset === 0 ? '不动（星伏吟）' : `顺转${starOffset}宫`}；天禽寄随天芮，中五宫地盘「${diPan[5]}」为寄干`);

  // —— ⑤ 布八门（值使随时支） ——
  const xunBranchIdx = BRANCHES.indexOf(xun[1] as never);
  const hourBranchIdx = BRANCHES.indexOf(gz.hourBranch as never);
  const stepCount = (hourBranchIdx - xunBranchIdx + 12) % 12;
  // 值使从旬首宫起，阳顺阴逆按宫数飞至时支宫
  const flyIdx = FLY_ORDER.indexOf(srcPalaceRaw);
  const gateDstRaw = FLY_ORDER[((flyIdx + (dun === '阳' ? stepCount : -stepCount)) % 9 + 9) % 9];
  const gateDst = gateDstRaw === 5 ? 2 : gateDstRaw; // 值使入中寄坤
  const gateOffset = (ringPos(gateDst) - srcRingPos + 8) % 8;
  const gateFuyin = gateOffset === 0;
  const gateFanyin = gateOffset === 4;
  const gateAt: Record<number, string> = {};
  RING.forEach((_p, i) => {
    gateAt[RING[(i + gateOffset) % 8]] = GATE_RING[i];
  });
  steps.push(`八门：值使${zhifuGate}自${PALACE[srcPalaceRaw].name}起${xun[1]}，${dun === '阳' ? '顺' : '逆'}飞${stepCount}宫至${gz.hourBranch}时→落${PALACE[gateDstRaw].name}${gateDstRaw === 5 ? '（寄坤二）' : ''}，八门${gateOffset === 0 ? '伏吟归本宫' : `顺转${gateOffset}宫`}`);

  // —— ⑥ 布八神（值符随星，阳顺阴逆） ——
  const godAt: Record<number, string> = {};
  const godStartPos = ringPos(dstPalaceRaw);
  RING.forEach((p, i) => {
    const offset = dun === '阳' ? i - godStartPos : godStartPos - i;
    godAt[p] = GODS_YANG[((offset % 8) + 8) % 8];
  });
  steps.push(`八神：值符神随值符星落${PALACE[dstPalaceRaw].name}，${dun === '阳' ? '顺时针' : '逆时针'}布螣蛇太阴六合勾陈朱雀九地九天`);

  // —— ⑦ 标注：空亡·马星·击刑·入墓·门迫 ——
  const dayIdx = gzIndexOf(gz.day[0], gz.day[1]);
  const xunStart = dayIdx - (dayIdx % 10);
  const kongBranches: string[] = [BRANCHES[(xunStart % 12 + 10) % 12], BRANCHES[(xunStart % 12 + 11) % 12]];
  // 马星按时支三合局：申子辰马在寅(艮8)，寅午戌马在申(坤2)，巳酉丑马在亥(乾6)，亥卯未马在巳(巽4)
  const HORSE_MAP: Record<string, number> = { 申: 8, 子: 8, 辰: 8, 寅: 2, 午: 2, 戌: 2, 巳: 6, 酉: 6, 丑: 6, 亥: 4, 卯: 4, 未: 4 };
  const horsePalace = HORSE_MAP[gz.hourBranch];

  const palaces: QimenPalace[] = [];
  for (let num = 1; num <= 9; num++) {
    const def = PALACE[num];
    const flags: string[] = [];
    const diGan = diPan[num];
    const tianGan = tianGanAt[num] ?? '';
    const gate = gateAt[num] ?? '';
    if (JIXING[diGan]?.includes(num)) flags.push(`${diGan}地盘击刑`);
    if (tianGan && JIXING[tianGan]?.includes(num)) flags.push(`${tianGan}天盘击刑`);
    if (RUMU[diGan] === num) flags.push(`${diGan}地盘入墓`);
    if (tianGan && RUMU[tianGan] === num) flags.push(`${tianGan}天盘入墓`);
    if (gate && isMenPo(GATE_OF[gate].element, def.element, KE)) flags.push(`${gate}门迫`);
    const kong = def.branches.some((b) => kongBranches.includes(b));
    palaces.push({
      num,
      diGan,
      star: starAt[num] ?? '',
      tianGan,
      jiGan: jiGanAt[num] ?? '',
      gate,
      god: godAt[num] ?? '',
      kong,
      horse: num === horsePalace,
      flags,
    });
  }
  steps.push(`标注：日柱${gz.day}旬空「${kongBranches.join('')}」；马星在${PALACE[horsePalace].name}`);

  // —— ⑧ 经典格局检测 ——
  const geju: string[] = [];
  const byPalace = (p: number) => palaces[p - 1];
  palaces.forEach((pl) => {
    if (pl.num === 5) return;
    // 青龙返首：天盘戊加地盘丙；飞鸟跌穴：天盘丙加地盘戊
    if (pl.tianGan === '戊' && pl.diGan === '丙') geju.push(`青龙返首（${PALACE[pl.num].name}：天盘戊+地盘丙，求财谋事大吉）`);
    if (pl.tianGan === '丙' && pl.diGan === '戊') geju.push(`飞鸟跌穴（${PALACE[pl.num].name}：天盘丙+地盘戊，谋为顺遂大吉）`);
    // 三奇得使（简化）：天盘三奇加特定地盘仪
    if (pl.tianGan === '乙' && (pl.diGan === '己' || pl.diGan === '辛')) geju.push(`乙奇得使（${PALACE[pl.num].name}：乙加${pl.diGan}）`);
    if (pl.tianGan === '丙' && (pl.diGan === '戊' || pl.diGan === '庚')) geju.push(`丙奇得使（${PALACE[pl.num].name}：丙加${pl.diGan}）`);
    if (pl.tianGan === '丁' && (pl.diGan === '壬' || pl.diGan === '癸')) geju.push(`丁奇得使（${PALACE[pl.num].name}：丁加${pl.diGan}）`);
    // 遁格
    if (pl.gate === '生门' && pl.tianGan === '丙' && pl.diGan === '丁') geju.push(`天遁（${PALACE[pl.num].name}：生门+丙奇+地盘丁，利谋事兴举）`);
    if (pl.gate === '开门' && pl.tianGan === '乙' && pl.diGan === '己') geju.push(`地遁（${PALACE[pl.num].name}：开门+乙奇+地盘己，利潜藏固守）`);
    if (pl.gate === '休门' && pl.tianGan === '丁' && pl.god === '太阴') geju.push(`人遁（${PALACE[pl.num].name}：休门+丁奇+太阴，利和亲结盟）`);
    if (pl.gate === '休门' && pl.tianGan === '乙' && pl.num === 1) geju.push('龙遁（坎一宫：休门+乙奇临水，利涉川行船）');
    if (pl.gate === '休门' && pl.tianGan === '辛' && pl.num === 8) geju.push('虎遁（艮八宫：休门+辛，利镇煞驱邪）');
    if (pl.gate === '开门' && pl.tianGan === '乙' && pl.num === 4) geju.push('风遁（巽四宫：开门+乙奇临风，利宣扬出行）');
  });
  // 玉女守门：值使门落宫地盘见丁
  const zhishiPalace = byPalace(gateDst);
  if (zhishiPalace.diGan === '丁') geju.push(`玉女守门（值使${zhifuGate}临地盘丁奇于${PALACE[gateDst].name}，利阴私和合、宴乐之事）`);
  if (starFuyin) geju.push('星伏吟（九星归本宫，主静守、迟滞，利守不利进）');
  if (starFanyin) geju.push('星反吟（九星对冲，主变动反复、事多周折）');
  if (gateFuyin) geju.push('门伏吟（八门归本宫，主静、拖延，行人未动）');
  if (gateFanyin) geju.push('门反吟（八门对冲，主速变、反复，事急）');
  // 五不遇时：时干克日干且同性（时干为日干七杀）
  const de = STEM_ELEMENT[gz.dayStem], he = STEM_ELEMENT[hourStem];
  const samePol = STEMS.indexOf(gz.dayStem as never) % 2 === STEMS.indexOf(hourStem as never) % 2;
  const wubu = KE[he] === de && samePol;
  if (wubu) geju.push(`五不遇时（时干${hourStem}克日干${gz.dayStem}，龙不遇时，纵有奇门亦多阻，宜暂缓）`);

  return {
    ganzhi: gz, jieqi, dun, yuan, ju, juNote,
    xun, xunYi: yi, zhifuStar, zhifuGate,
    zhifuSrcPalace: srcPalaceRaw, zhifuDstPalace: dstPalaceRaw,
    palaces, starFuyin, starFanyin, gateFuyin, gateFanyin,
    geju, wubu, steps,
  };
}
