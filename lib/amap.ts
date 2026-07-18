declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

interface AMapLoaderConfig {
  key: string;
  version?: string;
  plugins?: string[];
}

/**
 * 加载高德地图 API
 */
export function loadAMap(config: AMapLoaderConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve(window.AMap);
      return;
    }

    const { key, version = '2.0', plugins = [] } = config;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=${version}&key=${key}${
      plugins.length > 0 ? `&plugin=${plugins.join(',')}` : ''
    }`;

    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        reject(new Error('高德地图加载失败'));
      }
    };

    script.onerror = () => {
      reject(new Error('高德地图加载失败'));
    };

    document.head.appendChild(script);
  });
}

/**
 * 地理编码：将地址/地点名称转换为坐标
 */
export async function geocodeAddress(
  address: string
): Promise<{ lnglat: [number, number]; formattedAddress: string }> {
  const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!apiKey) {
    throw new Error('缺少高德地图API Key');
  }

  // 确保 AMap 已加载，并加载 Geocoder 插件
  const AMap = window.AMap || (await loadAMap({
    key: apiKey,
    plugins: ['AMap.Geocoder']
  }));

  return new Promise((resolve, reject) => {
    AMap.plugin('AMap.Geocoder', () => {
      const geocoder = new AMap.Geocoder({
        city: '合肥', // 限定城市范围
      });

      geocoder.getLocation(address, (status: string, result: any) => {
        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
          const location = result.geocodes[0].location;
          const lnglat: [number, number] = [location.lng, location.lat];
          const formattedAddress = result.geocodes[0].formattedAddress;
          resolve({ lnglat, formattedAddress });
        } else {
          reject(new Error('未找到该地点，请尝试更详细的地址'));
        }
      });
    });
  });
}

/**
 * 逆地理编码：将坐标转换为地址
 */
export async function reverseGeocode(
  lnglat: [number, number]
): Promise<{ name: string; address: string }> {
  const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!apiKey) {
    throw new Error('缺少高德地图API Key');
  }

  // 确保 AMap 已加载，并加载 Geocoder 插件
  const AMap = window.AMap || (await loadAMap({
    key: apiKey,
    plugins: ['AMap.Geocoder']
  }));

  return new Promise((resolve, reject) => {
    AMap.plugin('AMap.Geocoder', () => {
      const geocoder = new AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      });

      geocoder.getAddress(lnglat, (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          const regeocode = result.regeocode;
          // 优先使用 POI 信息，否则使用格式化地址
          const name = regeocode.pois?.[0]?.name || regeocode.addressComponent?.township || '当前位置';
          const address = regeocode.formattedAddress;
          resolve({ name, address });
        } else {
          reject(new Error('逆地理编码失败'));
        }
      });
    });
  });
}
