# 合肥地点通勤分析工具

一个可部署到 Vercel 的 Next.js 小工具。

## 功能

- 展示 106 个原始地点，列表和详情始终展示未修改的原始地址
- 内部使用 `geoQuery` 做地址清洗，提高定位成功率
- 以「隆昊昊天园」为基准点计算：
  - 直线距离
  - 驾车距离
  - 预计驾车时间
- 支持 PC 双栏布局
- 支持移动端地图 + 底部抽屉列表
- 地图标点、覆盖半径、搜索、距离筛选、详情卡片

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

然后在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_AMAP_JS_KEY=你的高德Web端JSAPIKey
NEXT_PUBLIC_AMAP_SECURITY_CODE=你的高德安全密钥jscode
AMAP_WEB_SERVICE_KEY=你的高德Web服务Key
```

## Vercel 部署

1. 将本项目上传到 GitHub。
2. 在 Vercel 新建项目并导入仓库。
3. 在 Project Settings → Environment Variables 添加：

```bash
NEXT_PUBLIC_AMAP_JS_KEY
NEXT_PUBLIC_AMAP_SECURITY_CODE
AMAP_WEB_SERVICE_KEY
```

4. 重新 Deploy。

## 数据维护

数据在：

```bash
data/locations.json
```

字段说明：

- `originalAddress`：原始展示地址，不要修改
- `displayAddress`：搜索展示辅助字段
- `radius`：覆盖半径
- `geoQuery`：内部定位查询字段，可清洗优化，不直接展示给用户
