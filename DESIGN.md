# 设计语言（Design Language）

> 这份文档是「Point」（合肥通勤距离速查）的设计宪法。任何新增 UI 都应先看一遍这里，再动手写代码。

## 一、设计原则

1. **信息优先，装饰其次** —— 用户来这里是为了"看清谁离我近"，距离、地点名、可达性是主角，渐变、阴影、动效都是配角。
2. **一眼可读** —— 默认排序就是答案；最近 / 最远 / 选中三种状态在视觉上能瞬间区分。
3. **避免 AI 感** —— 不滥用渐变、不滥用 emoji、不滥用强对比色，留白要敢留，文字层级要清晰。
4. **双端原生** —— PC 是工作台，移动是随身工具。**不要**把 PC 的侧栏强塞到移动端；移动端用底部 BottomSheet 这个移动原生交互模式。
5. **可达性是底线** —— 焦点态、对比度、键盘操作、aria-label 都不是可选项。

---

## 二、色彩系统

### 品牌色（Brand）

```
brand-50   #eff6ff  极浅底色（hover 背景）
brand-100  #dbeafe  轻底色（已选标签）
brand-500  #3b82f6  主色（按钮、链接、强调）
brand-600  #2563eb  按钮悬停 / 焦点
brand-700  #1d4ed8  按钮按下
```

### 距离语义色（Distance）

距离用颜色编码远近，是这个产品最重要的视觉语言。**梯度从绿（近）→ 琥珀（中）→ 红（远）**：

```
近    < 3km     emerald-500  #10b981
中    3–8km    amber-500    #f59e0b
远    > 8km     rose-500     #f43f5e
```

### 选中态色（Selected）

> 选中态独立成色，不复用任何状态色，避免歧义。

```
selected-bg     emerald-50   #ecfdf5
selected-border emerald-500  #10b981
selected-text   emerald-900  #064e3b
selected-marker emerald-600  #059669
```

### 中性色（Neutral / Slate）

主框架、文字、边框、背景一律使用 `slate-*`，不要混用 `gray-*` `zinc-*`，保证调性统一：

```
slate-50    背景（页面）
slate-100   分割面（卡片间）
slate-200   边框
slate-400   占位符 / 三级文字
slate-500   二级文字
slate-700   一级文字（移动端深色背景上不用）
slate-900   标题
```

### 反色 / 玻璃质感

```
bg-white/80 + backdrop-blur-md  浮层胶囊（定位按钮、控件）
bg-white/95 + shadow-xl          BottomSheet
```

---

## 三、字体与排版

### 字体

```css
font-family:
  'Inter', /* 拉丁字符 */
  -apple-system, BlinkMacSystemFont,
  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
  'Helvetica Neue', sans-serif;
```

数字使用 `tabular-nums` 等宽对齐，距离、编号都要加。

### 字号阶梯（Type Scale）

| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| `text-[11px]` | 11 | 14 | 标签、辅助说明 |
| `text-xs` | 12 | 16 | 三级文字、地址副标题 |
| `text-sm` | 14 | 20 | 列表项主文字、按钮 |
| `text-base` | 16 | 24 | 输入框 |
| `text-lg` | 18 | 26 | 卡片标题 |
| `text-xl` | 20 | 28 | Hero 目标名 |
| `text-2xl` | 24 | 32 | Hero 强调数字（最近 X 公里） |

### 字重

400 正文 / 500 强调 / 600 标题 / 700 数据。**不使用 800/900**。

---

## 四、间距与圆角

### 间距（4 的倍数）

```
2  (8px)   组件内紧凑间距
3  (12px)  列表项内边距
4  (16px)  卡片内边距
5  (20px)  Hero 卡片内边距
6  (24px)  区块间隔
```

### 圆角

```
rounded-md     6px    标签、徽章
rounded-lg     8px    输入框、按钮
rounded-xl     12px   卡片、列表项
rounded-2xl    16px   Hero 卡片、BottomSheet 顶部
rounded-full   ∞      头像、定位按钮
```

不要乱用 `rounded-3xl`，会显得幼稚。

---

## 五、阴影（Elevation）

```
shadow-sm     hover 抬起
shadow-md     Hero 卡片
shadow-lg     悬浮控件（定位按钮）
shadow-xl     BottomSheet
shadow-2xl    移动端临时浮层（仅备用）
```

---

## 六、动效

### 缓动曲线

- **进出**：`ease-out` —— 自然减速，最常用
- **状态切换**：`ease-in-out` —— 平稳过渡（如排序切换）
- **强调**：`cubic-bezier(0.22, 1, 0.36, 1)` —— 弹性出场（Hero 数字、奖章）

### 时长

