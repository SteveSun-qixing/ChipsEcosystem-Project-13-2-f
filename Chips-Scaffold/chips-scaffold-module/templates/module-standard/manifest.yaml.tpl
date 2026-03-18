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
  consumes: []
