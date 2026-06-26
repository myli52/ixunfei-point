# 通勤距离速查

一个以「隆昊昊天园」为中心，快速查看合肥各地点直线距离的小工具。打开即用，支持手机和电脑。

## 特点

- **打开即用**：所有地点坐标已预编码并固化在数据文件中，无需运行时解析，秒开
- **距离一目了然**：每个地点到中心点的直线距离，按远近排序，颜色区分
- **地图 + 列表联动**：点列表定位地图，点地图标记高亮列表
- **双端适配**：电脑端左列表右地图，手机端地图全屏 + 抽屉式列表
- **数据真实**：展示地址严格保留数据源原文，坐标由高德 POI 搜索预先获取

## 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · 高德地图 JS API · 部署于 Vercel

## 本地开发

```bash
npm install

# 配置高德地图 Key（仅地图底图渲染需要）
cp .env.local.example .env.local
# 填入 NEXT_PUBLIC_AMAP_KEY 和 NEXT_PUBLIC_AMAP_SECURITY_CODE

npm run dev
```

打开 http://localhost:3000

## 部署到 Vercel

1. 推送代码到 GitHub
2. Vercel 导入仓库
3. 配置环境变量 `NEXT_PUBLIC_AMAP_KEY`、`NEXT_PUBLIC_AMAP_SECURITY_CODE`
4. 在高德控制台把 Vercel 域名加入安全域名白名单

详见 [DEPLOY.md](DEPLOY.md)

## 数据维护

地点数据位于 [data/locations.json](data/locations.json)，每条记录包含原始地址、预编码坐标和到中心点的距离。如需新增地点或更换中心点，更新坐标后重新计算 `distance` 字段即可。
