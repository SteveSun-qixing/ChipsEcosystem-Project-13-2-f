# Token 映射与构建流水线设计

> 文档状态：实现基线设计稿  
> 适用范围：`ThemePack/Chips-theme-default-dark` 暗夜主题包 `src/build-tokens.ts`

---

## 1. 输入源与目标结构

### 1.1 输入源：@chips/tokens

暗夜主题包的 token 输入源对齐 `Chips-ComponentLibrary/packages/tokens/tokens`：

- `ref.json`：基础色板、圆角、间距等；
- `sys.json`：语义色彩与语义参数；
- `motion.json`：动效时长与缓动；
- `layout.json`：布局密度与间距；
- `comp/*.json`：组件级 token（button/input/dialog/...）。

这些文件内部结构形如：

```json
{
  "chips": {
    "ref": { ... }
  }
}
```

或：

```json
{
  "chips": {
    "comp": {
      "button": {
        "root": { ... },
        "label": { ... }
      }
    }
  }
}
```

### 1.2 目标结构：ThemeTokenLayers

构建后的 `dist/tokens.json` 必须符合 Theme Runtime 的五层结构：

```json
{
  "ref": { ... },
  "sys": { ... },
  "comp": { ... },
  "motion": { ... },
  "layout": { ... }
}
```

由 Host 侧的 `asThemeTokenLayers` 和解析算法负责进一步 flatten 和引用解析。

---

## 2. 构建流程概览

构建流程由 `src/build-tokens.ts` 完成，步骤如下：

1. 读取项目根目录下的 `tokens/ref.json/sys.json/motion.json/layout.json`；
2. 读取 `tokens/comp/` 下所有 `*.json` 文件；
3. 对 `comp` 层执行深度合并（按组件名聚合）；
4. 生成内存中的 `themeTokens = { ref, sys, comp, motion, layout }`；
5. 将 `themeTokens` 写入 `dist/tokens.json`（带缩进，便于调试）。

所有 JSON 解析错误或文件缺失都会导致构建脚本抛错并中止构建。

---

## 3. 组件层合并规则

### 3.1 目录约定

- `tokens/comp/` 目录下，每个组件一个 JSON 文件：
  - `button.json`
  - `input.json`
  - `dialog.json`
  - ...
- 每个文件的结构遵守 @chips/tokens 格式：

```json
{
  "chips": {
    "comp": {
      "button": {
        "root": { ... }
      }
    }
  }
}
```

### 3.2 合并策略

- 读取所有组件 JSON 后，使用“对象深度合并”策略构造最终 `comp` 层：
  - 合并顺序按照文件名排序，保证稳定性；
  - 同一键路径上的值：
    - 如果两个值均为对象，则递归合并；
    - 否则后者覆盖前者；
- 合并后的 `comp` 结构示例：

```json
{
  "chips": {
    "comp": {
      "button": { ... },
      "input": { ... },
      "dialog": { ... },
      "tabs": { ... }
    }
  }
}
```

这样保证后续 flatten 时可以得到所有 `chips.comp.*` 键。

---

## 4. 错误处理与健壮性

构建脚本在以下情况下会抛出错误并终止：

- `tokens/ref.json/sys.json/motion.json/layout.json` 缺失或不是合法 JSON；
- 某个 `tokens/comp/*.json` 文件内容不是对象或缺失 `chips.comp` 根节点；
- 深度合并过程中遇到无法处理的类型（如数组、非对象等）。

这样可以在开发阶段尽早发现 token 配置错误，避免发布无效主题。

---

## 5. 与测试和验证脚本的关系

- `tests/tokens.spec.ts`：
  - 验证 `dist/tokens.json` 中存在 `ref/sys/comp/motion/layout` 五个对象；
- `tests/contract.spec.ts`：
  - 通过 flatten 后的 `comp` 层 token 验证常见组件（如 button）的关键 token 存在；
- `src/validate-theme.ts`：
  - 作为 `npm run validate:theme` 的入口；
  - 在构建后进行额外的静态检查，输出清晰错误信息，便于在 CI 中使用。

上述三个部分与 `build-tokens.ts` 共同构成暗夜主题包的最小质量门禁。

