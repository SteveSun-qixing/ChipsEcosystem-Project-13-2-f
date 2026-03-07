id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: app
entry: index.html

description: 卡片查看器应用，用于通过统一卡片显示链路查看复合卡片内容。

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
