'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ListFilter, X, ArrowLeftRight } from 'lucide-react';
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
        className="lg:hidden absolute top-0 inset-x-0 z-30 bg-white/45 backdrop-blur-2xl border-b border-white/30 shadow-[0_1px_12px_-4px_rgb(15_23_42/0.12)] px-4 pb-2.5 flex items-center gap-3"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.625rem)' }}
      >
        <div className="flex-1 min-w-0">
          <Image
            src="/logo.png"
            alt="Point"
            width={120}
            height={32}
            priority
            className="h-7 w-auto"
          />
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
          <aside className="w-[420px] xl:w-[440px] bg-slate-50 border-r border-slate-200 shrink-0 flex flex-col z-10">
            {/* 顶部整合卡片：品牌 + 参照点 */}
            <div className="m-5 mb-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.08)] overflow-hidden">
              {/* 上半部：品牌区（仅 logo） */}
              <div className="px-5 pt-4 pb-3.5">
                <Image
                  src="/logo.png"
                  alt="Point"
                  width={140}
                  height={46}
                  priority
                  className="h-8 w-auto"
                />
              </div>

              {/* 虚线分隔 */}
              <div className="border-t border-dashed border-slate-200 mx-5" />

              {/* 下半部：参照点区 */}
              <div className="px-5 pt-3.5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[18px] h-[18px] rounded-full bg-brand-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    当前参考点
                  </span>
                  {isCustomTarget && (
                    <span className="ml-auto inline-flex items-center text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      自定义
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex-1 min-w-0 text-2xl font-bold text-slate-900 leading-tight truncate">
                    {target.name}
                  </h2>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={2.5} />
                    更换
                  </button>
                </div>
              </div>
            </div>

            {/* 列表区 */}
            <div className="flex-1 min-h-0 px-5">
              <div className="h-full bg-white rounded-t-2xl shadow-[0_-2px_12px_rgba(15,23,42,0.04)] overflow-hidden">
                <LocationList
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleLocationClick}
                />
              </div>
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
              {/* 抽屉头：品牌 + 参照点 */}
              <div className="px-4 pt-3 pb-3 border-b border-slate-100 shrink-0">
                {/* 第一行：logo + 关闭按钮 */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <Image
                    src="/logo.png"
                    alt="Point"
                    width={120}
                    height={40}
                    className="h-7 w-auto"
                  />
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="关闭列表"
                    className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" strokeWidth={2.25} />
                  </button>
                </div>

                {/* 第二行：参照点名称 + 更换参照点按钮 */}
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex-1 min-w-0 text-xl font-bold text-slate-900 leading-tight truncate">
                    {target.name}
                  </h2>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    更换参照点
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <LocationList
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleLocationClick}
                />
              </div>
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
