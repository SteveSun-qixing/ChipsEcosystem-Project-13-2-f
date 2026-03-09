id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: app
entry: dist/index.html

description: 标准应用插件模板示例工程，由 chips-scaffold-app 生成。

author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}

keywords:
  - chips
  - app
  - scaffold

permissions:
  - theme.read
  - i18n.read

engines:
  chips: "^1.0.0"

os:
  - darwin
  - win32
  - linux

ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
