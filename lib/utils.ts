/**
 * 计算两点之间的直线距离（米）
 * 使用 Haversine 公式
 */
export function calculateDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 格式化距离文本
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}米`;
  }
  return `${(meters / 1000).toFixed(1)}公里`;
}

/**
 * 根据距离返回颜色
 */
export function getDistanceColor(meters: number): string {
  if (meters < 3000) return '#10b981'; // 绿色 - 近
  if (meters < 8000) return '#f59e0b'; // 橙色 - 中等
  return '#ef4444'; // 红色 - 远
}

/**
 * 批量计算地点到目标点的距离
 */
export function calculateDistanceFromTarget(
  targetLnglat: [number, number],
  locationLnglat: [number, number]
): number {
  return Math.round(
    calculateDistance(
      targetLnglat[0],
      targetLnglat[1],
      locationLnglat[0],
      locationLnglat[1]
    )
  );
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
