id: {{pluginId}}
name: {{name}}
version: {{version}}
type: theme
description: {{description}}
permissions:
  - theme.read

# 主题相关配置（供 Theme Runtime 与生态工具使用）
themeId: {{themeId}}
displayName: {{displayName}}
isDefault: {{isDefault}}
parentTheme: {{parentThemeId}}
publisher: {{publisher}}

ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/theme-interface.contract.json
    minFunctionalSet: ./contracts/theme-min-functional-set.json

