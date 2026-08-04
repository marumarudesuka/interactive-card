# Interactive Card

[English](./README.md) | 简体中文

Interactive Card 是一组面向 Home Assistant 能源面板的 Lovelace 自定义卡片。

这个项目最初用于整理个人面板里的几个可复用卡片，后来逐步扩展为一套小型组件库，覆盖 KPI 数据、历史趋势和回路功率监控。各卡片使用同一套视觉设计，也可以按不同 Home Assistant 实体进行配置。

<p align="center">
  <img
    src="./docs/dashboard_overview.png"
    alt="Interactive Card 能源面板总览"
    width="100%"
  >
</p>

## 功能

Interactive Card 目前主要包含三个部分：

- **KPI** — 展示能耗、功率、费用等关键数值
- **Trend** — 使用可配置的多条数据序列查看历史趋势
- **Circuit** — 实时查看各回路的功率状态

当前已经实现的功能包括：

- 可配置的实体选择
- 自定义标题、图标、单位、小数位和 KPI 副标题
- 功率与电量单位自动缩放
- 多条 Trend Series，以及 Line、Area、Bar 三种显示模式
- 自动、左侧和右侧趋势轴
- 可配置的趋势分辨率、时间范围和图表高度
- 自定义回路名称、实时功率传感器和设备图标
- 面板编辑结果保存在浏览器本地
- Glass、Native、Solid 三种卡片样式
- KPI 与回路卡片的响应式布局

## 界面截图

### KPI

可以直接在面板中添加、移除和配置 KPI 卡片。

<p align="center">
  <img
    src="./docs/kpi_section.png"
    alt="KPI 卡片管理菜单"
    width="30%"
  >
  <img
    src="./docs/kpi_editor.png"
    alt="KPI 卡片设置窗口"
    width="62%"
  >
</p>

### Trend

趋势卡片支持多条 Series、混合图表模式、左右双轴，以及四种时间范围。

<p align="center">
  <img
    src="./docs/trend_card.png"
    alt="包含多条数据序列的能源趋势图"
    width="100%"
  >
</p>

每条 Series 都可以单独设置显示名称、单位、图表模式、坐标轴、小数位和数据分辨率。

<p align="center">
  <img
    src="./docs/trend_settings.png"
    alt="Trend 卡片设置"
    width="46%"
  >
  <img
    src="./docs/edit_series.png"
    alt="Trend Series 编辑界面"
    width="46%"
  >
</p>

### Circuit

回路条目可以修改名称、绑定实时功率传感器，并设置设备图标。

<p align="center">
  <img
    src="./docs/circuit_section.png"
    alt="回路配置编辑窗口"
    width="46%"
  >
</p>

## 可用卡片

当前构建包会向 Lovelace 注册以下卡片类型：

| 卡片 | 说明 |
|---|---|
| `custom:energy-kpi-card` | 展示一个可配置的 KPI 数值 |
| `custom:energy-kpi-section` | 管理并展示一组 KPI 卡片 |
| `custom:energy-trend-card` | 展示可配置的历史数据 Series |
| `custom:energy-circuit-section` | 展示回路级实时功率信息 |
| `custom:energy-flow-diagram` | 展示配置好的能源节点与流向连接 |
| `custom:energy-theme-selector` | 切换 Glass、Native、Solid 卡片样式 |
| `custom:energy-settings-card` | 提供卡片样式设置界面 |
| `custom:energy-ev-charging-scene` | 展示项目内置的电动车充电场景 |
| `custom:energy-solar-scene` | 展示项目内置的光伏场景 |
| `custom:energy-battery-scene` | 展示项目内置的储能场景 |

## 安装

### 手动安装

仓库当前没有 HACS 元数据，因此需要手动安装。

1. 从最新 GitHub Release 下载 `interactive-card.js`，或自行从源码构建。
2. 将文件复制到：

   ```text
   /config/www/interactive-card/interactive-card.js
   ```

3. 在 Home Assistant 中打开**设置 → 仪表盘 → 资源**。
4. 添加 `/local/interactive-card/interactive-card.js`，资源类型选择 **JavaScript 模块**。
5. 重新加载仪表盘。如果仍然加载旧版本，可以更新资源 URL 的查询参数或清理浏览器缓存。

## 快速开始

在仪表盘中添加一张 KPI 卡片：

