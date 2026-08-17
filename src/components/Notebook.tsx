// 复盘本面板：存入当前盘面 / 历史记录 / 应验回填 / 一键载回
import { useEffect, useState } from 'react';
import { listNotes, saveNote, updateOutcome, deleteNote, NOTEBOOK_EVENT } from '../lib/notebook';
import type { NoteRecord, Outcome } from '../lib/notebook';
import { NotebookPen, RotateCcw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const OUTCOME_CLS: Record<Exclude<Outcome, ''>, string> = {
  应验: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  部分应验: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  未应验: 'bg-red-400/15 text-red-700 border-red-400/30',
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  type: 'liuyao' | 'bazi';
  /** 生成当前盘面的记录草稿；返回 null 表示当前盘面不可保存 */
  makeCurrent: () => Omit<NoteRecord, 'id' | 'createdAt' | 'outcome' | 'outcomeNote'> | null;
  /** 载回一条记录到排盘输入 */
  onLoad: (n: NoteRecord) => void;
}

export function Notebook({ type, makeCurrent, onLoad }: Props) {
  const [notes, setNotes] = useState<NoteRecord[]>(() => listNotes(type));
  const [openId, setOpenId] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setNotes(listNotes(type));
    window.addEventListener(NOTEBOOK_EVENT, refresh);
    return () => window.removeEventListener(NOTEBOOK_EVENT, refresh);
  }, [type]);

  const save = () => {
    const draft = makeCurrent();
    if (!draft) return;
    const rec = saveNote(draft);
    setOpenId(rec.id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const label = type === 'liuyao' ? '卦' : '命盘';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} className="btn-gold px-4 py-2 text-sm tracking-wider">
          <NotebookPen size={15} /> 将当前{label}存入复盘本
        </button>
        {justSaved && <span className="text-xs text-emerald-300">已存入 ✓</span>}
        <span className="text-[10px] text-[#6f6a58]">
          断卦/论命后存档，事后回填应验情况——准确率是复盘出来的，不是感觉出来的（存于本机浏览器，不上传）
        </span>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-[#6f6a58] py-2">暂无记录。排出盘面后点上方按钮存入第一条。</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const open = openId === n.id;
            return (
              <div key={n.id} className="border border-[#3a2f1e] rounded-lg bg-[#131008] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                  <button onClick={() => setOpenId(open ? '' : n.id)} className="text-[#8d8670] hover:text-[#c9a962] shrink-0">
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <span className="text-[10px] text-[#6f6a58] shrink-0">{fmtTime(n.createdAt)}</span>
                  <span className="text-sm text-[#ecdfc0] font-semibold truncate min-w-0">{n.title}</span>
                  {n.outcome && (
                    <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${OUTCOME_CLS[n.outcome]}`}>{n.outcome}</span>
                  )}
                  <span className="flex-1" />
                  <button onClick={() => onLoad(n)}
                    className="text-[11px] flex items-center gap-1 border border-[#c9a962]/40 text-[#c9a962] rounded px-2 py-1 hover:bg-[#c9a962]/10 shrink-0">
                    <RotateCcw size={11} /> 载回
                  </button>
                  <button onClick={() => { if (confirm('删除这条复盘记录？')) deleteNote(n.id); }}
                    className="text-[#6f6a58] hover:text-red-700 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="px-3 pb-2 text-xs text-[#b0a78c] leading-relaxed">{n.summary}</div>
                {open && (
                  <div className="border-t border-[#3a2f1e] px-3 py-2.5 space-y-2 bg-[#0f0d09]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[#8d8670]">应验情况：</span>
                      {(['', '应验', '部分应验', '未应验'] as Outcome[]).map((o) => (
                        <button key={o || 'none'} onClick={() => updateOutcome(n.id, o, n.outcomeNote)}
                          className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
                            n.outcome === o
                              ? o ? OUTCOME_CLS[o as Exclude<Outcome, ''>] : 'border-[#c9a962] text-[#c9a962]'
                              : 'border-[#3a2f1e] text-[#6f6a58] hover:border-[#c9a962]/50'
                          }`}>
                          {o || '未回填'}
                        </button>
                      ))}
                    </div>
                    <textarea
                      defaultValue={n.outcomeNote}
                      onBlur={(e) => updateOutcome(n.id, n.outcome, e.target.value)}
                      placeholder="事后复盘备注：哪里断了准、哪里断了偏、当时漏看了哪个信号…"
                      rows={2}
                      className="w-full border border-[#3a2f1e] rounded bg-[#131008] px-2.5 py-1.5 text-xs text-[#e8e1cd] focus:outline-none focus:border-[#c9a962] resize-y"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
