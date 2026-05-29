id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 模块编排无界面插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions:
  - module.read
  - module.invoke
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
      description: 编排下游模块能力并返回统一结果。
      methods:
        - name: execute
          mode: job
          inputSchema: contracts/execute.input.schema.json
          outputSchema: contracts/execute.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} execute
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: execute
        timeoutMs: 60000
      titleKey: module.cli.execute.title
      descriptionKey: module.cli.execute.description
      permissions:
        - module.read
        - module.invoke
      arguments:
        - name: steps
          position: 0
          type: json
          required: true
          mapsTo: steps
          ui:
            control: textarea
            placeholderKey: module.cli.execute.steps.placeholder
      output:
        mode: json
        json: supported
      job:
        wait: true
        cancelOnInterrupt: true
