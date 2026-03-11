import { jsx as _jsx } from "react/jsx-runtime";
import { ChipsNotification } from "@chips/component-library";
export function NotificationStack({ ariaLabel, items }) {
    if (items.length === 0) {
        return null;
    }
    return _jsx(ChipsNotification, { ariaLabel: ariaLabel, items: items });
}
