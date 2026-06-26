'use client';

import { useState, useEffect } from 'react';
import type { TargetLocation } from '@/types/location';

interface TargetSearchInputProps {
  currentTarget: TargetLocation;
  onTargetChange: (target: TargetLocation) => void;
}

interface Suggestion {
  name: string;
  address: string;
  location: [number, number];
}

export default function TargetSearchInput({
  currentTarget,
  onTargetChange,
}: TargetSearchInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 实时获取搜索建议
  useEffect(() => {
    if (!keyword.trim() || !isEditing) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const AMap = (window as any).AMap;
        if (!AMap) return;

        AMap.plugin('AMap.AutoComplete', () => {
          const autoComplete = new AMap.AutoComplete({
            city: '合肥',
          });

          autoComplete.search(keyword, (status: string, result: any) => {
            if (status === 'complete' && result.tips) {
              const validTips = result.tips
                .filter((tip: any) => tip.location && tip.location.lng)
                .slice(0, 5)
                .map((tip: any) => ({
                  name: tip.name,
                  address: tip.address || tip.district,
                  location: [tip.location.lng, tip.location.lat],
                }));
              setSuggestions(validTips);
            } else {
              setSuggestions([]);
            }
            setLoadingSuggestions(false);
          });
        });
      } catch (err) {
        console.error('获取建议失败:', err);
        setLoadingSuggestions(false);
      }
    }, 300); // 防抖300ms

    return () => clearTimeout(timer);
  }, [keyword, isEditing]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const newTarget: TargetLocation = {
      name: suggestion.name,
      lnglat: suggestion.location,
    };

    onTargetChange(newTarget);
    setIsEditing(false);
    setKeyword('');
    setSuggestions([]);
    setError(null);
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError('请输入地点名称或地址');
      return;
    }

    setLoading(true);
    setError(null);

    // 设置超时
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('未找到该地点，请从下拉建议中选择，或输入更详细的地址');
    }, 8000);

    try {
      const { geocodeAddress } = await import('@/lib/amap');
      const result = await geocodeAddress(keyword);

      clearTimeout(timeoutId);

      const newTarget: TargetLocation = {
        name: keyword,
        lnglat: result.lnglat,
      };

      onTargetChange(newTarget);
      setIsEditing(false);
      setKeyword('');
      setSuggestions([]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(err.message || '搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setKeyword('');
    setSuggestions([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length === 0) {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div>
      {!isEditing ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-500 mb-0.5">距离参照中心</div>
            <div className="text-lg font-semibold text-gray-900 truncate">{currentTarget.name}</div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
          >
            🔍 更换中心
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 mb-2">输入新的参照中心</div>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索地点、地址、POI..."
              autoFocus
              disabled={loading}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />

            {/* 搜索建议列表 */}
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-xs text-gray-500">{suggestion.address}</div>
                  </button>
                ))}
              </div>
            )}

            {/* 加载建议中 */}
            {loadingSuggestions && keyword && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                搜索中...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading || !keyword.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '搜索中...' : '确定'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="text-xs text-gray-500">
            提示：点击建议列表或按回车键搜索
          </div>
        </div>
      )}
    </div>
  );
}
