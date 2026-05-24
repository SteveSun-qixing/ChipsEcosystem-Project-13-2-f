id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: HTML 渲染导出无界面模块插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions:
  - file.read
  - file.write
  - platform.read
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: true
engines:
  chips: "^0.1.0"
os:
  - darwin
  - win32
  - linux
module:
  apiVersion: 1
  runtime: worker
  activation: onDemand
  provides:
    - capability: {{ MODULE_CAPABILITY }}
      version: "1.0.0"
      description: 将目录态 HTML 渲染导出为 PDF 或图片。
      methods:
        - name: convert
          mode: job
          inputSchema: contracts/convert.input.schema.json
          outputSchema: contracts/convert.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
