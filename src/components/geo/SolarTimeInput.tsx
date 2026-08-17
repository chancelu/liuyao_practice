// 出生地 + 时间输入（真太阳时校正）—— 六爻/八字两模块共用
// 八字：出生地必填（四柱以真太阳时为准）；六爻：摇卦地点选填，不填直接按北京时间
import { useMemo } from 'react';
import { PROVINCES, DEFAULT_PLACE, cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf, fmtMin, fmtTime, shichenName } from '../../lib/geo/solarTime';
import { MapPin, Clock3 } from 'lucide-react';

export interface PlaceSel { prov: number; city: number }

const inputCls = 'input-dark px-2 py-2';

export function SolarTimeInput({
  date, setDate, time, setTime, place, setPlace,
  optional = false,
  placeLabel = '出生地（校正真太阳时）',
}: {
  date: string;
  setDate: (s: string) => void;
  time: string;
  setTime: (s: string) => void;
  place: PlaceSel | null; // null = 不填，按北京时间
  setPlace: (p: PlaceSel | null) => void;
  optional?: boolean;     // true=地点选填（六爻）；false=必填（八字）
  placeLabel?: string;
}) {
  const shown = place ?? DEFAULT_PLACE;
  const prov = PROVINCES[shown.prov] ?? PROVINCES[0];
  const city = cityAt(shown.prov, shown.city);

  const info = useMemo(() => {
    if (!place) return null; // 未填地点：不做真太阳时换算
    const d = dateTimeOf(date, time);
    if (!d) return null;
    return { beijing: d, solar: solarCorrection(d, city.lng) };
  }, [date, time, place, city.lng]);

  const branchChanged = info && shichenName(info.beijing) !== shichenName(info.solar.corrected);
  const dayChanged = info && info.beijing.getDate() !== info.solar.corrected.getDate();

  const modeBtn = (active: boolean) =>
    `text-xs py-1.5 rounded-lg border transition-colors ${active
      ? 'border-[#c9a962] bg-gradient-to-b from-[#e3c98a] to-[#b08d48] text-[#1a1408] font-bold'
      : 'border-[#3a2f1e] bg-[#131008] text-[#b0a78c] hover:border-[#c9a962]/60'}`;

  return (
    <div className="space-y-3">
      {/* 地点 */}
      <div>
        <label className="flex items-center gap-1 text-xs font-semibold text-[#c8bd9c] mb-1.5">
          <MapPin size={12} className="text-[#d4b578]" /> {placeLabel}
        </label>
        {optional && (
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <button onClick={() => setPlace(null)} className={modeBtn(!place)}>不填 · 按北京时间</button>
            <button onClick={() => setPlace(place ?? DEFAULT_PLACE)} className={modeBtn(!!place)}>填写地点校正</button>
          </div>
        )}
        {place && (
          <div className="flex gap-1.5">
            <select
              value={shown.prov}
              onChange={(e) => setPlace({ prov: Number(e.target.value), city: 0 })}
              className={`w-[6.5rem] shrink-0 ${inputCls}`}
            >
              {PROVINCES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
            </select>
            <select
              value={shown.city}
              onChange={(e) => setPlace({ prov: shown.prov, city: Number(e.target.value) })}
              className={`flex-1 min-w-0 ${inputCls}`}
            >
              {prov.cities.map((ct, i) => <option key={ct.name} value={i}>{ct.name}（{ct.lng}°E）</option>)}
            </select>
          </div>
        )}
      </div>

      {/* 时间（钟表时间 / 北京时间） */}
      <div>
        <label className="flex items-center gap-1 text-xs font-semibold text-[#c8bd9c] mb-1.5">
          <Clock3 size={12} className="text-[#d4b578]" /> 时间（钟表时间，即北京时间）
        </label>
        <div className="flex gap-1.5">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`flex-1 min-w-0 ${inputCls}`} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`w-[6.5rem] shrink-0 ${inputCls}`} />
        </div>
      </div>

      {/* 真太阳时换算明细 */}
      {info ? (
        <div className="rounded-md border border-[#c9a962]/30 bg-[#c9a962]/5 px-3 py-2 text-[11px] leading-relaxed">
          <div className="text-[#8d8670] space-y-0.5">
            <div>① 经度修正：{city.name} {city.lng}°E，距中央经线 120°E {city.lng >= 120 ? '偏东' : '偏西'} {Math.abs(city.lng - 120).toFixed(1)}° → <span className="text-[#d4b578]">{fmtMin(info.solar.lngMin)}</span>（每度 4 分钟）</div>
            <div>② 均时差：地球公转椭圆与黄赤交角所致 → <span className="text-[#d4b578]">{fmtMin(info.solar.eotMin)}</span></div>
          </div>
          <div className="mt-1 pt-1 border-t border-[#c9a962]/20 text-xs">
            真太阳时 <b className="text-[#ecdfc0]" style={{ fontFamily: '"Songti SC",serif' }}>{fmtTime(info.solar.corrected)}（{shichenName(info.solar.corrected)}）</b>
            <span className="text-[#8d8670]">　钟表 {fmtTime(info.beijing)}（{shichenName(info.beijing)}）</span>
            {branchChanged && (
              <span className="ml-1 text-[#e57373] font-bold">
                时柱已变更{dayChanged ? '（且跨日，日柱亦变）' : ''}
              </span>
            )}
          </div>
        </div>
      ) : optional ? (
        <p className="text-[10px] text-[#6f6a58] leading-snug">
          未填地点：直接按北京时间定月建日辰，不做真太阳时校正。
        </p>
      ) : null}
      {!optional && (
        <p className="text-[10px] text-[#6f6a58] leading-snug">
          四柱以真太阳时为准：排盘用校正后的时间定年月日时四柱。经度取地级市中心（区县级差异不足 1 分钟）；均时差为天文近似值（误差 &lt;1 分钟）。
        </p>
      )}
    </div>
  );
}
