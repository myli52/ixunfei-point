'use client';

import { Crosshair, Replace } from 'lucide-react';
import type { TargetLocation } from '@/types/location';

interface TargetHeroProps {
  target: TargetLocation;
  isCustom?: boolean;
  onOpenSearch: () => void;
}

/**
 * Hero 卡片 —— 信息中枢，仅展示「当前参照中心」与「更换」入口。
 * 不含搜索框、不含统计区：搜索交由独立弹层 TargetSearchModal，
 * 确保界面同一时刻只有「列表筛选」一个输入框。
 */
export default function TargetHero({
  target,
  isCustom = false,
  onOpenSearch,
}: TargetHeroProps) {
  return (
    <div className="px-5 pt-4 pb-4 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <Crosshair
            className="w-[15px] h-[15px] text-brand-600"
            strokeWidth={2.25}
          />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          距离参照中心
        </span>
        {isCustom && (
          <span className="ml-auto inline-flex items-center text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            自定义
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="flex-1 min-w-0 text-xl font-semibold text-slate-900 leading-tight truncate">
          {target.name}
        </h2>
        <button
          onClick={onOpenSearch}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
        >
          <Replace className="w-3.5 h-3.5" strokeWidth={2.5} />
          更换
        </button>
      </div>
    </div>
  );
}