| 场景 | 时长 |
|------|------|
| 微交互（hover、focus） | 150ms |
| 状态切换（标签页、按钮） | 200ms |
| 抽屉、模态进出 | 300ms |
| 地图 panTo | 600ms |
| 信息窗弹出延迟 | 650ms（在 panTo 之后） |

### 永远不要

- 不要在列表滚动时做大幅动画
- 不要无限循环 spin（除了 loading 圈本身）
- 不要超过 400ms 的微交互

---

## 七、图标系统

### 库

**lucide-react**（已安装）—— 线条图标，stroke-width = 2，风格统一、商务感、不卡通。

### 用图原则

- 列表项：图标 + 文字组合时，图标尺寸 ≤ 文字高度
- 按钮：图标比文字大 2px 即可，避免视觉拥挤
- 显式 `strokeWidth={2}` —— 某些浏览器默认 stroke 渲染偏细

### 关键图标映射

| 概念 | 图标 |
|------|------|
| 参照中心 | `Crosshair` |
| 距离 | `Navigation` |
| 当前位置 | `LocateFixed` |
| 列表 | `ListOrdered` |
| 排序 | `ArrowDownNarrowWide` / `Hash` |
| 搜索 | `Search` |
| 清空 | `X` |
| 复制 | `Copy` / `Check`（成功） |
| 信息 | `Info` |
| 关闭抽屉 | `ChevronDown` |

### 禁用

- ❌ emoji 作为功能图标（除非是装饰性，如 `📍`）
- ❌ 多套图标库混用

---

## 八、组件原则

### 列表项（LocationListItem）

```
[编号徽章]  [名称]              [距离]
 24         合肥火车站          3.8 km
            合肥市 ……            ━━━━━──── (距离条)
```

- 编号徽章：圆形、24×24、背景色 = 距离语义色的浅色变体（emerald-50 / amber-50 / rose-50）
- 选中态：背景 `bg-emerald-50` + 左边框 `border-l-4 border-emerald-500`
- 距离条：长度按 `distance / maxDistance` 映射，颜色取距离语义色
- hover：背景变 `slate-50`，无位移

### Hero 卡片（TargetHero）

- 容器：`rounded-2xl bg-white shadow-md p-5`
- 内部三段：
  - 顶部小标签 `距离参照中心`（11px / slate-500 / 大写字号）
  - 中部目标名 `text-xl font-semibold text-slate-900`
  - 底部数据条 `最近 X · 最远 Y · 平均 Z`（用 `tabular-nums`）
- 右上角圆形按钮 "更换" —— 点击后**就地**展开输入框（不要弹出模态）

### 浮层控件（FloatingButton）

```
bg-white/90 backdrop-blur-md
shadow-lg
rounded-full
size-12（移动）/ size-11（PC）
```

定位按钮、回到默认按钮、缩放控件都用同一套规格。

---

## 九、响应式

### 断点

```
sm   640px   小平板（罕见）
md   768px   竖屏 iPad
lg   1024px  PC 起点 ★主断点
xl   1280px
```

### 双端布局

```
< 1024px (移动)
├─ AppBar  (顶部 56px)
├─ Map     (全屏)
└─ BottomSheet (拖拽吸附 peek/half/full)

≥ 1024px (桌面)
├─ Sidebar (left, 420px)
│  ├─ TargetHero
│  └─ LocationList
└─ Map     (剩余空间)
```

**绝对不要**在移动端套侧滑抽屉 —— 那是上世纪做法。底部抽屉才是移动原生交互。

### 触摸目标

最小尺寸 `44 × 44px`（iOS HIG）。列表项、按钮都要达标。

---

## 十、可访问性

- 所有交互元素提供 `aria-label`
- 焦点用 `:focus-visible` 圈出，颜色 `ring-2 ring-brand-500 ring-offset-2`
- 颜色对比度 ≥ 4.5:1（正文）/ 3:1（大字号）
- 键盘可达：`Enter` 选中、`Esc` 取消、`Tab` 顺序合理

---

## 十一、避免清单（Anti-patterns）

| ❌ 不做 | ✅ 这样做 |
|---------|----------|
| 蓝色渐变 banner（AI 感重灾区） | 纯色卡片 + 微阴影 |
| 圆角 24px 以上 | 最大 16px |
| 滥用 emoji 当图标 | lucide-react |
| 多色按钮乱炫 | 主按钮 1 个、次按钮 1 个、危险 1 个 |
| 移动端侧滑抽屉 | 底部 BottomSheet |
| 列表项整行渐变背景 | 左边框 + 浅色填充 |
| `text-gray-*` 和 `text-slate-*` 混用 | 全用 `slate-*` |
| 把所有信息一次塞满 | 折叠次要信息，必要时展开 |

---

## 十二、版本

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-26 | 初版，覆盖色彩、字体、组件、双端布局 |
