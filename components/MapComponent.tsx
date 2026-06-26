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

export default function MapComponent({
  locations,
  target,
  selectedLocation,
  onLocationClick,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerMapRef = useRef<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化地图并一次性渲染所有标记（坐标已预编码，无需运行时地理编码）
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

        // 目标地点（红色水滴标记）
        const targetMarker = new AMap.Marker({
          position: target.lnglat,
          zIndex: 200,
          content:
            '<div style="position:relative;width:0;height:0;"><div style="position:absolute;left:-13px;top:-30px;width:26px;height:26px;background:#ef4444;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div></div>',
          offset: new AMap.Pixel(0, 0),
        });
        targetMarker.setMap(map);

        // 所有地点标记（蓝色圆点）
        const allMarkers = [targetMarker];
        locations.forEach((loc) => {
          const marker = new AMap.Marker({
            position: loc.lnglat,
            title: `${loc.name}（距目标 ${formatDistance(loc.distance)}）`,
            content:
              '<div style="width:16px;height:16px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(59,130,246,.6);cursor:pointer;"></div>',
            offset: new AMap.Pixel(-8, -8),
          });
          marker.on('click', () => onLocationClick(loc));
          marker.setMap(map);
          markerMapRef.current.set(loc.name, marker);
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
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markers.clear();
    };
  }, [locations, target, onLocationClick]);

  // 选中地点时居中并放大
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    mapRef.current.setZoomAndCenter(15, selectedLocation.lnglat);

    // 选中标记放大高亮
    markerMapRef.current.forEach((marker, name) => {
      const isActive = name === selectedLocation.name;
      marker.setContent(
        isActive
          ? '<div style="width:22px;height:22px;background:#1d4ed8;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(29,78,216,.7);cursor:pointer;"></div>'
          : '<div style="width:16px;height:16px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(59,130,246,.6);cursor:pointer;"></div>'
      );
      marker.setOffset(
        new (window as any).AMap.Pixel(isActive ? -11 : -8, isActive ? -11 : -8)
      );
    });
  }, [selectedLocation]);

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
