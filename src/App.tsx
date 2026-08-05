// 玄学教学研习工作流：六爻 / 八字 双模块
import { useState } from 'react';
import { LiuyaoApp } from './components/liuyao/LiuyaoApp';
import { BaziApp } from './components/bazi/BaziApp';
import { Coins, Columns2 } from 'lucide-react';

const TABS = [
  { id: 'liuyao', label: '六爻 · 云笈四卷', icon: Coins, desc: '京房纳甲 · 以钱代蓍' },
  { id: 'bazi', label: '八字 · 子平典籍', icon: Columns2, desc: '四柱十神 · 旺衰格局' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTabRaw] = useState<TabId>(() => (location.hash === '#bazi' ? 'bazi' : 'liuyao'));
  const setTab = (t: TabId) => { setTabRaw(t); location.hash = t === 'bazi' ? '#bazi' : '#liuyao'; };

  return (
    <div className="min-h-screen lg:h-screen lg:flex lg:flex-col bg-[#f3eedf] text-[#3d3428]" style={{ fontFamily: '"PingFang SC","Songti SC",serif' }}>
      {/* 顶栏 */}
      <header className="border-b border-[#d8cdb4] bg-[#faf6ea] shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: '"Songti SC","STSong",serif' }}>
              玄学教学研习工作流
            </h1>
            <p className="text-xs text-[#8a7f6a] mt-0.5">
              六爻：从摇卦到断卦九步推演 · 八字：从排盘到论命六步研习 —— 每步讲透「怎么推、为何如此、出自何典」，配 AI 助教逐步答疑
            </p>
          </div>
          {/* Tab 切换 */}
          <div className="flex gap-1 bg-[#efe8d5] rounded-lg p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                    active ? 'bg-[#7a5c2e] text-white shadow' : 'text-[#6b6152] hover:bg-[#e5dcc4]'
                  }`}
                >
                  <Icon size={15} />
                  <span className="font-bold" style={{ fontFamily: '"Songti SC",serif' }}>{t.label}</span>
                  <span className={`text-[10px] hidden md:inline ${active ? 'text-[#e8ddc0]' : 'text-[#9a8f78]'}`}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 两个 Tab 都挂载以保持各自状态，仅切换显示 */}
      <div className={tab === 'liuyao' ? 'contents' : 'hidden'}><LiuyaoApp /></div>
      <div className={tab === 'bazi' ? 'contents' : 'hidden'}><BaziApp /></div>
    </div>
  );
}
