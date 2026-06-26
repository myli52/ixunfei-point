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
