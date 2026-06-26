'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Navigation2 } from 'lucide-react'

type LocationItem = {
  id: number
  city: string
  name: string
  originalAddress: string
  displayAddress: string
  radius: number
  status: 'ok' | 'failed'
  location: null | { lng:number; lat:number; formattedAddress:string; level:string }
  distanceMeter: number | null
  drivingDistanceMeter: number | null
  drivingDurationSecond: number | null
}

type DataShape = {
  home: { name:string; displayAddress:string; location:{lng:number;lat:number} }
  locations: LocationItem[]
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

function km(m?: number | null) {
  if (m == null) return '—'
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

function minutes(s?: number | null) {
  if (s == null) return '—'
  return `${Math.max(1, Math.round(s / 60))} 分钟`
}

export default function Page() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapIns = useRef<any>(null)
  const markers = useRef<Record<number, any>>({})
  const [data, setData] = useState<DataShape | null>(null)
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState('all')
  const [active, setActive] = useState<LocationItem | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/locations')
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || '数据加载失败')
        return body
      })
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!data || !mapRef.current) return
    const jsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY
    const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE
    if (!jsKey || !securityCode) {
      setError('地图展示服务暂未配置，请联系管理员。')
      return
    }
    window._AMapSecurityConfig = { securityJsCode: securityCode }

    import('@amap/amap-jsapi-loader').then(({ default: AMapLoader }) => {
      return AMapLoader.load({
        key: jsKey,
        version: '2.0',
        plugins: ['AMap.MarkerCluster']
      })
    }).then((AMap) => {
      const map = new AMap.Map(mapRef.current!, {
        center: [data.home.location.lng, data.home.location.lat],
        zoom: 12,
        viewMode: '2D',
        mapStyle: 'amap://styles/whitesmoke'
      })
      mapIns.current = map

      const homeMarker = new AMap.Marker({
        position: [data.home.location.lng, data.home.location.lat],
        content: '<div class="homeMarker">隆昊昊天园</div>',
        offset: new AMap.Pixel(-44, -18)
      })
      homeMarker.setMap(map)

      const mapMarkers:any[] = []
      data.locations.filter(x => x.status === 'ok' && x.location).forEach((item) => {
        const marker = new AMap.Marker({
          position: [item.location!.lng, item.location!.lat],
          title: item.name,
          content: `<div class="pin"><span>${item.id}</span></div>`,
          offset: new AMap.Pixel(-13, -24)
        })
        marker.on('click', () => {
          setActive(item)
          map.setZoomAndCenter(15, [item.location!.lng, item.location!.lat])
        })
        marker.setMap(map)
        markers.current[item.id] = marker
        mapMarkers.push(marker)

        new AMap.Circle({
          center: [item.location!.lng, item.location!.lat],
          radius: item.radius,
          strokeColor: '#a57a3e',
          strokeOpacity: 0.28,
          strokeWeight: 1,
          fillColor: '#a57a3e',
          fillOpacity: 0.06
        }).setMap(map)
      })
      if (mapMarkers.length) map.setFitView([homeMarker, ...mapMarkers], false, [80, 80, 80, 460])
      setActive(data.locations.find(x => x.status === 'ok') || null)
    }).catch(() => setError('地图加载失败，请稍后重试。'))
  }, [data])

  const list = useMemo(() => {
    if (!data) return []
    return data.locations.filter(item => {
      const matchKeyword = !keyword || item.name.includes(keyword) || item.displayAddress.includes(keyword)
      const d = item.drivingDistanceMeter ?? item.distanceMeter ?? Infinity
      const matchRange = range === 'all' || d <= Number(range) * 1000
      return matchKeyword && matchRange
    })
  }, [data, keyword, range])

  function focus(item: LocationItem) {
    setActive(item)
    if (item.location && mapIns.current) {
      mapIns.current.setZoomAndCenter(15, [item.location.lng, item.location.lat])
      markers.current[item.id]?.emit('click', { target: markers.current[item.id] })
    }
  }

  const okCount = data?.locations.filter(x => x.status === 'ok').length || 0
  const within15 = data?.locations.filter(x => (x.drivingDistanceMeter ?? x.distanceMeter ?? Infinity) <= 15000).length || 0

  return (
    <main className="app">
      <aside className="sidebar">
        <section className="hero">
          <div className="eyebrow">HEFEI COMMUTE ATLAS</div>
          <h1 className="title">合肥地点通勤分析</h1>
          <p className="subtitle">以隆昊昊天园为中心，查看地点分布、覆盖半径与通勤距离。列表始终展示原始地址，定位过程仅做内部清洗。</p>
          <div className="pill"><Navigation2 size={14}/> 基准点：隆昊昊天园</div>
        </section>

        <div className="stats">
          <div className="stat"><b>{data?.locations.length || 0}</b><span>原始地点</span></div>
          <div className="stat"><b>{okCount}</b><span>已定位</span></div>
          <div className="stat"><b>{within15}</b><span>15km内</span></div>
        </div>

        <div className="toolbar">
          <input className="search" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索地点 / 原始地址" />
          <select className="select" value={range} onChange={e => setRange(e.target.value)}>
            <option value="all">全部距离</option>
            <option value="5">5km 内</option>
            <option value="10">10km 内</option>
            <option value="15">15km 内</option>
            <option value="20">20km 内</option>
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <section className="list">
          {list.map(item => (
            <article key={item.id} onClick={() => focus(item)} className={`card ${active?.id === item.id ? 'active' : ''}`}>
              <div className="cardTop">
                <div>
                  <div className="name">{item.name}</div>
                  <div className="addr">{item.originalAddress}</div>
                </div>
                <div className="dist">
                  <b>{km(item.drivingDistanceMeter ?? item.distanceMeter)}</b>
                  <span>{item.drivingDistanceMeter ? '驾车距离' : '直线距离'}</span>
                </div>
              </div>
              <div className="tags">
                <span className="tag">覆盖 {item.radius}m</span>
                <span className="tag">驾车 {minutes(item.drivingDurationSecond)}</span>
                <span className="tag">直线 {km(item.distanceMeter)}</span>
                {item.status !== 'ok' && <span className="tag">待校验</span>}
              </div>
            </article>
          ))}
          {!list.length && <div className="empty">暂无匹配地点</div>}
        </section>
      </aside>

      <section className="mapWrap">
        <div className="mapCard">
          <div ref={mapRef} className="map" />
          {!data && !error && <div className="loading">正在生成地点图谱…</div>}
        </div>
        {active && (
          <div className="detail">
            <h3><MapPin size={18}/> {active.name}</h3>
            <p>{active.originalAddress}</p>
            <div className="detailGrid">
              <div className="metric"><span>驾车距离</span><b>{km(active.drivingDistanceMeter)}</b></div>
              <div className="metric"><span>预计耗时</span><b>{minutes(active.drivingDurationSecond)}</b></div>
              <div className="metric"><span>直线距离</span><b>{km(active.distanceMeter)}</b></div>
              <div className="metric"><span>覆盖范围</span><b>{active.radius}m</b></div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
