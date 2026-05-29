id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 图像颜色提取无界面模块插件。
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
      description: 从图像中提取背景色、强调色、调色板与采样诊断。
      methods:
        - name: pick
          mode: sync
          inputSchema: contracts/pick.input.schema.json
          outputSchema: contracts/pick.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} colors
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: pick
        timeoutMs: 30000
      titleKey: module.cli.colors.title
      descriptionKey: module.cli.colors.description
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
            placeholderKey: module.cli.colors.imagePath.placeholder
      options:
        - name: sample-size
          short: s
          type: integer
          default: 96
          mapsTo: options.sampleSize
          validation:
            min: 48
            max: 160
          ui:
            control: slider
            min: 48
            max: 160
            step: 1
      output:
        mode: json
        json: supported
