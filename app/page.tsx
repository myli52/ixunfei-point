'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPinned, ListFilter, X } from 'lucide-react';
import LocationList from '@/components/LocationList';
import TargetHero from '@/components/TargetHero';
import TargetSearchModal from '@/components/TargetSearchModal';
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
  const [drawerOpen, setDrawerOpen] = useState(false); // 移动端列表抽屉
  const [searchOpen, setSearchOpen] = useState(false); // 更换中心弹层

  const handleLocationClick = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
      if (!isDesktop) setDrawerOpen(false); // 移动端选中后关抽屉露出地图
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

  // 列表面板内容（PC 侧栏 / 移动抽屉共用）
  const listPanel = (
    <div className="h-full flex flex-col bg-white">
      <TargetHero
        target={target}
        isCustom={isCustomTarget}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <div className="flex-1 min-h-0">
        <LocationList
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationClick}
        />
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-50">
      {/* ============ 移动端 AppBar（毛玻璃） ============ */}
      <header
        className="lg:hidden absolute top-0 inset-x-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_12px_-4px_rgb(15_23_42/0.15)] px-4 pb-2.5 flex items-center gap-3"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.625rem)' }}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-soft">
          <MapPinned className="w-[18px] h-[18px] text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-brand text-[19px] font-extrabold text-slate-900 leading-none tracking-tight">
            Point
          </h1>
          <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
            以「{target.name}」为参照
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="打开地点列表"
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/80 border border-slate-200/80 text-[13px] font-medium text-slate-700 active:scale-95 transition-transform"
        >
          <ListFilter className="w-4 h-4" strokeWidth={2.25} />
          列表
        </button>
      </header>

      {/* ============ 主区域 ============ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PC 侧边栏 */}
        {isDesktop && (
          <aside className="w-[420px] xl:w-[440px] bg-white border-r border-slate-200 shrink-0 flex flex-col shadow-soft z-10">
            <div className="px-5 pt-5 pb-2 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-soft">
                <MapPinned className="w-5 h-5 text-white" strokeWidth={2.25} />
              </div>
              <div>
                <h1 className="font-brand text-[22px] font-extrabold text-slate-900 leading-none tracking-tight">
                  Point
                </h1>
                <p className="text-xs text-slate-500 leading-tight mt-1">
                  合肥地区 · {locations.length} 个地点
                </p>
              </div>
            </div>
            {listPanel}
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

        {/* 移动端：全屏列表抽屉 + 毛玻璃遮罩 */}
        {!isDesktop && (
          <>
            {/* 遮罩 */}
            <div
              className={`fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${
                drawerOpen
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setDrawerOpen(false)}
            />
            {/* 抽屉本体（左侧滑出，近全屏） */}
            <aside
              className={`fixed inset-y-0 left-0 z-40 w-[88%] max-w-[420px] bg-white shadow-elevated flex flex-col transition-transform duration-300 ease-emphasized ${
                drawerOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              style={{ paddingTop: 'var(--safe-top)' }}
            >
              {/* 抽屉头：关闭按钮 */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                    <MapPinned
                      className="w-[17px] h-[17px] text-white"
                      strokeWidth={2.25}
                    />
                  </div>
                  <span className="text-[15px] font-semibold text-slate-900 tracking-tight">
                    地点列表
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="关闭列表"
                  className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={2.25} />
                </button>
              </div>
              <div className="flex-1 min-h-0">{listPanel}</div>
            </aside>
          </>
        )}
      </div>

      {/* 更换参照中心弹层 */}
      <TargetSearchModal
        open={searchOpen}
        currentTarget={target}
        isCustom={isCustomTarget}
        onClose={() => setSearchOpen(false)}
        onTargetChange={handleTargetChange}
        onResetDefault={handleResetDefault}
      />
    </div>
  );
}
