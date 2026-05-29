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
cli:
  commands:
    - commandPath: {{ CLI_COMMAND_ROOT }} render
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: convert
        timeoutMs: 60000
      titleKey: module.cli.render.title
      descriptionKey: module.cli.render.description
      permissions:
        - file.read
        - file.write
        - platform.read
      arguments:
        - name: html-dir
          position: 0
          type: path
          required: true
          mapsTo: htmlDir
          path:
            kind: directory
            exists: true
          ui:
            control: pathInput
            placeholderKey: module.cli.render.htmlDir.placeholder
        - name: output-file
          position: 1
          type: path
          required: true
          mapsTo: outputFile
          path:
            kind: any
            create: false
          ui:
            control: pathInput
            placeholderKey: module.cli.render.outputFile.placeholder
      options:
        - name: target
          short: t
          type: enum
          required: true
          default: pdf
          choices: [pdf, image]
          mapsTo: options.target
          ui:
            control: select
            choices: [pdf, image]
        - name: entry-file
          short: e
          type: string
          default: index.html
          mapsTo: entryFile
        - name: pdf-options
          type: json
          default: {}
          mapsTo: options.pdf
          ui:
            control: textarea
            placeholderKey: module.cli.render.pdfOptions.placeholder
        - name: image-options
          type: json
          default: {}
          mapsTo: options.image
          ui:
            control: textarea
            placeholderKey: module.cli.render.imageOptions.placeholder
      output:
        mode: json
        json: supported
        artifacts:
          - outputFile
      job:
        wait: true
        cancelOnInterrupt: true
