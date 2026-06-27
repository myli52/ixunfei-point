/**
 * 坐标系转换：WGS-84（GPS 国际标准）→ GCJ-02（火星坐标，高德/腾讯地图使用）
 *
 * 浏览器 navigator.geolocation 返回的是 WGS-84 坐标，
 * 而高德地图使用 GCJ-02 坐标系。两者在中国境内存在系统性偏移
 * （通常 300~700 米），不转换会导致定位点明显偏移。
 *
 * 本算法为国测局加密算法的公开实现，纯本地计算，无网络请求，
 * 精度误差通常在几米以内。
 */

const PI = Math.PI;
const A = 6378245.0; // 长半轴（克拉索夫斯基椭球）
const EE = 0.00669342162296594323; // 偏心率平方

/** 判断坐标是否在中国境外（境外不做偏移，直接返回原值） */
function outOfChina(lng: number, lat: number): boolean {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * WGS-84 → GCJ-02
 * @param lng WGS-84 经度
 * @param lat WGS-84 纬度
 * @returns [GCJ-02 经度, GCJ-02 纬度]
 */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  const mgLat = lat + dLat;
  const mgLng = lng + dLng;
  return [mgLng, mgLat];
}
