'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Loader2,
  AlertCircle,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import type { TargetLocation } from '@/types/location';

interface Suggestion {
  name: string;
  address: string;
  location: [number, number];
}

interface TargetSearchModalProps {
  open: boolean;
  currentTarget: TargetLocation;
  isCustom: boolean;
  onClose: () => void;
  onTargetChange: (target: TargetLocation) => void;
  onResetDefault: () => void;
}

/**
 * 「更换参照中心」独立弹层。
 * - 全屏覆盖（移动）/ 居中卡片（桌面），任何时刻界面上仅此一个搜索输入框，
 *   彻底避免与列表筛选框并存造成的双输入框问题。
 * - 实时 POI 建议（高德 AutoComplete，防抖 300ms）
 * - 键盘 ↑↓ 选择、Enter 确认、Esc 关闭
 */
export default function TargetSearchModal({
  open,
  currentTarget,
  isCustom,
  onClose,
  onTargetChange,
  onResetDefault,
}: TargetSearchModalProps) {
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时重置 + 聚焦
  useEffect(() => {
    if (open) {
      setKeyword('');
      setSuggestions([]);
      setError(null);
      setActiveIndex(-1);
      // 延迟聚焦，等待入场动画
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 实时搜索建议
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    setLoadingSuggestions(true);
    const timer = setTimeout(() => {
      const AMap = (window as any).AMap;
      if (!AMap) {
        setLoadingSuggestions(false);
        return;
      }
      AMap.plugin('AMap.AutoComplete', () => {
        const autoComplete = new AMap.AutoComplete({ city: '合肥' });
        autoComplete.search(keyword, (status: string, result: any) => {
          if (status === 'complete' && result.tips) {
            const tips = result.tips
              .filter((tip: any) => tip.location && tip.location.lng)
              .slice(0, 6)
              .map((tip: any) => ({
                name: tip.name,
                address: tip.address || tip.district || '',
                location: [tip.location.lng, tip.location.lat] as [
                  number,
                  number
                ],
              }));
            setSuggestions(tips);
            setActiveIndex(tips.length > 0 ? 0 : -1);
          } else {
            setSuggestions([]);
            setActiveIndex(-1);
          }
          setLoadingSuggestions(false);
        });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const selectSuggestion = (s: Suggestion) => {
    onTargetChange({ name: s.name, lnglat: s.location });
    onClose();
  };

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    if (suggestions[0]) {
      selectSuggestion(suggestions[0]);
      return;
    }
    setLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('未找到该地点，请尝试更详细的地址');
    }, 8000);
    try {
      const { geocodeAddress } = await import('@/lib/amap');
      const result = await geocodeAddress(keyword);
      clearTimeout(timeoutId);
      onTargetChange({ name: keyword, lnglat: result.lnglat });
      onClose();
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(err.message || '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) =>
        suggestions.length === 0 ? -1 : (i + 1) % suggestions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        suggestions.length === 0
          ? -1
          : (i - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        handleSearch();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fade-in-up_200ms_ease-out]"
        onClick={onClose}
      />

      {/* 弹层卡片 */}
      <div className="relative w-full h-full sm:h-auto sm:max-w-lg sm:mt-24 sm:rounded-2xl bg-white sm:shadow-elevated flex flex-col animate-fade-in-up overflow-hidden">
        {/* 头部 */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0"
          style={{ paddingTop: 'max(0.875rem, var(--safe-top))' }}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
            <Crosshair
              className="w-[17px] h-[17px] text-brand-600"
              strokeWidth={2.25}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
              更换参照中心
            </h2>
            <p className="text-[11px] text-slate-500 leading-tight truncate">
              当前：{currentTarget.name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* 搜索输入 */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none"
              strokeWidth={2}
            />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索地点、地址、POI…"
              disabled={loading}
              className="w-full pl-11 pr-11 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none focus-visible:outline-none transition-all disabled:opacity-60"
            />
            {keyword && !loading && (
              <button
                onClick={() => {
                  setKeyword('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="清空"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
            {loading && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 animate-spin"
                strokeWidth={2}
              />
            )}
          </div>
        </div>

        {/* 建议 / 状态 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {error ? (
            <div className="mx-2 mt-1 px-4 py-3 flex items-start gap-2.5 text-sm text-rose-700 bg-rose-50 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.5} />
              <span>{error}</span>
            </div>
          ) : loadingSuggestions ? (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <span>搜索中…</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul role="listbox" className="py-1">
              {suggestions.map((s, i) => {
                const active = i === activeIndex;
                return (
                  <li key={i} role="option" aria-selected={active}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => selectSuggestion(s)}
                      className={`w-full px-3 py-2.5 text-left flex items-start gap-3 rounded-xl transition-colors ${
                        active ? 'bg-brand-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <MapPin
                        className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${
                          active ? 'text-brand-600' : 'text-slate-400'
                        }`}
                        strokeWidth={2}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {s.name}
                        </div>
                        {s.address && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {s.address}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : keyword ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              未找到匹配建议，按回车直接搜索
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-slate-400">
                输入任意地点，查看各处到它的距离
              </p>
            </div>
          )}
        </div>

        {/* 底部：恢复默认 */}
        {isCustom && (
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => {
                onResetDefault();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              恢复默认中心
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
