import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusBadge({ tone, label }) {
    return (_jsxs("span", { className: `status-badge status-badge--${tone}`, children: [_jsx("span", { className: "status-badge__dot", "aria-hidden": "true" }), _jsx("span", { children: label })] }));
}
