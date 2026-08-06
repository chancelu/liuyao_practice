// 卦画组件：绘制单个爻（阳爻一整横 / 阴爻两短横），动爻标 O/X
export function YaoStroke({ yang, moving, mark, size = 'md' }: { yang: boolean; moving?: boolean; mark?: string; size?: 'sm' | 'md' | 'lg' }) {
  const w = size === 'lg' ? 72 : size === 'sm' ? 40 : 56;
  const h = size === 'lg' ? 14 : size === 'sm' ? 9 : 11;
  const gap = size === 'lg' ? 12 : size === 'sm' ? 7 : 9;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={w} height={h} className="shrink-0" aria-hidden>
        {yang ? (
          <rect x={0} y={h * 0.15} width={w} height={h * 0.7} rx={2} fill="currentColor" />
        ) : (
          <>
            <rect x={0} y={h * 0.15} width={(w - gap) / 2} height={h * 0.7} rx={2} fill="currentColor" />
            <rect x={(w + gap) / 2} y={h * 0.15} width={(w - gap) / 2} height={h * 0.7} rx={2} fill="currentColor" />
          </>
        )}
      </svg>
      {moving && (
        <span className="text-[#d0604d] font-bold leading-none" style={{ fontSize: size === 'lg' ? 16 : 13 }}>
          {mark ?? (yang ? 'O' : 'X')}
        </span>
      )}
    </span>
  );
}

// 整卦卦画：六爻（自下而上渲染时反转）
export function HexagramFigure({ bits, movingIdx = [], marks = [] as string[], size = 'md' }: {
  bits: number[]; movingIdx?: number[]; marks?: string[]; size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex flex-col-reverse gap-1 items-start text-[#e8e1cd]">
      {bits.map((b, i) => (
        <YaoStroke key={i} yang={b === 1} moving={movingIdx.includes(i)} mark={marks[i]} size={size} />
      ))}
    </div>
  );
}
