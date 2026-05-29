id: {{ PLUGIN_ID }}
name: {{ DISPLAY_NAME }}
version: {{ VERSION }}
type: module
entry: dist/index.mjs
description: 基于 chips-scaffold-module 生成的标准模块插件。
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
      methods:
        - name: run
          mode: sync
          inputSchema: contracts/run.input.schema.json
          outputSchema: contracts/run.output.schema.json
        - name: runAsync
          mode: job
          inputSchema: contracts/runAsync.input.schema.json
          outputSchema: contracts/runAsync.output.schema.json
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
        - name: source-text
          position: 0
          type: text
          required: true
          mapsTo: sourceText
          ui:
            control: pasteBox
            placeholderKey: module.cli.run.sourceText.placeholder
      options:
        - name: uppercase
          short: u
          type: boolean
          default: false
          mapsTo: uppercase
          ui:
            control: toggle
        - name: prefix
          short: p
          type: string
          mapsTo: prefix
      output:
        mode: json
        json: supported
    - commandPath: {{ CLI_COMMAND_ROOT }} run-async
      target:
        type: module
        capability: {{ MODULE_CAPABILITY }}
        method: runAsync
        timeoutMs: 60000
      titleKey: module.cli.runAsync.title
      descriptionKey: module.cli.runAsync.description
      arguments:
        - name: source-text
          position: 0
          type: text
          required: true
          mapsTo: sourceText
          ui:
            control: pasteBox
            placeholderKey: module.cli.runAsync.sourceText.placeholder
      options:
        - name: uppercase
          short: u
          type: boolean
          default: false
          mapsTo: uppercase
          ui:
            control: toggle
        - name: prefix
          short: p
          type: string
          mapsTo: prefix
        - name: delay-ms
          short: d
          type: integer
          default: 25
          mapsTo: delayMs
          validation:
            min: 0
            max: 60000
          ui:
            control: slider
            min: 0
            max: 60000
            step: 25
      output:
        mode: json
        json: supported
      job:
        wait: true
        cancelOnInterrupt: true
