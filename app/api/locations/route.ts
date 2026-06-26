import { NextResponse } from 'next/server'
import rawLocations from '../../../data/locations.json'

type RawLocation = {
  id: number
  city: string
  name: string
  originalAddress: string
  displayAddress: string
  radius: number
  geoQuery: string
}

const HOME = {
  name: '隆昊昊天园',
  displayAddress: '隆昊昊天园',
  geoQuery: '安徽省合肥市隆昊昊天园'
}

const cache = new Map<string, any>()

function haversine(a: {lng:number;lat:number}, b: {lng:number;lat:number}) {
  const R = 6371000
  const toRad = (n:number) => n * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const v = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2
  return Math.round(2 * R * Math.asin(Math.sqrt(v)))
}

async function amapGet(path: string, params: Record<string,string>) {
  const key = process.env.AMAP_WEB_SERVICE_KEY
  if (!key) throw new Error('服务未配置地图密钥')
  const url = new URL(`https://restapi.amap.com/v3/${path}`)
  Object.entries({...params, key}).forEach(([k,v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 * 14 } })
  const data = await res.json()
  if (data.status !== '1') {
    throw new Error(data.info || '地图服务请求失败')
  }
  return data
}

async function geocode(address: string) {
  const cacheKey = `geo:${address}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const data = await amapGet('geocode/geo', { address, city: '合肥' })
  const geo = data.geocodes?.[0]
  if (!geo?.location) return null
  const [lng, lat] = geo.location.split(',').map(Number)
  const result = { lng, lat, formattedAddress: geo.formatted_address, level: geo.level }
  cache.set(cacheKey, result)
  return result
}

async function driving(origin: {lng:number;lat:number}, dest: {lng:number;lat:number}) {
  const cacheKey = `drive:${origin.lng},${origin.lat}-${dest.lng},${dest.lat}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const data = await amapGet('direction/driving', {
    origin: `${origin.lng},${origin.lat}`,
    destination: `${dest.lng},${dest.lat}`,
    extensions: 'base',
    strategy: '10'
  })
  const path = data.route?.paths?.[0]
  const result = path ? {
    drivingDistanceMeter: Number(path.distance),
    drivingDurationSecond: Number(path.duration)
  } : null
  cache.set(cacheKey, result)
  return result
}

export async function GET() {
  try {
    const homeGeo = await geocode(HOME.geoQuery)
    if (!homeGeo) throw new Error('无法定位隆昊昊天园')

    const locations = await Promise.all((rawLocations as RawLocation[]).map(async item => {
      const geo = await geocode(item.geoQuery)
      if (!geo) {
        return {
          ...item,
          status: 'failed',
          distanceMeter: null,
          drivingDistanceMeter: null,
          drivingDurationSecond: null,
          location: null
        }
      }

      let drive = null
      try {
        drive = await driving(homeGeo, geo)
      } catch {
        drive = null
      }

      return {
        ...item,
        status: 'ok',
        location: geo,
        distanceMeter: haversine(homeGeo, geo),
        drivingDistanceMeter: drive?.drivingDistanceMeter ?? null,
        drivingDurationSecond: drive?.drivingDurationSecond ?? null
      }
    }))

    locations.sort((a:any,b:any) => (a.drivingDistanceMeter ?? a.distanceMeter ?? Infinity) - (b.drivingDistanceMeter ?? b.distanceMeter ?? Infinity))

    return NextResponse.json({
      home: {
        ...HOME,
        location: homeGeo
      },
      locations
    })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || '服务异常' }, { status: 500 })
  }
}
