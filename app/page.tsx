'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPinned } from 'lucide-react';
import LocationList from '@/components/LocationList';
import TargetHero from '@/components/TargetHero';
import BottomSheet, { SheetSnap } from '@/components/BottomSheet';
import NearbyChips from '@/components/NearbyChips';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { calculateDistanceFromTarget } from '@/lib/utils';
import type { Location, TargetLocation } from '@/types/location';
import locationsData from '@/data/locations.json';

const defaultTarget = locationsData.target as TargetLocation;
const rawLocations = locationsData.locations as Location[];

const CUSTOM_TARGET_KEY = 'customTarget';

function loadSavedTarget(): TargetLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(CUSTOM_TARGET_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [target, setTarget] = useState<TargetLocation>(defaultTarget);
  const [isCustomTarget, setIsCustomTarget] = useState(false);

  // 首次渲染后从 localStorage 恢复（避免 SSR/CSR 不一致）
  useEffect(() => {
    const saved = loadSavedTarget();
    if (saved) {
      setTarget(saved);
      setIsCustomTarget(true);
    }
  }, []);

  const locations = useMemo(
    () =>
      rawLocations.map((loc) => ({
        ...loc,
        distance: calculateDistanceFromTarget(target.lnglat, loc.lnglat),
      })),
    [target]
  );

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  // 移动端 BottomSheet 档位
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');

  const handleLocationClick = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
      // 移动端选中后自动收起到 peek，让地图露出
      if (!isDesktop) setSheetSnap('peek');
    },
    [isDesktop]
  );

  const handleTargetChange = useCallback((newTarget: TargetLocation) => {
    setTarget(newTarget);
    setIsCustomTarget(true);
    setSelectedLocation(null);
    try {
      localStorage.setItem(CUSTOM_TARGET_KEY, JSON.stringify(newTarget));
    } catch {}
  }, []);

  const handleResetDefault = useCallback(() => {
    setTarget(defaultTarget);
    setIsCustomTarget(false);
    setSelectedLocation(null);
    try {
      localStorage.removeItem(CUSTOM_TARGET_KEY);
    } catch {}
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-50">
      {/* ============ 移动端 AppBar ============ */}
      <header
        className="lg:hidden bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0 z-20"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.625rem)' }}
      >
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-soft">
          <MapPinned className="w-5 h-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-slate-900 leading-tight">
            通勤距离速查
          </h1>
          <p className="text-[11px] text-slate-500 leading-tight truncate">
            以「{target.name}」为参照
          </p>
        </div>
      </header>

      {/* ============ 主区域 ============ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PC 侧边栏 */}
        {isDesktop && (
          <aside className="w-[420px] xl:w-[440px] bg-white border-r border-slate-200 shrink-0 flex flex-col shadow-soft z-10">
            {/* 桌面标题 */}
            <div className="px-5 pt-5 pb-2 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-soft">
                <MapPinned className="w-5 h-5 text-white" strokeWidth={2.25} />
              </div>
              <div>
                <h1 className="text-[17px] font-semibold text-slate-900 leading-tight">
                  通勤距离速查
                </h1>
                <p className="text-xs text-slate-500 leading-tight">
                  合肥地区 · {locations.length} 个地点
                </p>
              </div>
            </div>

            <TargetHero
              target={target}
              locations={locations}
              onTargetChange={handleTargetChange}
              onResetDefault={handleResetDefault}
              isCustom={isCustomTarget}
            />

            <div className="flex-1 min-h-0">
              <LocationList
                locations={locations}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationClick}
              />
            </div>
          </aside>
        )}

        {/* 地图 */}
        <main className="flex-1 relative">
          <MapComponent
            locations={locations}
            target={target}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationClick}
          />
        </main>

        {/* 移动端 BottomSheet */}
        {!isDesktop && (
          <BottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            peekContent={
              <>
                <div className="px-4 pt-1 pb-2">
                  <TargetHeroCompact
                    target={target}
                    onClickChange={() => setSheetSnap('half')}
                    isCustom={isCustomTarget}
                  />
                </div>
                <NearbyChips
                  locations={locations}
                  selectedId={selectedLocation?.id}
                  onSelect={(loc) => {
                    handleLocationClick(loc);
                  }}
                />
              </>
            }
          >
            {/* 展开后的完整内容：Hero（含搜索） + 列表 */}
            <div className="h-full flex flex-col">
              <TargetHero
                target={target}
                locations={locations}
                onTargetChange={handleTargetChange}
                onResetDefault={handleResetDefault}
                isCustom={isCustomTarget}
              />
              <div className="flex-1 min-h-0">
                <LocationList
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleLocationClick}
                />
              </div>
            </div>
          </BottomSheet>
        )}
      </div>
    </div>
  );
}

/** 移动端 peek 态的紧凑型目标条 */
function TargetHeroCompact({
  target,
  onClickChange,
  isCustom,
}: {
  target: TargetLocation;
  onClickChange: () => void;
  isCustom: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          距离参照中心
        </div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-semibold text-slate-900 truncate">
            {target.name}
          </h2>
          {isCustom && (
            <span className="shrink-0 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              自定义
            </span>
          )}
        </div>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClickChange();
        }}
        className="shrink-0 text-[12px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        更换
      </button>
    </div>
  );
}
