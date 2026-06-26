export interface Location {
  /** 编号，对应数据源 locations 数组中的原始顺序（从 1 开始） */
  id: number;
  name: string;
  /** 原始展示地址，严格保留数据源原文，不做任何修改 */
  address: string;
  radius: number;
  /** 预编码并固化的坐标 [经度, 纬度] */
  lnglat: [number, number];
  /** 到目标地点的直线距离（米），构建时预计算 */
  distance: number;
  distanceText?: string;
}

export interface TargetLocation {
  name: string;
  /** 原始展示地址（默认目标有，用户自定义的没有） */
  address?: string;
  /** 是否为内置默认目标 */
  isTarget?: boolean;
  /** 坐标 [经度, 纬度] */
  lnglat: [number, number];
}

export interface LocationData {
  target: TargetLocation;
  locations: Location[];
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
}
