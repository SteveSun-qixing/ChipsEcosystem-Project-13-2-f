id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 纯函数无界面模块插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions: []
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
      description: 同步处理输入并返回归一化结果。
      methods:
        - name: run
          mode: sync
          inputSchema: contracts/run.input.schema.json
          outputSchema: contracts/run.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} run
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: run
        timeoutMs: 30000
      titleKey: module.cli.run.title
      descriptionKey: module.cli.run.description
      arguments:
        - name: value
          position: 0
          type: text
          required: true
          mapsTo: value
          ui:
            control: pasteBox
            placeholderKey: module.cli.run.value.placeholder
      options:
        - name: trim
          short: t
          type: boolean
          default: true
          mapsTo: trim
          ui:
            control: toggle
        - name: case-mode
          short: c
          type: enum
          default: preserve
          choices: [preserve, upper, lower]
          mapsTo: caseMode
          ui:
            control: select
            choices: [preserve, upper, lower]
      output:
        mode: json
        json: supported
