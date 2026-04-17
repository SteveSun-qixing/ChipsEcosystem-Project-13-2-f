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

runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: false

capabilityFallbacks:
  open-file:
    whenUnsupported: reject
  save-file:
    whenUnsupported: reject

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
  launcher:
    displayName: {{ DISPLAY_NAME }}
    icon: assets/icons/app-icon.ico
  surface:
    defaultKind: window
    preferredKinds:
      desktop: window
      web: route
      mobile: fullscreen
      headless: window
  window:
    chrome:
      frame: true
      backgroundColor: "#ffffff"
