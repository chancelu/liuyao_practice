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
        <div key={gi} className="border border-[#d8cdb4] rounded-lg bg-[#faf6ea]">
          <button onClick={() => toggleGroup(gi)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div>
              <span className="font-bold text-[#3d3428]" style={{ fontFamily: '"Songti SC",serif' }}>{g.title}</span>
              <span className="ml-2 text-xs text-[#8a7f6a]">{g.source} · {g.items.length} 则</span>
            </div>
            {openGroups.includes(gi) ? <ChevronDown size={16} className="text-[#8a7f6a]" /> : <ChevronRight size={16} className="text-[#8a7f6a]" />}
          </button>
          {openGroups.includes(gi) && (
            <div className="px-4 pb-3 space-y-1.5">
              {g.items.map((it) => {
                const key = `${gi}-${it.name}`;
                const open = openItems.includes(key);
                return (
                  <div key={key} className={`border rounded ${open ? 'border-[#c9b98f] bg-white' : 'border-[#e8dfc8] bg-[#fdfaf3]'}`}>
                    <button onClick={() => toggleItem(key)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                      <span className="text-xs font-semibold text-[#6b5330] flex items-center gap-1.5">
                        <ScrollText size={11} className="text-[#9a6a3a]" /> {it.name}
                      </span>
                      {open ? <ChevronDown size={13} className="text-[#8a7f6a]" /> : <ChevronRight size={13} className="text-[#8a7f6a]" />}
                    </button>
                    {open && (
                      <div className="px-3 pb-2.5">
                        <p className="text-xs text-[#4a4234] leading-relaxed" style={{ fontFamily: '"Songti SC",serif' }}>{it.text}</p>
                        {it.note && <p className="text-[10px] text-[#9a8a68] mt-1">{it.note}</p>}
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