```yaml
type: custom:energy-kpi-card
entity: sensor.home_power
title: Current Power
icon: mdi:flash
unit: W
decimals: 2
autoScale: true
```

请将示例实体替换为你的 Home Assistant 中实际存在的实体。

## 配置示例

### KPI 区域

```yaml
type: custom:energy-kpi-section
title: Energy Overview
cards:
  - id: current-power
    entity: sensor.home_power
    title: Current Power
    icon: mdi:flash
    unit: W
    decimals: 2
    autoScale: true
    enabled: true
    order: 0

  - id: today-energy
    entity: sensor.home_energy_today
    title: Today's Usage
    icon: mdi:lightning-bolt
    unit: kWh
    decimals: 2
    subtitle: Since 00:00
    trendMode: vs_yesterday
    enabled: true
    order: 1
```

KPI 配置还支持项目类型中定义的自定义图标颜色和历史值。从卡片管理菜单做出的修改会保存在当前浏览器中。

### Trend 卡片

```yaml
type: custom:energy-trend-card
id: main-energy-trend
title: Energy Trend
height: 350
fullWidth: true
timeframe: 24H
category: power
entities:
  - entity: sensor.home_power
    name: Main Power
    unit: W
    chartMode: line
    axis: left
    decimals: 2
    renderMode: smooth
    enabled: true
    order: 0

  - entity: sensor.solar_power
    name: Solar Generation
    unit: W
    chartMode: area
    axis: auto
    decimals: 2
    renderMode: high_precision
    enabled: true
    order: 1

  - entity: sensor.electricity_price
    name: Electricity Rate
    unit: EUR/kWh
    category: cost
    chartMode: bar
    axis: right
    decimals: 4
    enabled: true
    order: 2
```

时间范围支持 `1H`、`24H`、`7D` 和 `30D`。每条 Series 可以使用 `line`、`area` 或 `bar`，坐标轴可以设置为 `auto`、`left` 或 `right`。

### Active Circuits

```yaml
type: custom:energy-circuit-section
title: Active Circuits
circuits:
  - id: kitchen
    name: Kitchen
    entity: sensor.kitchen_power
    icon: mdi:stove
    enabled: true
    order: 0

  - id: hvac
    name: HVAC
    entity: sensor.hvac_power
    icon: mdi:air-conditioner
    enabled: true
    order: 1
```

Circuit 编辑器只接受单位为 `W`、`kW` 或 `MW` 的实时功率传感器。已经存在但不符合要求的绑定仍会显示，方便用户识别和修正；在选择有效功率实体之前无法再次保存。

## 开发

安装依赖并启动 Vite 开发服务器：

```bash
npm install
npm run dev
```

项目当前提供以下命令：

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run typecheck` | 运行 TypeScript 检查，不生成文件 |
| `npm run verify` | 运行核心验证脚本 |
| `npm run check` | 依次运行类型检查、核心验证和生产构建 |
| `npm run build` | 构建 `dist/interactive-card.js` |
| `npm run preview` | 使用 Vite 预览生产构建 |

## 项目结构

```text
src/
├── components/       Lovelace 卡片和共享 UI 组件
├── config/           配置标准化与卡片注册表
├── data/             默认 KPI、回路和场景数据
├── design-system/    共享视觉 Token 与 Dialog 样式
├── helpers/          格式化、实体、图表与布局逻辑
├── repositories/     浏览器本地配置持久化
├── styles/           共享卡片样式与响应式布局
├── theme/            卡片材质与主题处理
├── types/            TypeScript 配置和视图模型类型
└── index.ts          构建入口

docs/                 截图与架构说明
scripts/              项目验证脚本
dist/                 生成的生产构建
```

内部运行流程的简要说明见 [docs/architecture.md](./docs/architecture.md)。

## 路线图

项目目前没有正式的版本路线图。近期工作主要是增加不同 Home Assistant 配置下的实际测试、保持已保存配置的兼容性，并准备未来发布到 HACS 所需的仓库元数据。

## 参与贡献

欢迎提交问题和范围明确的 Pull Request。提交前请：

1. 使用 `npm install` 安装依赖。
2. 在单独分支中完成修改。
3. 运行 `npm run check`。
4. 如果修改涉及界面或实体逻辑，请说明用于验证的 Home Assistant 配置。

