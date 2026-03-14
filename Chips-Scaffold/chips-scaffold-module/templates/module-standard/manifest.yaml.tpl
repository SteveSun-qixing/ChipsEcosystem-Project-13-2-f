id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 基于 chips-scaffold-module 生成的标准模块插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
capabilities:
  - {{ MODULE_CAPABILITY }}
permissions:
  - theme.read
  - i18n.read
engines:
  chips: "^0.1.0"
os:
  - darwin
  - win32
  - linux
