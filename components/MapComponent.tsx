'use client';

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Loader2, AlertCircle } from 'lucide-react';
import { loadAMap } from '@/lib/amap';
import { formatDistance } from '@/lib/utils';
import type { Location, TargetLocation } from '@/types/location';

interface MapComponentProps {
  locations: Location[];
  target: TargetLocation;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
}

// 距离语义色（与 DESIGN.md 对齐）
function toneColor(distance: number): { bg: string; ring: string } {
  if (distance < 3000) return { bg: '#10b981', ring: 'rgba(16,185,129,.35)' };
  if (distance < 8000) return { bg: '#f59e0b', ring: 'rgba(245,158,11,.35)' };
  return { bg: '#f43f5e', ring: 'rgba(244,63,94,.35)' };
}

// 默认编号标记（根据距离染色，更易识别远近）
function dotContent(id: number, distance: number) {
  const { bg } = toneColor(distance);
  return `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;background:${bg};color:#fff;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(15,23,42,.25);cursor:pointer;">${id}</div>`;
}

// 选中态标记（蓝色品牌色，最强视觉权重）
function activeDotContent(id: number) {
  return `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;border:3px solid #fff;border-radius:50%;box-shadow:0 6px 18px rgba(37,99,235,.55);cursor:pointer;">${id}</div>`;
}

