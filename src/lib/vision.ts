// 截图识别（在线版）：Canvas 预处理（放大/灰度/对比度拉伸）+ AI 视觉理解 → 结构化结果
// 识别结果不上屏直接生效——一律经确认弹窗人工核对后才填入盘面
import { STEMS, BRANCHES } from './liuyao/constants';
import type { YaoValue } from './liuyao/engine';
import { gzValid } from './bazi/engine';
import { getTutorConfig, DEFAULT_ENDPOINT, DEFAULT_MODEL } from '../components/liuyao/TutorChat';

// —— 图像预处理：放大到长边约 2000px + 灰度 + 2% 裁剪对比度拉伸 ——
// 对低清截图的 OCR/视觉理解质量提升明显；输出 JPEG 控制在几百 KB，省 token
export async function preprocessImage(file: File | Blob): Promise<string> {
  const img = await createImageBitmap(file);
  const longSide = Math.max(img.width, img.height);
  const scale = Math.max(1, Math.min(3, 2000 / longSide));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  img.close();

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    lum[i] = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
  }
  const sorted = Float32Array.from(lum).sort();
  const clipLo = sorted[Math.floor(n * 0.02)];
  const clipHi = sorted[Math.min(n - 1, Math.floor(n * 0.98))];
  const range = Math.max(1, clipHi - clipLo);
  for (let i = 0; i < n; i++) {
    let v = ((lum[i] - clipLo) / range) * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    const o = i * 4;
    px[o] = px[o + 1] = px[o + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// —— 调 AI 视觉（走 /api/tutor 代理，流式读回全文）——
async function askVision(prompt: string, dataUrl: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cfg = getTutorConfig();
  const body: Record<string, unknown> = {
    model: cfg?.model ?? DEFAULT_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  };
  if (cfg) {
    headers['x-api-key'] = cfg.apiKey;
    if (cfg.endpoint && cfg.endpoint !== DEFAULT_ENDPOINT) body.endpoint = cfg.endpoint;
  }
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `请求失败（${res.status}）`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    for (const line of parts) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        full += JSON.parse(data).choices?.[0]?.delta?.content ?? '';
      } catch { /* 忽略半行 */ }
    }
  }
  return full;
}

function extractJson(full: string): unknown {
  const m = full.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`未识别到有效结果：${full.slice(0, 100) || '（空回复）'}`);
  return JSON.parse(m[0]);
}

// —— 六爻：截图 → 六爻四值 ——
export interface LiuyaoOcr {
  yaos: YaoValue[];        // 自初爻向上，6 个
  date?: string;           // 截图里识别到的摇卦日期 YYYY-MM-DD
  time?: string;           // HH:MM
  note: string;            // 模型的识别依据与不确定处
}

const YAO_ALIAS: Record<string, YaoValue> = {
  '少阳': 7, '单': 7, '7': 7,
  '少阴': 8, '拆': 8, '8': 8,
  '老阳': 9, '重': 9, 'O': 9, 'o': 9, '9': 9,
  '老阴': 6, '交': 6, 'X': 6, 'x': 6, '6': 6,
};

