'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Menu, X, MapPinned } from 'lucide-react';
import LocationList from '@/components/LocationList';
import type { Location, TargetLocation } from '@/types/location';
import locationsData from '@/data/locations.json';

const target = locationsData.target as TargetLocation;
const allLocations = locationsData.locations as Location[];

// 动态导入地图组件（避免 SSR 问题）
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLocationClick = useCallback((location: Location) => {
    setSelectedLocation(location);
    setIsMobileMenuOpen(false); // 移动端选择后关闭侧栏
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* 顶部标题栏（移动端） */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <MapPinned className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              通勤距离速查
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              以{target.name}为中心
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="切换地点列表"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-slate-700" />
          ) : (
            <Menu className="w-6 h-6 text-slate-700" />
          )}
        </button>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PC端侧边栏 / 移动端抽屉 */}
        <aside
          className={`
            w-full sm:w-[400px] lg:w-[420px] bg-white shrink-0
            lg:relative lg:translate-x-0 lg:shadow-none
            absolute inset-y-0 left-0 z-20 shadow-2xl
            transition-transform duration-300 ease-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <LocationList
            locations={allLocations}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationClick}
            target={target}
          />
        </aside>

        {/* 地图区域 */}
        <main className="flex-1 relative">
          <MapComponent
            locations={allLocations}
            target={target}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationClick}
          />
        </main>

        {/* 移动端遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden absolute inset-0 bg-black/40 z-10"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

