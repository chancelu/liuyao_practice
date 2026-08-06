// 出生地 + 时间输入（真太阳时校正）—— 六爻/八字两模块共用
import { useMemo } from 'react';
import { PROVINCES, cityAt } from '../../lib/geo/cities';
import { solarCorrection, dateTimeOf, fmtMin, fmtTime, shichenName } from '../../lib/geo/solarTime';
import { MapPin, Clock3 } from 'lucide-react';

export interface PlaceSel { prov: number; city: number }

const inputCls = 'input-dark px-2 py-2';

export function SolarTimeInput({
  date, setDate, time, setTime, place, setPlace,
}: {
  date: string;
  setDate: (s: string) => void;
  time: string;
  setTime: (s: string) => void;
  place: PlaceSel;
  setPlace: (p: PlaceSel) => void;
}) {
  const prov = PROVINCES[place.prov] ?? PROVINCES[0];
  const city = cityAt(place.prov, place.city);

  const info = useMemo(() => {
    const d = dateTimeOf(date, time);
    if (!d) return null;
    return { beijing: d, solar: solarCorrection(d, city.lng) };
  }, [date, time, city.lng]);

  const branchChanged = info && shichenName(info.beijing) !== shichenName(info.solar.corrected);
  const dayChanged = info && info.beijing.getDate() !== info.solar.corrected.getDate();

  return (
    <div className="space-y-3">
      {/* 出生地 */}
      <div>
        <label className="flex items-center gap-1 text-xs font-semibold text-[#c8bd9c] mb-1.5">
          <MapPin size={12} className="text-[#d4b578]" /> 出生地（校正真太阳时）
        </label>
        <div className="flex gap-1.5">
          <select
            value={place.prov}
            onChange={(e) => setPlace({ prov: Number(e.target.value), city: 0 })}
            className={`w-[6.5rem] shrink-0 ${inputCls}`}
          >
            {PROVINCES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
          <select
            value={place.city}
            onChange={(e) => setPlace({ prov: place.prov, city: Number(e.target.value) })}
            className={`flex-1 min-w-0 ${inputCls}`}
          >
            {prov.cities.map((ct, i) => <option key={ct.name} value={i}>{ct.name}（{ct.lng}°E）</option>)}
          </select>
        </div>
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
      {info && (
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
      )}
      <p className="text-[10px] text-[#6f6a58] leading-snug">
        四柱以真太阳时为准：排盘用校正后的时间定年月日时四柱。经度取地级市中心（区县级差异不足 1 分钟）；均时差为天文近似值（误差 &lt;1 分钟）。
      </p>
    </div>
  );
}
