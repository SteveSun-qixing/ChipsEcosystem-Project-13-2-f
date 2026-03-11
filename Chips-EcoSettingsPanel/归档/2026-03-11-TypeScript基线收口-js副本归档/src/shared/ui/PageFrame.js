import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChipsPanelHeader } from "@chips/component-library";
export function PageFrame({ title, subtitle, actions, children }) {
    return (_jsxs("section", { className: "page-frame", children: [_jsx(ChipsPanelHeader, { title: title, subtitle: subtitle, actions: actions }), _jsx("div", { className: "page-frame__body", children: children })] }));
}
