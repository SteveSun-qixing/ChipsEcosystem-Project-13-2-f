import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("未找到根节点 #root");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