export async function recognizeLiuyao(dataUrl: string): Promise<LiuyaoOcr> {
  const prompt = [
    '你是六爻排盘识别助手。这张截图是一张六爻卦象（可能来自排盘软件、网页、手写拍照或文字记录）。',
    '请从【初爻到上爻】（自下而上，共 6 爻）逐爻判定四值之一：',
    '7=少阳（静阳爻：一长横，或标注「单」）；8=少阴（静阴爻：两短横，或标注「拆」）；',
    '9=老阳（动阳爻：阳爻旁标 O/○/「重」/「动」）；6=老阴（动阴爻：阴爻旁标 X/×/「交」/「动」）。',
    '若图中有本卦与之卦（变卦）两列：两列同一爻位阴阳不同者即动爻，本卦阳而变阴=9，本卦阴而变阳=6。',
    '若截图里还有摇卦时间或干支纪时（如「丙午月 戊午日」「2026-08-17 16:30」），一并提取公历日期与时间。',
    '拿不准的爻按最可能的填，并在 note 里说明哪几爻不确定。',
    '严格只输出一行 JSON，不要任何其他文字、不要代码块：',
    '{"yaos":[初,二,三,四,五,上],"date":"YYYY-MM-DD 或空串","time":"HH:MM 或空串","note":"识别依据与不确定处，60字内"}',
  ].join('\n');
  const parsed = extractJson(await askVision(prompt, dataUrl)) as { yaos?: unknown[]; date?: string; time?: string; note?: string };
  if (!Array.isArray(parsed.yaos) || parsed.yaos.length !== 6) {
    throw new Error('识别结果不是 6 个爻，请重试或换一张更清晰的截图');
  }
  const yaos = parsed.yaos.map((v, i) => {
    const key = String(v).trim();
    const hit = YAO_ALIAS[key];
    if (hit === undefined) throw new Error(`第 ${i + 1} 爻识别值「${key}」无法判定，请重试`);
    return hit;
  }) as YaoValue[];
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? '') ? parsed.date : undefined;
  const time = /^\d{2}:\d{2}$/.test(parsed.time ?? '') ? parsed.time : undefined;
  return { yaos, date, time, note: parsed.note ?? '' };
}

// —— 八字：截图 → 四柱干支 ——
export interface BaziOcr {
  pillars: [string, string, string, string]; // 年月日时
  gender?: 'male' | 'female';
  note: string;
  invalid: number[]; // 校验不通过的柱下标（0-3），交给人工修正
}

// OCR 形近字纠偏（分柱位）：己已巳、戊戌戍 是最常见错认
const STEM_FIX: Record<string, string> = { 已: '己', 巳: '己', 戌: '戊', 戍: '戊' };
const BRANCH_FIX: Record<string, string> = { 已: '巳', 己: '巳', 戍: '戌', 戊: '戌' };

function snapGz(raw: string): string {
  const chars = (raw ?? '').trim().replace(/\s/g, '').slice(0, 2).split('');
  if (chars.length !== 2) return raw;
  const stem = (STEMS as readonly string[]).includes(chars[0]) ? chars[0] : (STEM_FIX[chars[0]] ?? chars[0]);
  const branch = (BRANCHES as readonly string[]).includes(chars[1]) ? chars[1] : (BRANCH_FIX[chars[1]] ?? chars[1]);
  return stem + branch;
}

export async function recognizeBazi(dataUrl: string): Promise<BaziOcr> {
  const prompt = [
    '你是八字排盘识别助手。这张截图是一份八字命盘（可能来自排盘软件、网页、书籍拍照或手写记录）。',
    '请提取四柱干支：年柱、月柱、日柱、时柱（每柱一个天干+一个地支，共两字，须在六十甲子内）。',
    '常见版式：四列竖排（从右到左为年月日时）或横排表格（年月日时四列）；注意区分「乾造/男命」「坤造/女命」标注以判定性别。',
    '形近字务必辨清：己/已/巳、戊/戌/戍、未/末、壬/王。拿不准的柱在 note 里说明。',
    '严格只输出一行 JSON，不要任何其他文字、不要代码块：',
    '{"year":"年柱","month":"月柱","day":"日柱","hour":"时柱","gender":"male 或 female 或空串","note":"识别依据与不确定处，60字内"}',
  ].join('\n');
  const parsed = extractJson(await askVision(prompt, dataUrl)) as {
    year?: string; month?: string; day?: string; hour?: string; gender?: string; note?: string;
  };
  const raw = [parsed.year, parsed.month, parsed.day, parsed.hour];
  if (raw.some((s) => !s || typeof s !== 'string')) {
    throw new Error('未能识别出完整四柱，请重试或换一张更清晰的截图');
  }
  const pillars = raw.map((s) => snapGz(s!)) as [string, string, string, string];
  const invalid = pillars.map((g, i) => (gzValid(g) ? -1 : i)).filter((i) => i >= 0);
  const gender = parsed.gender === 'male' || parsed.gender === 'female' ? parsed.gender : undefined;
  return { pillars, gender, note: parsed.note ?? '', invalid };
}
