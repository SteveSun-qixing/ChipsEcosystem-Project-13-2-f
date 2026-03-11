import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export function DropZone({ title, description, active, disabled = false, onDropFiles }) {
    const handleDragOver = React.useCallback((event) => {
        if (disabled) {
            return;
        }
        event.preventDefault();
    }, [disabled]);
    const handleDrop = React.useCallback((event) => {
        if (disabled) {
            return;
        }
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length > 0) {
            onDropFiles(files);
        }
    }, [disabled, onDropFiles]);
    return (_jsxs("div", { className: `drop-zone${active ? " drop-zone--active" : ""}${disabled ? " drop-zone--disabled" : ""}`, onDragOver: handleDragOver, onDrop: handleDrop, children: [_jsx("div", { className: "drop-zone__title", children: title }), _jsx("div", { className: "drop-zone__description", children: description })] }));
}