// 目标地点标记（红色水滴 + 居中圆点）
const TARGET_MARKER_HTML = `
<div style="position:relative;width:0;height:0;">
  <div style="position:absolute;left:-15px;top:-36px;width:30px;height:30px;background:linear-gradient(135deg,#ef4444,#dc2626);border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(220,38,38,.45);"></div>
  <div style="position:absolute;left:-5px;top:-27px;width:10px;height:10px;background:#fff;border-radius:50%;"></div>
</div>`;

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
  const userMarkerRef = useRef<any>(null);
  const infoWindowTimerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

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

    // 全局复制函数
    (window as any).__copyLocationName = (name: string) => {
      const flip = (btn: HTMLButtonElement | null) => {
        if (!btn) return;
        btn.textContent = '✓ 已复制';
        btn.style.background = '#16a34a';
        btn.style.color = '#fff';
        btn.style.borderColor = '#16a34a';
        setTimeout(() => {
          btn.textContent = '复制地点名称';
          btn.style.background = '#fff';
          btn.style.color = '#2563eb';
          btn.style.borderColor = '#dbeafe';
        }, 2000);
      };
      const btn = document.querySelector(
        'button[data-action="copy"]'
      ) as HTMLButtonElement;
      navigator.clipboard.writeText(name).then(
        () => flip(btn),
        () => {
          // 降级：execCommand
          try {
            const ta = document.createElement('textarea');
            ta.value = name;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            flip(btn);
          } catch {
            alert('复制失败，请手动复制');
          }
        }
      );
    };

    let destroyed = false;
    // 在 effect 顶部缓存 ref，避免 cleanup 时引用变化的 lint 警告
    const markerStore = markerMapRef.current;
    const circleStore = circleMapRef.current;

    loadAMap({
      key: apiKey,
      plugins: [
        'AMap.Geocoder',
        'AMap.AutoComplete',
        'AMap.Scale',
        'AMap.ToolBar',
      ],
    })
      .then((AMap) => {
        if (destroyed || !mapContainerRef.current) return;

        const map = new AMap.Map(mapContainerRef.current, {
          center: target.lnglat,
          zoom: 12,
          viewMode: '2D',
          mapStyle: 'amap://styles/normal',
        });
        mapRef.current = map;

        // 缩放/比例尺控件（右下角的官方控件）
        try {
          map.addControl(new AMap.Scale({ position: 'LB' }));
          map.addControl(
            new AMap.ToolBar({
              position: 'RT',
              offset: [12, 12],
              liteStyle: true,
            })
          );
        } catch {}

        const infoWindow = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -18),
          isCustom: false,
          closeWhenClickMap: true,
        });
        infoWindowRef.current = infoWindow;

        // 目标地点
        const targetMarker = new AMap.Marker({
          position: target.lnglat,
          zIndex: 300,
          content: TARGET_MARKER_HTML,
          offset: new AMap.Pixel(0, 0),
        });
        targetMarker.setMap(map);

        const allMarkers = [targetMarker];

        locations.forEach((loc) => {
          const { bg, ring } = toneColor(loc.distance);
          const circle = new AMap.Circle({
            center: loc.lnglat,
            radius: loc.radius,
            strokeColor: bg,
            strokeOpacity: 0.35,
            strokeWeight: 1,
            fillColor: bg,
            fillOpacity: 0.06,
            bubble: true,
          });
          circle.setMap(map);
          circleMapRef.current.set(loc.id, circle);

          const marker = new AMap.Marker({
            position: loc.lnglat,
            title: `${loc.id}. ${loc.name}`,
            content: dotContent(loc.id, loc.distance),
            offset: new AMap.Pixel(-13, -13),
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
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markerStore.clear();
      circleStore.clear();
      delete (window as any).__copyLocationName;
    };
  }, [locations, target, onLocationClick]);

  // 选中态：高亮 + 平移 + 延迟弹窗
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const AMap = (window as any).AMap;

    if (infoWindowTimerRef.current) {
      clearTimeout(infoWindowTimerRef.current);
      infoWindowTimerRef.current = null;
    }

    // 重置
    markerMapRef.current.forEach((marker, id) => {
      const loc = locations.find((l) => l.id === id);
      if (!loc) return;
      marker.setContent(dotContent(id, loc.distance));
      marker.setOffset(new AMap.Pixel(-13, -13));
      marker.setzIndex(100);
    });
    circleMapRef.current.forEach((circle, id) => {
      const loc = locations.find((l) => l.id === id);
      if (!loc) return;
      const { bg } = toneColor(loc.distance);
      circle.setOptions({
        strokeColor: bg,
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: bg,
        fillOpacity: 0.06,
      });
    });

    if (!selectedLocation) {
      infoWindowRef.current?.close();
      return;
    }

    const { id, lnglat } = selectedLocation;

    const marker = markerMapRef.current.get(id);
    if (marker) {
      marker.setContent(activeDotContent(id));
      marker.setOffset(new AMap.Pixel(-18, -18));
      marker.setzIndex(250);
    }
    const circle = circleMapRef.current.get(id);
    if (circle) {
      circle.setOptions({
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.15,
      });
    }

    map.setZoom(15);
    map.panTo(lnglat, 600);

    const currentId = id;
    infoWindowTimerRef.current = setTimeout(() => {
      if (infoWindowRef.current && selectedLocation?.id === currentId) {
        const loc = selectedLocation;
        const safeName = loc.name.replace(/'/g, "\\'");
        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,-apple-system,system-ui,sans-serif;padding:14px 16px 13px;width:248px;box-sizing:border-box;background:#fff;">
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding-right:24px;">
              <span style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#2563eb;color:#fff;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;border-radius:50%;">${loc.id}</span>
              <span style="flex:1;font-weight:600;font-size:14px;color:#0f172a;line-height:1.4;word-break:break-all;">${loc.name}</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-bottom:8px;">${loc.address}</div>
            <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#eff6ff;border-radius:8px;font-size:12px;color:#1e3a8a;white-space:nowrap;">
              <span>距离</span>
              <b style="font-variant-numeric:tabular-nums;color:#2563eb;font-weight:700;">${formatDistance(loc.distance)}</b>
              <span style="color:#cbd5e1;">·</span>
              <span style="color:#475569;">范围 ${loc.radius} 米</span>
            </div>
            <button
              data-action="copy"
              onclick="window.__copyLocationName('${safeName}')"
              style="margin-top:10px;width:100%;padding:8px 10px;font-size:12px;font-weight:600;color:#2563eb;background:#fff;border:1px solid #dbeafe;border-radius:8px;cursor:pointer;transition:all .15s;"
              onmouseover="if(this.getAttribute('data-action')==='copy'&&this.textContent==='复制地点名称'){this.style.background='#eff6ff'}"
              onmouseout="if(this.textContent==='复制地点名称'){this.style.background='#fff'}"
            >复制地点名称</button>
          </div>
        `);
        infoWindowRef.current.open(map, loc.lnglat);
      }
      infoWindowTimerRef.current = null;
    }, 650);
  }, [selectedLocation, target, locations]);

  // 定位
  const handleLocate = () => {
    const map = mapRef.current;
    if (!map || locating) return;
    if (!navigator.geolocation) {
      setLocateError('浏览器不支持定位');
      return;
    }
    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const lnglat: [number, number] = [longitude, latitude];
        const AMap = (window as any).AMap;

        if (userMarkerRef.current) userMarkerRef.current.setMap(null);

        const userMarker = new AMap.Marker({
          position: lnglat,
          zIndex: 200,
          content: `<div style="position:relative;width:0;height:0;">
            <div style="position:absolute;left:-22px;top:-22px;width:44px;height:44px;background:rgba(59,130,246,.18);border-radius:50%;animation:pulse 2s infinite;"></div>
            <div style="position:absolute;left:-9px;top:-9px;width:18px;height:18px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(59,130,246,.6);"></div>
          </div>`,
          offset: new AMap.Pixel(0, 0),
        });
        userMarker.setMap(map);
        userMarkerRef.current = userMarker;

        map.setZoom(15);
        map.panTo(lnglat, 600);

        const tp = new AMap.LngLat(target.lnglat[0], target.lnglat[1]);
        const up = new AMap.LngLat(longitude, latitude);
        const distance = Math.round(tp.distance(up));

        setTimeout(() => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family:Inter,-apple-system,system-ui,sans-serif;padding:14px 16px;width:200px;box-sizing:border-box;background:#fff;">
                <div style="font-weight:600;font-size:13px;color:#1e40af;margin-bottom:4px;padding-right:24px;">📍 我的位置</div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">已使用浏览器定位</div>
                <div style="padding:8px 10px;background:#eff6ff;border-radius:8px;font-size:12px;color:#1e40af;white-space:nowrap;">
                  距 ${target.name} <b style="font-variant-numeric:tabular-nums;">${formatDistance(distance)}</b>
                </div>
              </div>
            `);
            infoWindowRef.current.open(map, lnglat);
          }
        }, 650);

        setLocating(false);
      },
      (err) => {
        let msg = '定位失败';
        if (err.code === 1) msg = '已拒绝定位权限';
        else if (err.code === 2) msg = '位置信息不可用';
        else if (err.code === 3) msg = '定位超时';
        setLocateError(msg);
        setLocating(false);
        setTimeout(() => setLocateError(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-center px-6 max-w-xs">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertCircle
              className="w-7 h-7 text-rose-500"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-sm font-medium text-slate-900">{error}</p>
          <p className="text-xs text-slate-500 mt-1">
            请刷新页面或检查地图配置
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 浮层控件 */}
      {!loading && (
        <>
          {/* 定位按钮（玻璃质感胶囊） */}
          <button
            onClick={handleLocate}
            disabled={locating}
            aria-label="定位到我的位置"
            className="absolute right-4 z-20 inline-flex items-center justify-center gap-2 px-3.5 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-card border border-slate-200/60 hover:bg-white hover:shadow-elevated active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              // 移动端贴底（留安全区），PC 端由下方媒体查询覆盖
              bottom: 'calc(var(--safe-bottom, 0px) + 24px)',
            }}
          >
            {locating ? (
              <>
                <Loader2
                  className="w-4 h-4 text-brand-600 animate-spin"
                  strokeWidth={2.5}
                />
                <span className="text-[13px] font-medium text-slate-700">
                  定位中
                </span>
              </>
            ) : (
              <>
                <LocateFixed
                  className="w-4 h-4 text-brand-600"
                  strokeWidth={2.25}
                />
                <span className="text-[13px] font-medium text-slate-700">
                  我的位置
                </span>
              </>
            )}
          </button>

          {/* PC 端把按钮放右下、不挤压 BottomSheet 区域：用 CSS 媒体查询单独定位 */}
          <style>{`
            @media (min-width: 1024px) {
              [aria-label="定位到我的位置"] { bottom: 24px !important; }
            }
          `}</style>

          {/* 定位错误提示（toast 风格） */}
          {locateError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white text-sm font-medium rounded-full shadow-elevated">
                <AlertCircle className="w-4 h-4" strokeWidth={2.5} />
                {locateError}
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">地图加载中…</p>
          </div>
        </div>
      )}
    </div>
  );
}
