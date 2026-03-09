id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: card
entry: dist/index.mjs
description: 文本型基础卡片插件（通过 chips-scaffold-basecard 生成）。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
capabilities:
  cardTypes:
    - {{ CARD_TYPE }}
permissions: []
engines:
  chips: "^0.1.0"
os:
  - darwin
  - win32
  - linux
