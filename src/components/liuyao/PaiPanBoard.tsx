// 排盘总表：六神 | 伏神 | 本卦(六亲 干支 卦画 世应) | 变卦 | 状态
import type { PaiPan } from '../../lib/liuyao/engine';
import { YaoStroke } from './YaoStroke';
import { wangShuaiLabel } from '../../lib/liuyao/engine';

const ELEMENT_COLOR: Record<string, string> = {
  木: 'text-emerald-400', 火: 'text-red-700', 土: 'text-amber-400', 金: 'text-yellow-300', 水: 'text-sky-400',
};

export function PaiPanBoard({ p }: { p: PaiPan }) {
  const rows = [...p.lines].reverse(); // 上爻在上
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
        <thead>
          <tr className="text-xs text-[#8d8670] border-b border-[#2e375c]">
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
            <tr key={l.pos} className={`border-b border-[#232a49] ${l.shiYing === '世' ? 'bg-[#252c4e]' : ''}`}>
              <td className="py-2 px-2 text-[#a89f86] whitespace-nowrap">{l.liushen}</td>
              <td className="py-2 px-2 whitespace-nowrap text-[#c9a05e]">
                {l.fuShen ? `${l.fuShen.liuqin} ${l.fuShen.stem}${l.fuShen.branch}${l.fuShen.element}` : ''}
              </td>
              <td className="py-2 px-2 whitespace-nowrap">
                <span className="font-semibold text-[#e8e1cd]">{l.liuqin}</span>{' '}
                <span className="text-[#e8e1cd]">{l.stem}{l.branch}</span>
                <span className={ELEMENT_COLOR[l.element]}>{l.element}</span>
              </td>
              <td className="py-2 px-2">
                <YaoStroke yang={l.yang} moving={l.moving} size="sm" />
              </td>
              <td className="py-2 px-2 text-center">
                {l.shiYing && (
                  <span className={`inline-block w-6 h-6 leading-6 rounded-full text-xs font-bold ${l.shiYing === '世' ? 'bg-[#d0604d] text-white' : 'bg-[#5b6b9e] text-white'}`}>
                    {l.shiYing}
                  </span>
                )}
                {l.guashen && <span className="ml-1 text-xs text-[#c9a05e]" title="卦身">身</span>}
                {l.jianYao && <span className="ml-1 text-xs text-[#8d8670]" title="间爻">间</span>}
              </td>
              <td className="py-2 px-2 whitespace-nowrap text-[#b0a78c]">
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
                <span className={`mr-1 px-1 rounded ${l.score >= 1.5 ? 'bg-emerald-400/15 text-emerald-300' : l.score < 0 ? 'bg-red-400/15 text-red-300' : 'bg-stone-400/15 text-stone-300'}`}>
                  {wangShuaiLabel(l.score)}
                </span>
                {l.kong && <span className="mr-1 px-1 rounded bg-stone-400/20 text-stone-300">空</span>}
                {l.yuePo && <span className="mr-1 px-1 rounded bg-red-400/15 text-red-300">月破</span>}
                {l.riPo && <span className="mr-1 px-1 rounded bg-red-400/15 text-red-300">日破</span>}
                {l.anDong && <span className="mr-1 px-1 rounded bg-amber-400/15 text-amber-300">暗动</span>}
                {l.riHe && <span className="mr-1 px-1 rounded bg-sky-400/15 text-sky-300">日合</span>}
                {l.jinTui && <span className="mr-1 px-1 rounded bg-purple-400/15 text-purple-300">{l.jinTui}</span>}
                {l.huitou && l.huitou !== '化比和' && <span className="mr-1 px-1 rounded bg-purple-400/15 text-purple-300">{l.huitou}</span>}
                {l.huaKong && <span className="mr-1 px-1 rounded bg-stone-400/20 text-stone-300">化空</span>}
                {l.huaMu && <span className="mr-1 px-1 rounded bg-stone-400/20 text-stone-300">化墓</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8d8670]">
        <span>卦宫：{p.palace}宫（{p.palaceElement}）{p.seq === 1 ? '·本宫卦' : p.seq === 7 ? '·游魂卦' : p.seq === 8 ? '·归魂卦' : `·${['', '', '一', '二', '三', '四', '五'][p.seq]}世卦`}</span>
        <span>卦身：{p.guaShenBranch}</span>
        {p.huGua && <span>互卦：{p.huGua.name}</span>}
        {p.liuChong && <span className="text-[#d0604d]">六冲卦</span>}
        {p.liuHe && <span className="text-[#6fae85]">六合卦</span>}
        {p.fanYin && <span className="text-[#d0604d]">{p.fanYin}</span>}
        {p.fuYin && <span className="text-[#d0604d]">{p.fuYin}</span>}
        {p.duFa && <span>独发</span>}
        {p.duJing && <span>独静</span>}
      </div>
    </div>
  );
}
