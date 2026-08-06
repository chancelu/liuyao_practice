// 玄学教学研习工作流：六爻 / 八字 双模块 —— 墨色鎏金品牌外壳
import { useState } from 'react';
import { LiuyaoApp } from './components/liuyao/LiuyaoApp';
import { BaziApp } from './components/bazi/BaziApp';
import { TutorSettings } from './components/SettingsKey';

const TABS = [
  { id: 'liuyao', label: '六爻', sub: '纳甲四卷', desc: '京房纳甲 · 以钱代蓍' },
  { id: 'bazi', label: '八字', sub: '子平典籍', desc: '四柱十神 · 旺衰格局' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SERIF = '"Songti SC","STSong","SimSun",serif';

/** 太极品牌徽记：鎏金太极 + 轨道环 */
function BrandMark() {
  return (
    <span className="relative flex items-center justify-center w-12 h-12 shrink-0">
      {/* 虚线轨道环 */}
      <svg viewBox="0 0 48 48" className="absolute inset-0 w-12 h-12 animate-[spin_40s_linear_infinite]">
        <circle cx="24" cy="24" r="22.5" fill="none" stroke="#c9a962" strokeOpacity="0.35" strokeWidth="0.7" strokeDasharray="2 3.5" />
        <circle cx="24" cy="1.5" r="1.2" fill="#e3c98a" />
      </svg>
      {/* 太极 */}
      <svg viewBox="0 0 36 36" className="w-7 h-7 drop-shadow-[0_0_10px_rgba(201,169,98,0.45)]">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#c9a962" strokeWidth="1.1" />
        <path d="M18 2 a16 16 0 0 1 0 32 a8 8 0 0 1 0-16 a8 8 0 0 0 0-16z" fill="#c9a962" />
        <circle cx="18" cy="10" r="2.3" fill="#0f0d09" />
        <circle cx="18" cy="26" r="2.3" fill="#c9a962" />
      </svg>
    </span>
  );
}

/** 装饰分隔：细线 + 菱形 */
function Ornament({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[#c9a962]/50 ${className}`} aria-hidden>
      <span className="block w-10 h-px bg-gradient-to-r from-transparent to-[#c9a962]/60" />
      <span className="text-[8px]">✦</span>
      <span className="block w-10 h-px bg-gradient-to-l from-transparent to-[#c9a962]/60" />
    </span>
  );
}

export default function App() {
  const [tab, setTabRaw] = useState<TabId>(() => (location.hash === '#bazi' ? 'bazi' : 'liuyao'));
  const setTab = (t: TabId) => { setTabRaw(t); location.hash = t === 'bazi' ? '#bazi' : '#liuyao'; };

  return (
    <div className="min-h-screen lg:h-screen lg:flex lg:flex-col text-[#e8e1cd]" style={{ fontFamily: '"PingFang SC","Songti SC",serif' }}>
      {/* 顶栏 */}
      <header className="relative border-b border-[#c9a962]/15 bg-[#0f0d09]/80 backdrop-blur-md shrink-0">
        {/* 顶部极细鎏金线 */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#c9a962]/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          {/* 品牌 */}
          <div className="flex items-center gap-3.5">
            <BrandMark />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-[22px] font-bold tracking-[0.28em] text-[#ecdfc0]"
                  style={{ fontFamily: SERIF, textShadow: '0 0 28px rgba(201,169,98,0.35)' }}>
                  玄学教学研习工作流
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] tracking-[0.42em] text-[#8a7d5f] uppercase" style={{ fontFamily: 'Georgia,serif' }}>
                  Divination Study Atelier
                </span>
                <Ornament />
              </div>
            </div>
          </div>

          {/* Tab 切换 + 设置 */}
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 rounded-full border border-[#c9a962]/25 bg-[#17140f]/80 p-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-5 py-2 rounded-full transition-all duration-300 ${
                      active
                        ? 'bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] shadow-[0_2px_18px_rgba(201,169,98,0.4)]'
                        : 'text-[#b0a78c] hover:text-[#ecdfc0]'
                    }`}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold tracking-[0.2em]" style={{ fontFamily: SERIF }}>{t.label}</span>
                      <span className={`text-[10px] tracking-wider ${active ? 'text-[#4a3a16]' : 'text-[#6f6a58]'}`}>{t.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <TutorSettings />
          </div>
        </div>
      </header>

      {/* 两个 Tab 都挂载以保持各自状态，仅切换显示 */}
      <div className={tab === 'liuyao' ? 'contents' : 'hidden'}><LiuyaoApp /></div>
      <div className={tab === 'bazi' ? 'contents' : 'hidden'}><BaziApp /></div>
    </div>
  );
}
