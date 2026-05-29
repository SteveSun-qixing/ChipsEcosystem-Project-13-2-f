id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 文件转换无界面模块插件。
author:
  name: {{ AUTHOR_NAME }}
  email: {{ AUTHOR_EMAIL }}
permissions:
  - file.read
  - file.write
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
      description: 将输入文件转换为输出工件。
      methods:
        - name: convert
          mode: job
          inputSchema: contracts/convert.input.schema.json
          outputSchema: contracts/convert.output.schema.json
  consumes:{{ MODULE_CONSUMES_YAML }}
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} convert
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: convert
        timeoutMs: 60000
      titleKey: module.cli.convert.title
      descriptionKey: module.cli.convert.description
      permissions:
        - file.read
        - file.write
      arguments:
        - name: source-file
          position: 0
          type: path
          required: true
          mapsTo: sourceFile
          path:
            kind: file
            exists: true
          ui:
            control: pathInput
            placeholderKey: module.cli.convert.sourceFile.placeholder
        - name: output-path
          position: 1
          type: path
          required: true
          mapsTo: output.path
          path:
            kind: any
            create: false
          ui:
            control: pathInput
            placeholderKey: module.cli.convert.outputPath.placeholder
      options:
        - name: overwrite
          short: o
          type: boolean
          default: false
          mapsTo: output.overwrite
          ui:
            control: toggle
        - name: options
          type: json
          default: {}
          mapsTo: options
          ui:
            control: textarea
            placeholderKey: module.cli.convert.options.placeholder
      output:
        mode: json
        json: supported
        artifacts:
          - outputPath
      job:
        wait: true
        cancelOnInterrupt: true
