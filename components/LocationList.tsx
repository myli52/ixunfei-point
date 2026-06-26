'use client';

import { useState, useMemo } from 'react';
import { Search, X, Star, Navigation2 } from 'lucide-react';
import { formatDistance, getDistanceColor } from '@/lib/utils';
import type { Location, TargetLocation } from '@/types/location';

interface LocationListProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  target: TargetLocation;
}

type SortBy = 'distance' | 'id';

export default function LocationList({
  locations,
  selectedLocation,
  onLocationSelect,
  target,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('distance');

  const list = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = locations.filter(
      (loc) => !q || loc.name.toLowerCase().includes(q)
    );
    result.sort((a, b) =>
      sortBy === 'distance' ? a.distance - b.distance : a.id - b.id
    );
    return result;
  }, [locations, searchQuery, sortBy]);

  const nearest = useMemo(
    () =>
      locations.reduce(
        (min, l) => (l.distance < min ? l.distance : min),
        Infinity
      ),
    [locations]
  );
  const farthest = useMemo(
    () => locations.reduce((max, l) => (l.distance > max ? l.distance : max), 0),
    [locations]
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 统计信息 */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            共 <b className="font-semibold text-slate-900">{locations.length}</b> 个地点
          </span>
          <span>
            最近 <b className="font-semibold text-green-600">{formatDistance(nearest)}</b>
          </span>
          <span>
            最远 <b className="font-semibold text-red-600">{formatDistance(farthest)}</b>
          </span>
        </div>
      </div>

      {/* 搜索 + 排序 */}
      <div className="px-4 py-3 space-y-2.5 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索地点名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-blue-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="清空搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['distance', 'id'] as SortBy[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
                sortBy === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {key === 'distance' ? '按距离排序' : '按编号排序'}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">未找到匹配的地点</p>
          </div>
        ) : (
          <ul>
            {list.map((location) => {
              const isSelected = selectedLocation?.id === location.id;
              const color = getDistanceColor(location.distance);
              return (
                <li key={location.id}>
                  <button
                    onClick={() => onLocationSelect(location)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 border-l-[3px] transition-colors ${
                      isSelected
                        ? 'bg-green-50 border-green-500'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* 编号徽章 */}
                    <span
                      className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {location.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-[14px] font-medium truncate ${
                          isSelected ? 'text-green-900' : 'text-slate-800'
                        }`}
                      >
                        {location.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {location.address}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className="text-[15px] font-semibold tabular-nums"
                        style={{ color }}
                      >
                        {formatDistance(location.distance)}
                      </span>
                      <Navigation2
                        className="w-3 h-3 mt-0.5"
                        style={{ color }}
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
