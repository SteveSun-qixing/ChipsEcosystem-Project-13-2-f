import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { ChipsButton, ChipsCardShell, ChipsCheckbox, ChipsCommandPalette, ChipsDataGrid, ChipsDateTime, ChipsDialog, ChipsDockPanel, ChipsEmptyState, ChipsErrorBoundary, ChipsFormField, ChipsFormGroup, ChipsInspector, ChipsInput, ChipsLoadingBoundary, ChipsMenu, ChipsNotification, ChipsPanelHeader, ChipsPopover, ChipsRadioGroup, ChipsSelect, ChipsSkeleton, ChipsSplitPane, ChipsSwitch, ChipsTabs, ChipsToast, ChipsTooltip, ChipsToolWindow, ChipsTree, ChipsVirtualList, P0_BASE_INTERACTIVE_COMPONENTS, P0_DATA_FORM_COMPONENTS, STAGE7_DATA_ADVANCED_COMPONENTS, STAGE7_WORKBENCH_COMPONENTS, STAGE8_SYSTEM_UX_COMPONENTS, } from "@chips/component-library";
function PreviewShell({ children }) {
    return _jsx("div", { className: "gallery-preview", children: children });
}
function ButtonPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsButton, { children: "Action" }) }));
}
function InputPreview() {
    const [value, setValue] = React.useState("Preview value");
    return (_jsx(PreviewShell, { children: _jsx(ChipsInput, { value: value, placeholder: "Type here", onValueChange: setValue }) }));
}
function CheckboxPreview() {
    const [checked, setChecked] = React.useState(true);
    return (_jsx(PreviewShell, { children: _jsx(ChipsCheckbox, { checked: checked, label: "Enable cards", onCheckedChange: setChecked }) }));
}
function RadioPreview() {
    const [value, setValue] = React.useState("compact");
    return (_jsx(PreviewShell, { children: _jsx(ChipsRadioGroup, { name: "layout-mode", value: value, onValueChange: setValue, options: [
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
            ] }) }));
}
function SwitchPreview() {
    const [checked, setChecked] = React.useState(false);
    return (_jsx(PreviewShell, { children: _jsx(ChipsSwitch, { checked: checked, label: "Enable animation", onCheckedChange: setChecked }) }));
}
function SelectPreview() {
    const [value, setValue] = React.useState("light");
    return (_jsx(PreviewShell, { children: _jsx(ChipsSelect, { value: value, placeholder: "Select a mode", onValueChange: setValue, options: [
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "Follow system" },
            ] }) }));
}
function DialogPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsDialog, { triggerContent: "Open dialog", title: "Install package", description: "This preview demonstrates the dialog surface.", children: _jsx("div", { className: "gallery-inline-stack", children: _jsx(ChipsButton, { children: "Confirm" }) }) }) }));
}
function PopoverPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsPopover, { triggerContent: "Preview popover", children: _jsxs("div", { className: "gallery-inline-stack", children: [_jsx("strong", { children: "Popover body" }), _jsx("span", { children: "Contextual helper content." })] }) }) }));
}
function TabsPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsTabs, { items: [
                { value: "theme", label: "Theme", content: _jsx("span", { children: "Theme preview" }) },
                { value: "layout", label: "Layout", content: _jsx("span", { children: "Layout preview" }) },
            ] }) }));
}
function MenuPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsMenu, { triggerContent: "Open menu", items: [
                { value: "rename", label: "Rename" },
                { value: "duplicate", label: "Duplicate" },
            ] }) }));
}
function TooltipPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsTooltip, { triggerContent: "Hover target", content: "Helpful explanation" }) }));
}
function FormFieldPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsFormField, { label: "Workspace name", description: "Used by the Host window title.", defaultValue: "Studio" }) }));
}
function FormGroupPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsFormGroup, { legend: "Startup behavior", description: "Applies when Host launches.", children: _jsxs("div", { className: "gallery-inline-stack", children: [_jsx(ChipsCheckbox, { defaultChecked: true, label: "Restore last theme" }), _jsx(ChipsCheckbox, { label: "Open plugin dashboard" })] }) }) }));
}
function VirtualListPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsVirtualList, { height: 180, items: Array.from({ length: 12 }, (_, index) => ({ value: index, label: `Item ${index + 1}` })) }) }));
}
function DataGridPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsDataGrid, { ariaLabel: "Theme tokens preview grid", columns: [
                { key: "token", label: "Token" },
                { key: "value", label: "Value" },
            ], rows: [
                { id: "1", token: "Surface", value: "#FFFFFF" },
                { id: "2", token: "Primary", value: "#0A6CFF" },
            ] }) }));
}
function TreePreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsTree, { ariaLabel: "Settings tree", defaultExpandedIds: ["appearance"], nodes: [
                {
                    id: "appearance",
                    label: "Appearance",
                    children: [
                        { id: "theme", label: "Theme" },
                        { id: "language", label: "Language" },
                    ],
                },
                { id: "plugins", label: "Plugins" },
            ] }) }));
}
function DateTimePreview() {
    const [value, setValue] = React.useState("2026-03-11T10:00");
    return (_jsx(PreviewShell, { children: _jsx(ChipsDateTime, { label: "Scheduled time", value: value, onValueChange: setValue }) }));
}
function CommandPalettePreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsCommandPalette, { triggerLabel: "Open command palette", searchPlaceholder: "Search commands", items: [
                { id: "theme", title: "Open theme settings", keywords: ["theme", "appearance"] },
                { id: "plugins", title: "Manage plugins", keywords: ["plugins", "install"] },
            ] }) }));
}
function SplitPanePreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsSplitPane, { ariaLabel: "Split preview", start: _jsx("div", { className: "gallery-pane", children: "Menu" }), end: _jsx("div", { className: "gallery-pane", children: "Content" }) }) }));
}
function DockPanelPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsDockPanel, { ariaLabel: "Dock preview", panels: [
                { id: "summary", title: "Summary", content: _jsx("span", { children: "Runtime summary" }) },
                { id: "logs", title: "Logs", content: _jsx("span", { children: "Logs stream" }) },
            ], defaultActivePanelId: "summary" }) }));
}
function InspectorPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsInspector, { ariaLabel: "Inspector preview", defaultOpenSectionIds: ["surface"], sections: [
                { id: "surface", title: "Surface", content: _jsx("span", { children: "Surface tokens" }) },
                { id: "text", title: "Text", content: _jsx("span", { children: "Typography tokens" }) },
            ] }) }));
}
function PanelHeaderPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsPanelHeader, { title: "Theme audit", subtitle: "Current token coverage", actions: _jsx(ChipsButton, { children: "Export" }) }) }));
}
function CardShellPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsCardShell, { title: "Theme card", toolbar: _jsx(StatusPill, { label: "Preview" }), footer: _jsx(ChipsButton, { children: "Action" }), children: _jsx("span", { children: "Reusable shell container." }) }) }));
}
function ToolWindowPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsToolWindow, { title: "Inspector", ariaLabel: "Inspector tool window", children: _jsx("div", { className: "gallery-inline-stack", children: _jsx("span", { children: "Persistent floating tool surface." }) }) }) }));
}
function ErrorBoundaryPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsErrorBoundary, { error: { code: "PREVIEW_ERROR", message: "Preview fallback" }, title: "Something failed", children: _jsx("span", { children: "Normal content" }) }) }));
}
function LoadingBoundaryPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsLoadingBoundary, { loading: true, delayMs: 0, loadingText: "Loading preview", children: _jsx("span", { children: "Ready content" }) }) }));
}
function NotificationPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsNotification, { ariaLabel: "Notification preview", items: [
                {
                    id: "theme-updated",
                    tone: "success",
                    title: "Theme applied",
                    message: "Current theme updated successfully.",
                    durationMs: 0,
                },
            ] }) }));
}
function ToastPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsToast, { ariaLabel: "Toast preview", entries: [
                {
                    id: "toast-item",
                    tone: "info",
                    message: "Host connection restored.",
                    durationMs: 0,
                },
            ] }) }));
}
function EmptyStatePreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsEmptyState, { ariaLabel: "Empty state preview", title: "No packages installed", description: "Drop a package to start." }) }));
}
function SkeletonPreview() {
    return (_jsx(PreviewShell, { children: _jsx(ChipsSkeleton, { ariaLabel: "Skeleton preview", loading: true, lines: 4 }) }));
}
function StatusPill({ label }) {
    return _jsx("span", { className: "gallery-status-pill", children: label });
}
const PREVIEW_BY_NAME = {
    ChipsButton: ButtonPreview,
    ChipsInput: InputPreview,
    ChipsCheckbox: CheckboxPreview,
    ChipsRadioGroup: RadioPreview,
    ChipsSwitch: SwitchPreview,
    ChipsSelect: SelectPreview,
    ChipsDialog: DialogPreview,
    ChipsPopover: PopoverPreview,
    ChipsTabs: TabsPreview,
    ChipsMenu: MenuPreview,
    ChipsTooltip: TooltipPreview,
    ChipsFormField: FormFieldPreview,
    ChipsFormGroup: FormGroupPreview,
    ChipsVirtualList: VirtualListPreview,
    ChipsDataGrid: DataGridPreview,
    ChipsTree: TreePreview,
    ChipsDateTime: DateTimePreview,
    ChipsCommandPalette: CommandPalettePreview,
    ChipsSplitPane: SplitPanePreview,
    ChipsDockPanel: DockPanelPreview,
    ChipsInspector: InspectorPreview,
    ChipsPanelHeader: PanelHeaderPreview,
    ChipsCardShell: CardShellPreview,
    ChipsToolWindow: ToolWindowPreview,
    ChipsErrorBoundary: ErrorBoundaryPreview,
    ChipsLoadingBoundary: LoadingBoundaryPreview,
    ChipsNotification: NotificationPreview,
    ChipsToast: ToastPreview,
    ChipsEmptyState: EmptyStatePreview,
    ChipsSkeleton: SkeletonPreview,
};
function toRegistrations(items) {
    return items.map((item) => ({
        name: item.name,
        scope: item.scope,
        parts: item.parts,
        preview: PREVIEW_BY_NAME[item.name],
    }));
}
export const COMPONENT_GROUPS = [
    {
        id: "foundation",
        titleKey: "settingsPanel.gallery.groups.foundation",
        items: toRegistrations(P0_BASE_INTERACTIVE_COMPONENTS),
    },
    {
        id: "forms",
        titleKey: "settingsPanel.gallery.groups.forms",
        items: toRegistrations(P0_DATA_FORM_COMPONENTS),
    },
    {
        id: "advanced-data",
        titleKey: "settingsPanel.gallery.groups.advancedData",
        items: toRegistrations(STAGE7_DATA_ADVANCED_COMPONENTS),
    },
    {
        id: "workbench",
        titleKey: "settingsPanel.gallery.groups.workbench",
        items: toRegistrations(STAGE7_WORKBENCH_COMPONENTS),
    },
    {
        id: "system-ux",
        titleKey: "settingsPanel.gallery.groups.systemUx",
        items: toRegistrations(STAGE8_SYSTEM_UX_COMPONENTS),
    },
];
