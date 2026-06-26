'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowDownNarrowWide,
  Hash,
  SearchX,
  Navigation,
} from 'lucide-react';
import { formatDistance } from '@/lib/utils';
import type { Location } from '@/types/location';

interface LocationListProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
}

type SortBy = 'distance' | 'id';

/** 根据距离返回语义色 token —— 与 DESIGN.md 一致 */
function distanceTone(distance: number): {
  text: string;
  bg: string;
  bar: string;
  ring: string;
} {
  if (distance < 3000) {
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      bar: 'bg-emerald-500',
      ring: 'ring-emerald-200',
    };
  }
  if (distance < 8000) {
    return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      bar: 'bg-amber-500',
      ring: 'ring-amber-200',
    };
  }
  return {
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    bar: 'bg-rose-500',
    ring: 'ring-rose-200',
  };
}

export default function LocationList({
  locations,
  selectedLocation,
  onLocationSelect,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locations.filter(
      (loc) => !q || loc.name.toLowerCase().includes(q)
    );
  }, [locations, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) =>
      sortBy === 'distance' ? a.distance - b.distance : a.id - b.id
    );
    return arr;
  }, [filtered, sortBy]);

  // 距离条归一化基准：当前可见列表最大距离
  const maxDistance = useMemo(
    () => sorted.reduce((m, l) => Math.max(m, l.distance), 0) || 1,
    [sorted]
  );

  // 选中项滚动到可视范围
  useEffect(() => {
    if (selectedLocation && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedLocation]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 搜索 + 排序 */}
      <div className="px-4 pt-3 pb-2 space-y-2.5 bg-white border-b border-slate-100">
        {/* 搜索 */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="搜索地点名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700"
              aria-label="清空搜索"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* 排序 + 计数 */}
        <div className="flex items-center justify-between gap-3">
          <div
            role="tablist"
            className="inline-flex items-center bg-slate-100 p-1 rounded-lg"
          >
            <SortTab
              active={sortBy === 'distance'}
              onClick={() => setSortBy('distance')}
              icon={<ArrowDownNarrowWide className="w-3.5 h-3.5" strokeWidth={2.25} />}
            >
              按距离
            </SortTab>
            <SortTab
              active={sortBy === 'id'}
              onClick={() => setSortBy('id')}
              icon={<Hash className="w-3.5 h-3.5" strokeWidth={2.25} />}
            >
              按编号
            </SortTab>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {searchQuery ? (
              <>
                <b className="font-semibold text-slate-900">{sorted.length}</b>
                <span className="text-slate-400"> / {locations.length}</span>
              </>
            ) : (
              <>
                共{' '}
                <b className="font-semibold text-slate-900">
                  {locations.length}
                </b>{' '}
                个
              </>
            )}
          </span>
        </div>
      </div>

      {/* 列表 */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {sorted.length === 0 ? (
          <EmptyState query={searchQuery} />
        ) : (
          <ul className="py-1">
            {sorted.map((location) => {
              const isSelected = selectedLocation?.id === location.id;
              const tone = distanceTone(location.distance);
              const barRatio = location.distance / maxDistance;
              return (
                <li
                  key={location.id}
                  ref={isSelected ? selectedRef : null}
                >
                  <button
                    onClick={() => onLocationSelect(location)}
                    className={`group w-full px-4 py-3 text-left flex items-center gap-3 border-l-[3px] transition-colors tap-target ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'border-transparent hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    {/* 编号徽章 */}
                    <span
                      className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold tabular-nums transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                          : `${tone.bg} ${tone.text} group-hover:ring-2 group-hover:${tone.ring}`
                      }`}
                    >
                      {location.id}
                    </span>

                    {/* 名称 + 地址 + 距离条 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3
                          className={`text-[14px] font-medium truncate ${
                            isSelected ? 'text-emerald-900' : 'text-slate-900'
                          }`}
                        >
                          {location.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {location.address}
                      </p>
                      {/* 距离条 */}
                      <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full origin-left ${tone.bar} rounded-full animate-distance-bar`}
                          style={{ transform: `scaleX(${barRatio})` }}
                        />
                      </div>
                    </div>

                    {/* 距离 */}
                    <div className="flex flex-col items-end shrink-0 ml-1">
                      <span
                        className={`text-[15px] font-semibold tabular-nums leading-tight ${tone.text}`}
                      >
                        {formatDistance(location.distance)}
                      </span>
                      <Navigation
                        className={`w-3 h-3 mt-1 ${tone.text} opacity-60`}
                        strokeWidth={2.25}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SortTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-all ${
        active
          ? 'bg-white text-brand-700 shadow-soft'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-8 py-16 text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
        <SearchX className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-slate-700">
        没有匹配「{query}」的地点
      </p>
      <p className="text-xs text-slate-500 mt-1">试试别的关键词</p>
    </div>
  );
}
