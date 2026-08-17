// 复盘本：把当前盘面存入 localStorage，事后回填应验结果，便于复盘校验
// 只存输入参数与结论摘要，不存 AI 长文；容量可控（每条约 1KB，数百条无压力）

import type { YaoValue } from './liuyao/engine';
import type { PlaceSel } from '../components/geo/SolarTimeInput';

export type Outcome = '' | '应验' | '部分应验' | '未应验';

export interface LiuyaoPayload {
  yaos: YaoValue[];
  date: string;
  time: string;
  place: PlaceSel | null; // null = 按北京时间（未做真太阳时校正）
  question: string;
  category: string;
}

export interface BaziPayload {
  mode: 'date' | 'manual';
  date: string;
  time: string;
  place: PlaceSel;
  gender: 'male' | 'female';
  focus: string;
  mgz: [string, string, string, string];
  qiyunInput: number;
  birthYearInput: number;
}

export interface NoteRecord {
  id: string;
  createdAt: number; // epoch ms
  type: 'liuyao' | 'bazi';
  title: string;    // 列表标题（如 所问 / 日主）
  summary: string;  // 当时结论摘要（如 卦名+断语 / 格局+旺衰）
  payload: LiuyaoPayload | BaziPayload;
  outcome: Outcome;
  outcomeNote: string;
}

const KEY = 'xuanxue-notebook-v1';
export const NOTEBOOK_EVENT = 'xuanxue-notebook-changed';

function readAll(): NoteRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as NoteRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: NoteRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 容量满等情况静默失败
  }
  window.dispatchEvent(new Event(NOTEBOOK_EVENT));
}

export function listNotes(type?: 'liuyao' | 'bazi'): NoteRecord[] {
  const all = readAll().sort((a, b) => b.createdAt - a.createdAt);
  return type ? all.filter((n) => n.type === type) : all;
}

export function saveNote(input: Omit<NoteRecord, 'id' | 'createdAt' | 'outcome' | 'outcomeNote'>): NoteRecord {
  const rec: NoteRecord = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    outcome: '',
    outcomeNote: '',
  };
  writeAll([rec, ...readAll()]);
  return rec;
}

export function updateOutcome(id: string, outcome: Outcome, outcomeNote: string) {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, outcome, outcomeNote } : n)));
}

export function deleteNote(id: string) {
  writeAll(readAll().filter((n) => n.id !== id));
}
