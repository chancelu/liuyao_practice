// 离线识别兜底：Tesseract.js（WASM 本机 OCR，模型与运行时全部打进站点 public/ocr/）
// 定位：无网 / 未配 Key 时兜底。只能读「文字版式」的截图（干支文字、少阳少阴标注），
// 读不了纯图形爻画；结果一律进确认弹窗人工核对。
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';
import { STEMS, BRANCHES } from './liuyao/constants';
import { gzValid } from './bazi/engine';
import type { YaoValue } from './liuyao/engine';
import type { LiuyaoOcr, BaziOcr } from './vision';

let workerPromise: Promise<Worker> | null = null;

function getWorker(onProgress?: (pct: number, stage: string) => void): Promise<Worker> {
  if (!workerPromise) {
    const base = `${location.origin}/ocr`;
    workerPromise = (async () => {
      const w = await createWorker('chi_sim', OEM.LSTM_ONLY, {
        workerPath: `${base}/worker.min.js`,
        corePath: `${base}/tesseract-core-simd-lstm.wasm.js`,
        langPath: base,
        gzip: false,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100), '识别中');
          else onProgress?.(Math.round((m.progress ?? 0) * 100), m.status);
        },
      });
      await w.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT, // 排盘截图文字分散，稀疏模式更稳
        tessedit_char_whitelist:
          '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥年月日时柱乾坤造男女老少阳阴单拆重交初一二三四五六上动世应' +
          '0123456789:-.点分背字钱年月日号',
      });
      return w;
    })();
  }
  return workerPromise;
}

/** 对预处理后的图片 dataURL 做本机 OCR，返回纯文本 */
export async function ocrImage(dataUrl: string, onProgress?: (pct: number, stage: string) => void): Promise<string> {
  const w = await getWorker(onProgress);
  const { data } = await w.recognize(dataUrl);
  return data.text ?? '';
}

// —— 形近字纠偏（与在线版同一套思路，按柱位吸附）——
const STEM_FIX: Record<string, string> = { 已: '己', 巳: '己', 戌: '戊', 戍: '戊' };
const BRANCH_FIX: Record<string, string> = { 已: '巳', 己: '巳', 戍: '戌', 戊: '戌' };

function snapGz(stem: string, branch: string): string {
  const s = (STEMS as readonly string[]).includes(stem) ? stem : (STEM_FIX[stem] ?? stem);
  const b = (BRANCHES as readonly string[]).includes(branch) ? branch : (BRANCH_FIX[branch] ?? branch);
  return s + b;
}

/** 离线：OCR 文本 → 四柱干支 */
export function parseBaziText(text: string): BaziOcr {
  const t = text.replace(/\s+/g, ' ');
  const gender: 'male' | 'female' | undefined = /乾造|男命/.test(t) ? 'male' : /坤造|女命/.test(t) ? 'female' : undefined;

  // 优先按 年/月/日/时 标签就近取干支
  const byLabel: (string | null)[] = [null, null, null, null];
  const labels = ['年', '月', '日', '时'];
  const labelRe = /([年月日时])[^甲乙丙丁戊己庚辛壬癸]{0,8}?([甲乙丙丁戊己庚辛壬癸已巳戌戍])\s*([子丑寅卯辰巳午未申酉戌亥已己戍戊])/g;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(t))) {
    const idx = labels.indexOf(m[1]);
    if (idx >= 0 && !byLabel[idx]) byLabel[idx] = snapGz(m[2], m[3]);
  }

  // 兜底：全文按序找干支对（去重相邻重复——排盘软件常年月并排重复）
  const seqRe = /([甲乙丙丁戊己庚辛壬癸已巳戌戍])\s*([子丑寅卯辰巳午未申酉戌亥已己戍戊])/g;
  const seq: string[] = [];
  while ((m = seqRe.exec(t))) {
    const gz = snapGz(m[1], m[2]);
    if (seq[seq.length - 1] !== gz) seq.push(gz);
    if (seq.length >= 8) break;
  }

  const pillars: string[] = [];
  for (let i = 0; i < 4; i++) {
    pillars.push(byLabel[i] ?? seq.find((g) => !pillars.includes(g)) ?? '');
  }
  if (pillars.some((p) => !p)) {
    throw new Error('离线 OCR 未能从图中读出完整四柱干支。离线只认文字版式，建议改用「在线 · Kimi 视觉」识别。');
  }
  const p4 = pillars as [string, string, string, string];
  const invalid = p4.map((g, i) => (gzValid(g) ? -1 : i)).filter((i) => i >= 0);
  return { pillars: p4, gender, invalid, note: '离线本机 OCR 识别（文字版式），请逐柱核对' };
}

// —— 六爻：OCR 文本 → 六爻四值 ——
const POS_KW = ['初', '二', '三', '四', '五', '上'];
const STRONG_VAL: Record<string, YaoValue> = { 老阳: 9, 老阴: 6, 少阳: 7, 少阴: 8 };
const WEAK_VAL: Record<string, YaoValue> = { 重: 9, 交: 6, 单: 7, 拆: 8 };

function valIn(seg: string): YaoValue | null {
  const s = seg.match(/老阳|老阴|少阳|少阴/);
  if (s) return STRONG_VAL[s[0]];
  const w = seg.match(/[单拆重交]/);
  if (w) return WEAK_VAL[w[0]];
  return null;
}

/** 离线：OCR 文本 → 六爻 */
export function parseLiuyaoText(text: string): LiuyaoOcr {
  const t = text.replace(/\s+/g, ' ');
  let yaos: (YaoValue | null)[] = [null, null, null, null, null, null];

  // 优先按爻位关键词定位：「初…少阳」「二…老阴」…
  let from = 0;
  for (let i = 0; i < 6; i++) {
    const idx = t.indexOf(POS_KW[i], from);
    if (idx < 0) continue;
    const seg = t.slice(idx, idx + 14);
    yaos[i] = valIn(seg);
    from = idx + 1;
  }

  // 兜底：全文按序取 6 个强弱标注（版式为自上而下时反转）
  if (yaos.some((v) => v === null)) {
    const all: YaoValue[] = [];
    const re = /老阳|老阴|少阳|少阴/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(t)) && all.length < 12) all.push(STRONG_VAL[mm[0]]);
    if (all.length >= 6) {
      const six = all.slice(0, 6);
      // 截图多按上爻→初爻自上而下排列；若按爻位已定位到部分，以爻位为准不动兜底
      yaos = six.reverse();
    }
  }

  if (yaos.some((v) => v === null)) {
    throw new Error('离线 OCR 未能读出完整六爻（只认「老阳/少阴/单/拆/重/交」等文字标注，读不了纯图形爻画）。建议改用「在线 · Kimi 视觉」识别。');
  }

  // 顺带提取日期
  let date: string | undefined;
  const dm = t.match(/(\d{4})[-年/.](\d{1,2})[-月/.](\d{1,2})/);
  if (dm) {
    const pad = (s: string) => s.padStart(2, '0');
    date = `${dm[1]}-${pad(dm[2])}-${pad(dm[3])}`;
  }
  let time: string | undefined;
  const tm = t.match(/(\d{1,2})[:：点时](\d{2})/);
  if (tm) time = `${tm[1].padStart(2, '0')}:${tm[2]}`;

  return { yaos: yaos as YaoValue[], date, time, note: '离线本机 OCR 识别（文字版式），请逐爻核对' };
}
