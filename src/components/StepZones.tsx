// 双区知识组件：经典区（典籍引文+白话解读）与实战区（派别经验/典籍外补充）
// 八字与六爻研习工作流共用。经典区取「典籍怎么说的→什么意思」，实战区取「命理师日常怎么用的」。
import { ScrollText, Compass } from 'lucide-react';
import type { StepKnowledge } from '../lib/knowledge';

function ClassicZone({ items }: { items: StepKnowledge['classics'] }) {
  return (
    <div className="mt-2 border border-[#474025] bg-[#201a12] rounded px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#d4b578] mb-1.5">
        <ScrollText size={12} /> 经典区 · 典籍原文与解读
      </div>
      <div className="space-y-2">
        {items.map((c, i) => (
          <div key={i}>
            <div className="text-xs text-[#d4c294] leading-relaxed" style={{ fontFamily: '"Songti SC",serif' }}>
              「{c.quote}」
              <span className="ml-1 text-[10px] text-[#7d7663]" style={{ fontFamily: 'inherit' }}>——{c.source}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#a89f86] leading-relaxed border-l-2 border-[#474025] pl-2">
              {c.explain}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PracticeZone({ items }: { items: StepKnowledge['practice'] }) {
  return (
    <div className="mt-2 border border-[#2b3550] bg-[#151a28] rounded px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ea4d0] mb-1.5">
        <Compass size={12} /> 实战区 · 派别用法与典籍外补充
      </div>
      <div className="space-y-2">
        {items.map((p, i) => (
          <div key={i}>
            <div className="text-xs font-bold text-[#b9c7e2] leading-snug">
              {p.title}
              <span className="ml-1.5 text-[10px] font-normal rounded px-1 bg-[#242b49] text-[#7e90b8]">{p.school}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#93a0bd] leading-relaxed">{p.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 双区知识块：传入某步的知识配置即渲染；无配置则不渲染 */
export function StepZones({ knowledge }: { knowledge?: StepKnowledge }) {
  if (!knowledge) return null;
  return (
    <>
      {knowledge.classics.length > 0 && <ClassicZone items={knowledge.classics} />}
      {knowledge.practice.length > 0 && <PracticeZone items={knowledge.practice} />}
    </>
  );
}
