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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // 居中并弹出信息窗
    map.setZoomAndCenter(15, lnglat);
    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(
        `<div style="position:relative;padding:4px 6px;min-width:160px;line-height:1.6;">
          <div style="font-weight:600;font-size:14px;color:#1f2937;margin-bottom:4px;padding-right:50px;">${id}. ${name}</div>
          <button
            onclick="window.__copyLocationName('${name.replace(/'/g, "\\'")}')"
            style="position:absolute;top:2px;right:2px;padding:4px 8px;font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #16a34a;border-radius:4px;cursor:pointer;font-weight:500;transition:all 0.2s;"
            onmouseover="this.style.background='#dcfce7'"
            onmouseout="this.style.background='#f0fdf4'"
          >复制</button>
          <div style="font-size:12px;color:#6b7280;">${address}</div>
          <div style="font-size:12px;color:#1677ff;margin-top:4px;">距${target.name} <b>${formatDistance(distance)}</b> · 范围${radius}米</div>
        </div>`
      );
      infoWindowRef.current.open(map, lnglat);
    }
  }, [selectedLocation, target.name]);

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
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
