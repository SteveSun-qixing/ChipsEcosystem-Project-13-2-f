import { jsx as _jsx } from "react/jsx-runtime";
import { ChipsInput } from "@chips/component-library";
export function SearchField({ value, placeholder, onChange }) {
    return (_jsx("div", { className: "search-field", children: _jsx(ChipsInput, { value: value, placeholder: placeholder, onValueChange: onChange }) }));
}
