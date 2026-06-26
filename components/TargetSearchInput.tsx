'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2, AlertCircle } from 'lucide-react';
import type { TargetLocation } from '@/types/location';

interface Suggestion {
  name: string;
  address: string;
  location: [number, number];
}

interface TargetSearchInputProps {
  /** 关闭时回调（点击外部 / Esc / 选中后） */
  onClose: () => void;
  onTargetChange: (target: TargetLocation) => void;
}

/**
 * 内联展开的搜索输入框 —— 由 Hero 卡片以 inline 形式承载。
 * - 实时 POI 建议（高德 AutoComplete，防抖 300ms）
 * - 键盘 ↑↓ 选择、Enter 确认、Esc 关闭
 * - 错误以 inline 提示，不打断流程
 */
export default function TargetSearchInput({
  onClose,
  onTargetChange,
}: TargetSearchInputProps) {
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

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
      // 优先用第一条建议（更准）
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
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="animate-fade-in-up">
      {/* 输入框 */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none"
          strokeWidth={2}
        />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索地点、地址、POI…"
          autoFocus
          disabled={loading}
          className="w-full pl-11 pr-11 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl shadow-soft focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:bg-slate-50"
        />
        {keyword && !loading && (
          <button
            onClick={() => setKeyword('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="清空搜索"
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

      {/* 建议列表 / 错误提示 */}
      {(suggestions.length > 0 ||
        loadingSuggestions ||
        error ||
        (keyword && !loading && suggestions.length === 0)) && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
          {error ? (
            <div className="px-4 py-3 flex items-start gap-2.5 text-sm text-rose-700 bg-rose-50">
              <AlertCircle
                className="w-4 h-4 mt-0.5 shrink-0"
                strokeWidth={2.5}
              />
              <span>{error}</span>
            </div>
          ) : loadingSuggestions ? (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              <span>搜索中…</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul role="listbox">
              {suggestions.map((s, i) => {
                const active = i === activeIndex;
                return (
                  <li key={i} role="option" aria-selected={active}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => selectSuggestion(s)}
                      className={`w-full px-4 py-2.5 text-left flex items-start gap-3 transition-colors border-l-2 ${
                        active
                          ? 'bg-brand-50 border-brand-500'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
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
              未找到匹配建议，按 Enter 直接搜索
            </div>
          ) : null}
        </div>
      )}

      {/* 键盘提示（极弱视觉权重） */}
      <div className="mt-2 px-1 text-[11px] text-slate-400 flex items-center gap-3">
        <span>
          <kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">
            ↑↓
          </kbd>{' '}
          切换
        </span>
        <span>
          <kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">
            Enter
          </kbd>{' '}
          确认
        </span>
        <span>
          <kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">
            Esc
          </kbd>{' '}
          关闭
        </span>
      </div>
    </div>
  );
}
