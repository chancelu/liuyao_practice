// 玄学教学研习工作流：六爻 / 八字 双模块 —— 暗夜金调品牌外壳
import { useState } from 'react';
import { LiuyaoApp } from './components/liuyao/LiuyaoApp';
import { BaziApp } from './components/bazi/BaziApp';
import { Coins, Columns2 } from 'lucide-react';

const TABS = [
  { id: 'liuyao', label: '六爻 · 纳甲四卷', icon: Coins, desc: '京房纳甲 · 以钱代蓍' },
  { id: 'bazi', label: '八字 · 子平典籍', icon: Columns2, desc: '四柱十神 · 旺衰格局' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** 太极品牌徽记 */
function BrandMark() {
  return (
    <span className="relative flex items-center justify-center w-11 h-11 rounded-full border border-[#b08a44]/60 bg-[#151b31] shadow-[0_0_18px_rgba(176,138,68,0.25)] shrink-0">
      <svg viewBox="0 0 36 36" className="w-7 h-7">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#b08a44" strokeWidth="1.4" />
        <path d="M18 2 a16 16 0 0 1 0 32 a8 8 0 0 1 0-16 a8 8 0 0 0 0-16z" fill="#b08a44" />
        <circle cx="18" cy="10" r="2.4" fill="#151b31" />
        <circle cx="18" cy="26" r="2.4" fill="#b08a44" />
      </svg>
    </span>
  );
}

export default function App() {
  const [tab, setTabRaw] = useState<TabId>(() => (location.hash === '#bazi' ? 'bazi' : 'liuyao'));
  const setTab = (t: TabId) => { setTabRaw(t); location.hash = t === 'bazi' ? '#bazi' : '#liuyao'; };

  return (
    <div className="min-h-screen lg:h-screen lg:flex lg:flex-col text-[#e8e1cd]" style={{ fontFamily: '"PingFang SC","Songti SC",serif' }}>
      {/* 顶栏 */}
      <header className="border-b border-[#2e375c]/80 bg-[#0d1122]/85 backdrop-blur shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] text-[#ecdfc0]"
                style={{ fontFamily: '"Songti SC","STSong",serif', textShadow: '0 0 24px rgba(176,138,68,0.35)' }}>
                玄学教学研习工作流
              </h1>
              <p className="text-[11px] text-[#8d8670] mt-0.5 tracking-wide">
                六爻九步推演 · 八字十三步研习 —— 每步讲透「怎么推 · 为何如此 · 出自何典」，Kimi K3 助教逐步答疑
              </p>
            </div>
          </div>
          {/* Tab 切换 */}
          <div className="flex gap-1 bg-[#151b31] border border-[#2e375c] rounded-full p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                    active
                      ? 'bg-gradient-to-b from-[#c9a05e] to-[#a37c36] text-[#1a1408] shadow-[0_2px_14px_rgba(176,138,68,0.4)]'
                      : 'text-[#b0a78c] hover:text-[#e8e1cd] hover:bg-[#232a49]'
                  }`}
                >
                  <Icon size={15} />
                  <span className="font-bold" style={{ fontFamily: '"Songti SC",serif' }}>{t.label}</span>
                  <span className={`text-[10px] hidden md:inline ${active ? 'text-[#3a2d10]' : 'text-[#6f6a58]'}`}>{t.desc}</span>
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
