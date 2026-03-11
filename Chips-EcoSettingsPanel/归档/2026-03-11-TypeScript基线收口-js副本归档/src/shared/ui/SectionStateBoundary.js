import { jsx as _jsx } from "react/jsx-runtime";
import { ChipsErrorBoundary, ChipsLoadingBoundary } from "@chips/component-library";
export function SectionStateBoundary({ loading, error, loadingLabel, onRetry, children, }) {
    return (_jsx(ChipsErrorBoundary, { error: error, title: error?.message, description: error?.code, retryLabel: onRetry ? loadingLabel : undefined, onRetry: onRetry, ariaLabel: loadingLabel, children: _jsx(ChipsLoadingBoundary, { loading: loading, loadingText: loadingLabel, ariaLabel: loadingLabel, children: children }) }));
}
