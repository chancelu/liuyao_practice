// 排盘总表：六神 | 伏神 | 本卦(六亲 干支 卦画 世应) | 变卦 | 状态
import type { PaiPan } from '../../lib/liuyao/engine';
import { YaoStroke } from './YaoStroke';
import { wangShuaiLabel } from '../../lib/liuyao/engine';

const ELEMENT_COLOR: Record<string, string> = {
  木: 'text-emerald-700', 火: 'text-red-700', 土: 'text-amber-700', 金: 'text-yellow-600', 水: 'text-sky-700',
};

export function PaiPanBoard({ p }: { p: PaiPan }) {
  const rows = [...p.lines].reverse(); // 上爻在上
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
        <thead>
          <tr className="text-xs text-[#8a7f6a] border-b border-[#d8cdb4]">
            <th className="py-1.5 px-2 font-normal">六神</th>
            <th className="py-1.5 px-2 font-normal">伏神</th>
            <th className="py-1.5 px-2 font-normal text-left">本卦 · {p.benGua.info.name}</th>
            <th className="py-1.5 px-2 font-normal">卦画</th>
            <th className="py-1.5 px-2 font-normal">世应</th>
            <th className="py-1.5 px-2 font-normal text-left">{p.bianGua ? `变卦 · ${p.bianGua.info.name}` : '变卦'}</th>
            <th className="py-1.5 px-2 font-normal text-left">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.pos} className={`border-b border-[#ede5d0] ${l.shiYing === '世' ? 'bg-[#f5ecd7]' : ''}`}>
              <td className="py-2 px-2 text-[#7a6f58] whitespace-nowrap">{l.liushen}</td>
              <td className="py-2 px-2 whitespace-nowrap text-[#9a6a3a]">
                {l.fuShen ? `${l.fuShen.liuqin} ${l.fuShen.stem}${l.fuShen.branch}${l.fuShen.element}` : ''}
              </td>
              <td className="py-2 px-2 whitespace-nowrap">
                <span className="font-semibold text-[#3d3428]">{l.liuqin}</span>{' '}
                <span className="text-[#3d3428]">{l.stem}{l.branch}</span>
                <span className={ELEMENT_COLOR[l.element]}>{l.element}</span>
              </td>
              <td className="py-2 px-2">
                <YaoStroke yang={l.yang} moving={l.moving} size="sm" />
              </td>
              <td className="py-2 px-2 text-center">
                {l.shiYing && (
                  <span className={`inline-block w-6 h-6 leading-6 rounded-full text-xs font-bold ${l.shiYing === '世' ? 'bg-[#b03a2e] text-white' : 'bg-[#4a5d7e] text-white'}`}>
                    {l.shiYing}
                  </span>
                )}
                {l.guashen && <span className="ml-1 text-xs text-[#9a6a3a]" title="卦身">身</span>}
                {l.jianYao && <span className="ml-1 text-xs text-[#8a7f6a]" title="间爻">间</span>}
              </td>
              <td className="py-2 px-2 whitespace-nowrap text-[#6b6152]">
                {l.moving && l.bianBranch ? (
                  <>
                    <span>{l.bianLiuqin}</span>{' '}
                    <span>{l.bianStem}{l.bianBranch}</span>
                    <span className={ELEMENT_COLOR[l.bianElement!]}>{l.bianElement}</span>{' '}
                    <YaoStroke yang={!l.yang} size="sm" />
                  </>
                ) : ''}
              </td>
              <td className="py-2 px-2 text-xs leading-5">
                <span className={`mr-1 px-1 rounded ${l.score >= 1.5 ? 'bg-emerald-100 text-emerald-800' : l.score < 0 ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'}`}>
                  {wangShuaiLabel(l.score)}
                </span>
                {l.kong && <span className="mr-1 px-1 rounded bg-stone-200 text-stone-600">空</span>}
                {l.yuePo && <span className="mr-1 px-1 rounded bg-red-100 text-red-700">月破</span>}
                {l.riPo && <span className="mr-1 px-1 rounded bg-red-100 text-red-700">日破</span>}
                {l.anDong && <span className="mr-1 px-1 rounded bg-amber-100 text-amber-800">暗动</span>}
                {l.riHe && <span className="mr-1 px-1 rounded bg-sky-100 text-sky-700">日合</span>}
                {l.jinTui && <span className="mr-1 px-1 rounded bg-purple-100 text-purple-700">{l.jinTui}</span>}
                {l.huitou && l.huitou !== '化比和' && <span className="mr-1 px-1 rounded bg-purple-100 text-purple-700">{l.huitou}</span>}
                {l.huaKong && <span className="mr-1 px-1 rounded bg-stone-200 text-stone-600">化空</span>}
                {l.huaMu && <span className="mr-1 px-1 rounded bg-stone-200 text-stone-600">化墓</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8a7f6a]">
        <span>卦宫：{p.palace}宫（{p.palaceElement}）{p.seq === 1 ? '·本宫卦' : p.seq === 7 ? '·游魂卦' : p.seq === 8 ? '·归魂卦' : `·${['', '', '一', '二', '三', '四', '五'][p.seq]}世卦`}</span>
        <span>卦身：{p.guaShenBranch}</span>
        {p.huGua && <span>互卦：{p.huGua.name}</span>}
        {p.liuChong && <span className="text-[#b03a2e]">六冲卦</span>}
        {p.liuHe && <span className="text-[#4a7e5d]">六合卦</span>}
        {p.fanYin && <span className="text-[#b03a2e]">{p.fanYin}</span>}
        {p.fuYin && <span className="text-[#b03a2e]">{p.fuYin}</span>}
        {p.duFa && <span>独发</span>}
        {p.duJing && <span>独静</span>}
      </div>
    </div>
  );
}
