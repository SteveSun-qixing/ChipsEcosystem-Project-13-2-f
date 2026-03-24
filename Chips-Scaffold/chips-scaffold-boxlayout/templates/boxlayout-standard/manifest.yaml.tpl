id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: layout
entry: dist/index.mjs
description: {{ DESCRIPTION }}
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions:
  - box.read
  - theme.read
  - i18n.read
engines:
  chips: "^0.1.0"
os:
  - darwin
  - win32
  - linux
layout:
  layoutType: {{ LAYOUT_TYPE }}
  displayName: {{ DISPLAY_NAME }}
