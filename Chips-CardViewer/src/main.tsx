import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { createLogger, createTraceId } from "../config/logging";

const bootstrapTraceId = createTraceId("bootstrap");
const bootstrapLogger = createLogger({
  scope: "bootstrap",
  traceId: bootstrapTraceId,
});

window.addEventListener("error", (event) => {
  bootstrapLogger.error("捕获到全局 window error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  bootstrapLogger.error("捕获到全局 unhandledrejection", {
    reason: event.reason,
  });
});

const container = document.getElementById("root");

if (!container) {
  bootstrapLogger.error("未找到根节点 #root");
  throw new Error("未找到根节点 #root");
}

const root = ReactDOM.createRoot(container);

bootstrapLogger.info("开始挂载 React 根组件");

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
