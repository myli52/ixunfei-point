# 部署指南

## Vercel 部署步骤

### 准备工作

1. **注册Vercel账号**
   - 访问 https://vercel.com
   - 使用GitHub账号登录

2. **配置高德地图API**
   - 访问 https://lbs.amap.com/
   - 创建应用获取API Key
   - 记下Key和安全密钥

### 部署流程

#### 方法一：通过GitHub（推荐）

1. 将代码推送到GitHub仓库
2. 在Vercel中点击 "New Project"
3. 导入你的GitHub仓库
4. 配置环境变量：
   - `NEXT_PUBLIC_AMAP_KEY`: 你的高德地图API Key
   - `NEXT_PUBLIC_AMAP_SECURITY_CODE`: 你的安全密钥
5. 点击 "Deploy"

#### 方法二：通过Vercel CLI

\`\`\`bash
# 安装Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
\`\`\`

### 环境变量配置

在Vercel Dashboard中：

1. 进入你的项目
2. 点击 "Settings" > "Environment Variables"
3. 添加以下变量：
   - `NEXT_PUBLIC_AMAP_KEY`
   - `NEXT_PUBLIC_AMAP_SECURITY_CODE`
4. 选择环境：Production, Preview, Development（全选）
5. 点击 "Save"

### 注意事项

1. **高德地图配置**
   - 确保在高德平台的"应用管理"中将Vercel域名添加到白名单
   - 例如：`your-project.vercel.app`

2. **首次部署**
   - 首次部署可能需要5-10分钟
   - 注意查看构建日志

3. **自动部署**
   - 推送到main分支会自动触发部署
   - 其他分支会创建预览部署

## 本地开发

\`\`\`bash
# 安装依赖
npm install

# 配置.env.local
cp .env.local.example .env.local
# 编辑.env.local填入API Key

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
\`\`\`

## 故障排查

### 地图无法加载

1. 检查API Key是否正确
2. 检查安全密钥是否配置
3. 检查域名是否在高德平台白名单中
4. 打开浏览器控制台查看错误信息

### 部署失败

1. 检查package.json依赖是否正确
2. 检查环境变量是否配置
3. 查看Vercel部署日志
4. 确保Node.js版本兼容（建议>=18）

## 性能优化

- 启用Vercel的CDN加速
- 配置合适的缓存策略
- 优化图片和静态资源
- 启用gzip压缩

## 监控和分析

- 在Vercel Dashboard查看访问统计
- 配置错误监控
- 设置性能预算
