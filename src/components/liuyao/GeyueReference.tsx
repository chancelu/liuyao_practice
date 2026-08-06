// 必背歌诀速查：按主题分组，出自卷一/卷三/卷四歌诀汇总
import { useState } from 'react';
import { GEYUE } from '../../lib/liuyao/teaching';
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';

export function GeyueReference() {
  const [openGroups, setOpenGroups] = useState<number[]>([0]);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const toggleGroup = (i: number) => setOpenGroups((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const toggleItem = (k: string) => setOpenItems((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  return (
    <div className="space-y-3">
      {GEYUE.map((g, gi) => (
        <div key={gi} className="border border-[#2e375c] rounded-lg bg-[#151b31]">
          <button onClick={() => toggleGroup(gi)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div>
              <span className="font-bold text-[#e8e1cd]" style={{ fontFamily: '"Songti SC",serif' }}>{g.title}</span>
              <span className="ml-2 text-xs text-[#8d8670]">{g.source} · {g.items.length} 则</span>
            </div>
            {openGroups.includes(gi) ? <ChevronDown size={16} className="text-[#8d8670]" /> : <ChevronRight size={16} className="text-[#8d8670]" />}
          </button>
          {openGroups.includes(gi) && (
            <div className="px-4 pb-3 space-y-1.5">
              {g.items.map((it) => {
                const key = `${gi}-${it.name}`;
                const open = openItems.includes(key);
                return (
                  <div key={key} className={`border rounded ${open ? 'border-[#b08a44] bg-[#11162b]' : 'border-[#283050] bg-[#1a2140]'}`}>
                    <button onClick={() => toggleItem(key)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                      <span className="text-xs font-semibold text-[#d4c294] flex items-center gap-1.5">
                        <ScrollText size={11} className="text-[#c9a05e]" /> {it.name}
                      </span>
                      {open ? <ChevronDown size={13} className="text-[#8d8670]" /> : <ChevronRight size={13} className="text-[#8d8670]" />}
                    </button>
                    {open && (
                      <div className="px-3 pb-2.5">
                        <p className="text-xs text-[#d8d0b8] leading-relaxed" style={{ fontFamily: '"Songti SC",serif' }}>{it.text}</p>
                        {it.note && <p className="text-[10px] text-[#7d7663] mt-1">{it.note}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
