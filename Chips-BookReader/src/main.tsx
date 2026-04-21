import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";
import "./styles/reader-shell.css";
import "./styles/reader-chrome.css";
import "./styles/reader-panels.css";
import "./styles/reader-progress.css";
import "./styles/reader-animation.css";

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
