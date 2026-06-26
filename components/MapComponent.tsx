'use client';

import { useEffect, useRef, useState } from 'react';
import { loadAMap } from '@/lib/amap';
import { formatDistance } from '@/lib/utils';
import type { Location, TargetLocation } from '@/types/location';

interface MapComponentProps {
  locations: Location[];
  target: TargetLocation;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
}

// 普通编号标记样式（蓝色圆牌）
function dotContent(id: number) {
  return `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#1677ff;color:#fff;font-size:12px;font-weight:600;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(22,119,255,.4);cursor:pointer;">${id}</div>`;
}

// 选中态标记样式（放大 + 绿色）
function activeDotContent(id: number) {
  return `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#16a34a;color:#fff;font-size:15px;font-weight:700;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 14px rgba(22,163,74,.6);cursor:pointer;">${id}</div>`;
}

export default function MapComponent({
  locations,
  target,
  selectedLocation,
  onLocationClick,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerMapRef = useRef<Map<number, any>>(new Map());
  const circleMapRef = useRef<Map<number, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null); // 用户位置标记
  const infoWindowTimerRef = useRef<any>(null); // 信息窗延迟打开的定时器
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false); // 正在定位
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY;
    const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

    if (!apiKey) {
      setError('地图服务暂未配置');
      setLoading(false);
      return;
    }

    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode };
    }

    // 定义全局复制函数（InfoWindow 的 onclick 调用）
    (window as any).__copyLocationName = (name: string) => {
      navigator.clipboard.writeText(name).then(
        () => {
          // 复制成功，更新按钮文字反馈
          const btn = document.querySelector('.amap-info-window button') as HTMLButtonElement;
          if (btn) {
            const original = btn.textContent;
            btn.textContent = '已复制';
            btn.style.color = '#16a34a';
            btn.style.background = '#dcfce7';
            setTimeout(() => {
              btn.textContent = original || '复制';
              btn.style.color = '#16a34a';
              btn.style.background = '#f0fdf4';
            }, 1200);
          }
        },
        (err) => {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
        }
      );
    };

    let destroyed = false;

    loadAMap({ key: apiKey })
      .then((AMap) => {
        if (destroyed || !mapContainerRef.current) return;

        const map = new AMap.Map(mapContainerRef.current, {
          center: target.lnglat,
          zoom: 12,
          viewMode: '2D',
        });
        mapRef.current = map;

        const infoWindow = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -16),
          isCustom: false,
        });
        infoWindowRef.current = infoWindow;

        // 目标地点（红色水滴标记）
        const targetMarker = new AMap.Marker({
          position: target.lnglat,
          zIndex: 300,
          content:
            '<div style="position:relative;width:0;height:0;"><div style="position:absolute;left:-15px;top:-34px;width:30px;height:30px;background:#ef4444;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div><div style="position:absolute;left:-9px;top:-28px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">★</div></div>',
          offset: new AMap.Pixel(0, 0),
        });
        targetMarker.setMap(map);

        const allMarkers = [targetMarker];

        locations.forEach((loc) => {
          // 200/1000 米范围圈
          const circle = new AMap.Circle({
            center: loc.lnglat,
            radius: loc.radius,
            strokeColor: '#1677ff',
            strokeOpacity: 0.4,
            strokeWeight: 1,
            fillColor: '#1677ff',
            fillOpacity: 0.08,
            bubble: true,
          });
          circle.setMap(map);
          circleMapRef.current.set(loc.id, circle);

          // 编号标记
          const marker = new AMap.Marker({
            position: loc.lnglat,
            title: `${loc.id}. ${loc.name}`,
            content: dotContent(loc.id),
            offset: new AMap.Pixel(-12, -12),
            zIndex: 100,
          });
          marker.on('click', () => onLocationClick(loc));
          marker.setMap(map);
          markerMapRef.current.set(loc.id, marker);
          allMarkers.push(marker);
        });

        map.setFitView(allMarkers, false, [60, 60, 60, 60]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('地图加载失败:', err);
        setError('地图加载失败，请刷新重试');
        setLoading(false);
      });

    return () => {
      destroyed = true;
      const markers = markerMapRef.current;
      const circles = circleMapRef.current;
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markers.clear();
      circles.clear();
      // 清理全局复制函数
      delete (window as any).__copyLocationName;
    };
  }, [locations, target, onLocationClick]);

  // 选中地点：居中、放大标记、弹出详情、高亮圆圈
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const AMap = (window as any).AMap;

    // 清除之前的信息窗延迟任务（避免快速切换时打开旧信息窗）
    if (infoWindowTimerRef.current) {
      clearTimeout(infoWindowTimerRef.current);
      infoWindowTimerRef.current = null;
    }

    // 重置所有标记与圆圈样式
    markerMapRef.current.forEach((marker, id) => {
      marker.setContent(dotContent(id));
      marker.setOffset(new AMap.Pixel(-12, -12));
      marker.setzIndex(100);
    });
    circleMapRef.current.forEach((circle) => {
      circle.setOptions({
        strokeColor: '#1677ff',
        strokeOpacity: 0.4,
        strokeWeight: 1,
        fillColor: '#1677ff',
        fillOpacity: 0.08,
      });
    });

    if (!selectedLocation) {
      infoWindowRef.current?.close();
      return;
    }

    const { id, name, address, radius, distance, lnglat } = selectedLocation;

    // 高亮选中标记
    const marker = markerMapRef.current.get(id);
    if (marker) {
      marker.setContent(activeDotContent(id));
      marker.setOffset(new AMap.Pixel(-17, -17));
      marker.setzIndex(250);
    }
    // 高亮选中圆圈
    const circle = circleMapRef.current.get(id);
    if (circle) {
      circle.setOptions({
        strokeColor: '#16a34a',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.15,
      });
    }

    // 平滑平移并放大到选中地点（600ms 动画）
    map.setZoom(15);
    map.panTo(lnglat, 600);

    // 延迟打开信息窗，等待平移动画完成，避免信息窗的自动调整干扰动画
    const currentId = id; // 捕获当前 id 用于对比
    infoWindowTimerRef.current = setTimeout(() => {
      // 再次检查是否还是当前选中的地点（防止快速切换时打开旧信息窗）
      if (infoWindowRef.current && selectedLocation?.id === currentId) {
        const loc = selectedLocation;
        infoWindowRef.current.setContent(
          `<div style="position:relative;padding:4px 6px;min-width:160px;line-height:1.6;">
            <div style="font-weight:600;font-size:14px;color:#1f2937;margin-bottom:4px;padding-right:50px;">${loc.id}. ${loc.name}</div>
            <button
              onclick="window.__copyLocationName('${loc.name.replace(/'/g, "\\'")}')"
              style="position:absolute;top:2px;right:2px;padding:4px 8px;font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #16a34a;border-radius:4px;cursor:pointer;font-weight:500;transition:all 0.2s;"
              onmouseover="this.style.background='#dcfce7'"
              onmouseout="this.style.background='#f0fdf4'"
            >复制</button>
            <div style="font-size:12px;color:#6b7280;">${loc.address}</div>
            <div style="font-size:12px;color:#1677ff;margin-top:4px;">距${target.name} <b>${formatDistance(loc.distance)}</b> · 范围${loc.radius}米</div>
          </div>`
        );
        infoWindowRef.current.open(map, loc.lnglat);
      }
      infoWindowTimerRef.current = null;
    }, 650); // 比 panTo 动画稍长一点，确保动画完成
  }, [selectedLocation, target.name]);

  // 定位到当前位置
  const handleLocate = () => {
    const map = mapRef.current;
    if (!map || locating) return;

    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位功能');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const lnglat: [number, number] = [longitude, latitude];
        setUserLocation(lnglat);

        const AMap = (window as any).AMap;

        // 移除旧的用户位置标记
        if (userMarkerRef.current) {
          userMarkerRef.current.setMap(null);
        }

        // 添加用户位置标记（蓝色圆点）
        const userMarker = new AMap.Marker({
          position: lnglat,
          zIndex: 200,
          content: `<div style="position:relative;width:0;height:0;">
            <div style="position:absolute;left:-10px;top:-10px;width:20px;height:20px;background:#1677ff;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(22,119,255,.5);"></div>
            <div style="position:absolute;left:-15px;top:-15px;width:30px;height:30px;background:rgba(22,119,255,.15);border-radius:50%;animation:pulse 2s infinite;"></div>
          </div>`,
          offset: new AMap.Pixel(0, 0),
        });
        userMarker.setMap(map);
        userMarkerRef.current = userMarker;

        // 平滑平移到用户位置
        map.setZoom(15);
        map.panTo(lnglat, 600);

        // 计算到目标地点的距离
        const targetPos = new AMap.LngLat(target.lnglat[0], target.lnglat[1]);
        const userPos = new AMap.LngLat(longitude, latitude);
        const distance = Math.round(targetPos.distance(userPos));

        // 延迟打开信息窗，等待平移动画完成
        setTimeout(() => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(
              `<div style="padding:6px 8px;min-width:140px;line-height:1.5;">
                <div style="font-weight:600;font-size:13px;color:#1677ff;margin-bottom:3px;">📍 我的位置</div>
                <div style="font-size:12px;color:#1677ff;">距${target.name} <b>${formatDistance(distance)}</b></div>
              </div>`
            );
            infoWindowRef.current.open(map, lnglat);
          }
        }, 650);

        setLocating(false);
      },
      (err) => {
        console.error('定位失败:', err);
        let msg = '定位失败';
        if (err.code === 1) msg = '定位权限被拒绝';
        else if (err.code === 2) msg = '位置信息不可用';
        else if (err.code === 3) msg = '定位超时';
        alert(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <p className="text-gray-700 mb-1 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 定位按钮 */}
      {!loading && (
        <button
          onClick={handleLocate}
          disabled={locating}
          className="absolute bottom-6 right-6 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
          title="定位到我的位置"
        >
          {locating ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
