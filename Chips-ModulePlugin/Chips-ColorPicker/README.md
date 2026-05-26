# Chips ColorPicker

> 从本地图片中提取两个代表色的模块插件。

## 简介

`Chips-ColorPicker` 是一个 `type: module` 的共享功能模块。它接收一张本地图片，输出两个颜色代码：

- `backgroundColor`
  - 更浓郁、稳重，但不会被压得过暗，适合纯色背景、卡片底色或大面积铺色。
- `accentColor`
  - 更明亮、更高饱和、更显眼，适合作为按钮、强调色或个性色。
- `palette`
  - 最多 8 个代表色，前两项对应背景色与强调色。
- `metadata`
  - 报告算法版本、图片尺寸 / 格式 / 动图页数、采样尺寸、透明像素比例和聚类数量。

模块当前通过 `sharp` 在模块内完成图像解码与缩采样，再使用 OKLab 聚类和颜色评分逻辑选出最终结果。

## 正式能力

- `capability`: `image.color.pick`
- `method`: `pick`
- `mode`: `sync`

输入契约：

```json
{
  "imagePath": "/absolute/path/to/poster.jpg",
  "options": {
    "sampleSize": 96
  }
}
```

输出契约：

```json
{
  "backgroundColor": "#1d2a5f",
  "accentColor": "#ff8b4a",
  "palette": [
    {
      "color": "#1d2a5f",
      "role": "background",
      "population": 0.72,
      "lightness": 0.42,
      "chroma": 0.12
    },
    {
      "color": "#ff8b4a",
      "role": "accent",
      "population": 0.18,
      "lightness": 0.68,
      "chroma": 0.21
    }
  ],
  "metadata": {
    "algorithm": "oklab-kmeans-v1",
    "image": {
      "width": 1200,
      "height": 900,
      "format": "jpeg",
      "animated": false,
      "pageCount": 1,
      "hasAlpha": false
    },
    "sample": {
      "width": 96,
      "height": 72,
      "sampleSize": 96,
      "visiblePixelRatio": 1,
      "transparentPixelRatio": 0,
      "clusterCount": 4
    }
  }
}
```

约束：

- `imagePath` 只接受本地绝对路径或 `file://` 本地 URL。
- 当前模块正式读取本地图片文件，不接收远程 URL。
- `sampleSize` 用于控制内部缩采样尺寸，范围 `48-160`，默认 `96`。

## 调用示例

```ts
import { createClient } from "chips-sdk";

const client = createClient();

const result = await client.module.invoke({
  capability: "image.color.pick",
  method: "pick",
  input: {
    imagePath: "/workspace/demo-cover.png",
  },
});

if (result.mode === "sync") {
  console.log(result.output.backgroundColor, result.output.accentColor);
}
```

## 颜色策略

模块当前采用以下策略：

1. 使用 `sharp` 把原图缩采样为带透明通道的 RGBA 小图。
2. 忽略透明像素，对颜色做量化聚合。
3. 在 OKLab 空间做代表色聚类。
4. 分别按“背景色”和“个性色”两套评分规则选择候选色。
5. 对最终颜色做亮度 / 色度微调，把背景色收进稳定的铺底区间，把个性色收进更亮更跳的强调区间。
6. 输出代表色调色板与采样诊断元数据。
7. 对同一张图片按文件路径 + 大小 + 修改时间做模块内缓存，重复调用直接复用结果。

模块内部限制最多同时处理 2 个取色任务，大图会先经 `sharp` 缩采样到 `48-160` 范围内的 RGBA 小图；动图和多页图片当前只采样首帧，并在 `metadata.image.pageCount` 中报告帧数或页数。

这套策略的目标不是求平均色，而是尽量提取更像成品设计里会使用的两种颜色。

## 开发验证

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-ModulePlugin/Chips-ColorPicker
npm run lint
npm run build
npm test
npm run validate
```
