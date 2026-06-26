'use client';

import { formatDistance } from '@/lib/utils';
import type { Location } from '@/types/location';

interface NearbyChipsProps {
  locations: Location[];
  selectedId?: number;
  onSelect: (loc: Location) => void;
}

/** peek 态横向滚动的最近 N 个地点芯片（移动端专用） */
export default function NearbyChips({
  locations,
  selectedId,
  onSelect,
}: NearbyChipsProps) {
  const top = [...locations].sort((a, b) => a.distance - b.distance).slice(0, 8);

  return (
    <div className="px-4 pb-2">
      <div className="text-[11px] font-medium text-slate-500 mb-1.5 px-1">
        最近的地点
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {top.map((loc) => {
          const active = loc.id === selectedId;
          return (
            <button
              key={loc.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(loc);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${
                active
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className={`tabular-nums ${
                  active ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {loc.id}
              </span>
              <span className="max-w-[100px] truncate">{loc.name}</span>
              <span
                className={`tabular-nums text-[11px] ${
                  active ? 'text-emerald-100' : 'text-emerald-600'
                }`}
              >
                {formatDistance(loc.distance)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
