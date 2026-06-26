'use client';

import { useState } from 'react';
import { Crosshair, Replace, RotateCcw } from 'lucide-react';
import TargetSearchInput from './TargetSearchInput';
import { formatDistance } from '@/lib/utils';
import type { Location, TargetLocation } from '@/types/location';

interface TargetHeroProps {
  target: TargetLocation;
  locations: Location[];
  onTargetChange: (target: TargetLocation) => void;
  onResetDefault?: () => void;
  /** 是否为自定义目标（非默认），决定是否显示「恢复默认」 */
  isCustom?: boolean;
}

/**
 * Hero 卡片 —— 把「目标地点」「更换中心」「数据概览」整合成一张视觉中枢卡。
 * - 默认：卡片态展示信息 + 「更换中心」按钮
 * - 展开：原地变形为搜索输入框（不弹模态）
 */
export default function TargetHero({
  target,
  locations,
  onTargetChange,
  onResetDefault,
  isCustom = false,
}: TargetHeroProps) {
  const [editing, setEditing] = useState(false);

  // 距离统计
  const distances = locations.map((l) => l.distance);
  const nearest = distances.length ? Math.min(...distances) : 0;
  const farthest = distances.length ? Math.max(...distances) : 0;
  const avg =
    distances.length
      ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length)
      : 0;

  return (
    <div className="relative bg-white border-b border-slate-100 px-5 pt-5 pb-4">
      {/* 头部：徽章 + 标签 */}
      <div className="flex items-center gap-2 mb-3">
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
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            自定义
          </span>
        )}
      </div>

      {!editing ? (
        <>
          {/* 主显：目标名 + 操作 */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex-1 min-w-0 text-xl font-semibold text-slate-900 leading-tight truncate">
              {target.name}
            </h2>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <Replace className="w-3.5 h-3.5" strokeWidth={2.5} />
              更换
            </button>
          </div>

          {/* 数据概览 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="最近" value={formatDistance(nearest)} tone="near" />
            <Stat label="平均" value={formatDistance(avg)} tone="mid" />
            <Stat label="最远" value={formatDistance(farthest)} tone="far" />
          </div>

          {/* 次要操作 */}
          {isCustom && onResetDefault && (
            <button
              onClick={onResetDefault}
              className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2} />
              恢复默认（隆昊·昊天园）
            </button>
          )}
        </>
      ) : (
        <TargetSearchInput
          onClose={() => setEditing(false)}
          onTargetChange={(t) => {
            onTargetChange(t);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'near' | 'mid' | 'far';
}) {
  const colorMap = {
    near: 'text-emerald-600',
    mid: 'text-amber-600',
    far: 'text-rose-600',
  };
  return (
    <div className="px-3 py-2 bg-slate-50 rounded-xl">
      <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
      <div
        className={`text-base font-semibold tabular-nums leading-tight mt-0.5 ${colorMap[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}
