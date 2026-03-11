import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./app/styles.css";
const container = document.getElementById("root");
if (!container) {
    throw new Error("Root container #root was not found.");
}
ReactDOM.createRoot(container).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
