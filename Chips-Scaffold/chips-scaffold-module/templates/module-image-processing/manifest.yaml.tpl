id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 图像处理无界面模块插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions:
  - file.read
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
      description: 读取图像并输出稳定分析摘要。
      methods:
        - name: process
          mode: sync
          inputSchema: contracts/process.input.schema.json
          outputSchema: contracts/process.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} process
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: process
        timeoutMs: 30000
      titleKey: module.cli.process.title
      descriptionKey: module.cli.process.description
      permissions:
        - file.read
      arguments:
        - name: image-path
          position: 0
          type: path
          required: true
          mapsTo: imagePath
          path:
            kind: file
            exists: true
          ui:
            control: pathInput
            placeholderKey: module.cli.process.imagePath.placeholder
      options:
        - name: sample-size
          short: s
          type: integer
          default: 64
          mapsTo: options.sampleSize
          validation:
            min: 16
            max: 256
          ui:
            control: slider
            min: 16
            max: 256
            step: 1
      output:
        mode: json
        json: supported
