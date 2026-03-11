import * as React from "react";

export type InteractiveState = "disabled" | "loading" | "error" | "active" | "focus" | "hover" | "idle";

export interface StandardErrorLike {
  code?: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface ComponentMeta {
  name: string;
  scope: string;
  parts: string[];
  states: string[];
}

export interface ObservationRecord {
  traceId?: string;
  component: string;
  action: string;
  durationMs: number;
  error?: StandardErrorLike | null;
  [key: string]: unknown;
}

export interface ConfigSource {
  get?(key: string): unknown;
  [key: string]: unknown;
}

export interface I18nTextSource {
  t?(key: string, params?: Record<string, string | number>): string;
  translate?(key: string, params?: Record<string, string | number>): string;
  [key: string]: unknown;
}

export interface SystemMessageItem {
  id: string;
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  message?: string;
  actionLabel?: string;
  actionKey?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface SortState {
  key: string;
  direction: "asc" | "desc";
}

export interface TreeNode {
  id: string;
  label?: React.ReactNode;
  disabled?: boolean;
  children?: TreeNode[];
  [key: string]: unknown;
}

export interface CommandPaletteItem {
  id?: string | number;
  title?: string;
  subtitle?: string;
  keywords?: string[];
  disabled?: boolean;
  [key: string]: unknown;
}

export interface VirtualItem {
  value?: string | number;
  label?: React.ReactNode;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface DataGridColumn {
  key: string;
  label?: string;
  sortable?: boolean;
}

export interface DataGridRow {
  id?: string | number;
  [key: string]: unknown;
}

export interface DockPanelItem {
  id: string;
  title?: string;
  content?: React.ReactNode;
  [key: string]: unknown;
}

export interface InspectorSection {
  id: string;
  title?: string;
  content?: React.ReactNode;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface ButtonProps {
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  toggleable?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPress?: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void;
  onPressedChange?: (pressed: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface InputProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  readOnly?: boolean;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  onEnterPress?: (value: string) => void;
  [key: string]: unknown;
}

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  label?: React.ReactNode;
  name?: string;
  value?: string;
  onCheckedChange?: (checked: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface RadioGroupOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  options?: RadioGroupOption[];
  onValueChange?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  label?: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  placeholder?: string;
  iconContent?: React.ReactNode;
  options?: SelectOption[];
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  triggerContent?: React.ReactNode;
  closeButtonLabel?: string;
  closeButtonContent?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  onCloseReason?: (reason: string) => void;
  [key: string]: unknown;
}

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  triggerContent?: React.ReactNode;
  children?: React.ReactNode;
  closeOnEscape?: boolean;
  onOpenChange?: (open: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface TabsItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items?: TabsItem[];
  value?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  onValueChange?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface MenuItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface MenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  triggerContent?: React.ReactNode;
  items?: MenuItem[];
  closeOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface TooltipProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  triggerContent?: React.ReactNode;
  content?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface FormFieldProps {
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  readOnly?: boolean;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  controlProps?: Record<string, unknown>;
  onValueChange?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface FormGroupProps {
  legend?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  children?: React.ReactNode;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface VirtualListProps {
  items?: VirtualItem[];
  itemHeight?: number;
  height?: number;
  overscan?: number;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  activeIndex?: number;
  defaultActiveIndex?: number;
  renderItem?: (item: VirtualItem, index: number) => React.ReactNode;
  onActiveIndexChange?: (index: number) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface DataGridProps {
  columns?: DataGridColumn[];
  rows?: DataGridRow[];
  sort?: SortState | null;
  defaultSort?: SortState | null;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  onSortChange?: (sort: SortState | null) => void;
  onSelectedRowIdsChange?: (rowIds: string[]) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface TreeProps {
  nodes?: TreeNode[];
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  expandIconContent?: React.ReactNode;
  collapseIconContent?: React.ReactNode;
  onExpandedIdsChange?: (expandedIds: string[]) => void;
  onSelectedIdChange?: (selectedId: string | null) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface DateTimeProps {
  id?: string;
  label?: React.ReactNode;
  ariaLabel?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  readOnly?: boolean;
  iconContent?: React.ReactNode;
  onValueChange?: (value: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface CommandPaletteProps {
  open?: boolean;
  defaultOpen?: boolean;
  query?: string;
  defaultQuery?: string;
  items?: CommandPaletteItem[];
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  triggerLabel?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  onOpenChange?: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
  onSelect?: (item: CommandPaletteItem) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface SplitPaneProps {
  orientation?: "horizontal" | "vertical";
  ratio?: number;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
  onRatioChange?: (ratio: number) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface DockPanelProps {
  panels?: DockPanelItem[];
  panelStates?: Record<string, string>;
  defaultPanelStates?: Record<string, string>;
  activePanelId?: string;
  defaultActivePanelId?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  onPanelStatesChange?: (panelStates: Record<string, string>) => void;
  onActivePanelIdChange?: (activePanelId: string) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface InspectorProps {
  sections?: InspectorSection[];
  openSectionIds?: string[];
  defaultOpenSectionIds?: string[];
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  onOpenSectionIdsChange?: (sectionIds: string[]) => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface PanelHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  closable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  expandIconContent?: React.ReactNode;
  collapseIconContent?: React.ReactNode;
  closeIconContent?: React.ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
  onClose?: () => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface CardShellProps {
  title?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface ToolWindowProps {
  title?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  minimized?: boolean;
  defaultMinimized?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  expandIconContent?: React.ReactNode;
  collapseIconContent?: React.ReactNode;
  closeIconContent?: React.ReactNode;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onMinimizedChange?: (minimized: boolean) => void;
  onFocus?: () => void;
  onStateChange?: (state: InteractiveState) => void;
  [key: string]: unknown;
}

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode | ((payload: { error: StandardErrorLike | null; state: InteractiveState }) => React.ReactNode);
  resetKeys?: unknown[];
  error?: StandardErrorLike | null;
  disabled?: boolean;
  loading?: boolean;
  title?: React.ReactNode;
  titleKey?: string;
  description?: React.ReactNode;
  descriptionKey?: string;
  retryLabel?: React.ReactNode;
  retryLabelKey?: string;
  showErrorMessage?: boolean;
  ariaLabel?: string;
  i18n?: I18nTextSource;
  traceId?: string;
  onError?: (error: StandardErrorLike) => void;
  onRetry?: () => void;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export interface LoadingBoundaryProps {
  children?: React.ReactNode;
  loading?: boolean;
  delayMs?: number;
  skeletonLines?: number;
  fallback?: React.ReactNode | ((payload: { state: InteractiveState; loading: boolean }) => React.ReactNode);
  disabled?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel?: string;
  ariaLabelKey?: string;
  loadingText?: React.ReactNode;
  loadingTextKey?: string;
  i18n?: I18nTextSource;
  configSource?: ConfigSource;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export interface NotificationProps {
  items?: SystemMessageItem[];
  defaultItems?: SystemMessageItem[];
  maxVisible?: number;
  defaultDurationMs?: number;
  closeButtonLabel?: string;
  closeButtonLabelKey?: string;
  closeIconContent?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel: string;
  i18n?: I18nTextSource;
  configSource?: ConfigSource;
  traceId?: string;
  onItemsChange?: (items: SystemMessageItem[]) => void;
  onDismiss?: (item: SystemMessageItem, reason?: string) => void;
  onAction?: (item: SystemMessageItem) => void;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export interface ToastProps {
  entries?: SystemMessageItem[];
  defaultEntries?: SystemMessageItem[];
  maxVisible?: number;
  defaultDurationMs?: number;
  closeButtonLabel?: string;
  closeButtonLabelKey?: string;
  closeIconContent?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel: string;
  placement?: string;
  i18n?: I18nTextSource;
  configSource?: ConfigSource;
  traceId?: string;
  onEntriesChange?: (entries: SystemMessageItem[]) => void;
  onDismiss?: (item: SystemMessageItem, reason?: string) => void;
  onAction?: (item: SystemMessageItem) => void;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  titleKey?: string;
  description?: React.ReactNode;
  descriptionKey?: string;
  actionLabel?: React.ReactNode;
  actionLabelKey?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel: string;
  i18n?: I18nTextSource;
  onAction?: () => void;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export interface SkeletonProps {
  lines?: number;
  loading?: boolean;
  disabled?: boolean;
  error?: StandardErrorLike | null;
  ariaLabel: string;
  i18n?: I18nTextSource;
  onStateChange?: (state: InteractiveState) => void;
  onDiagnostic?: (record: ObservationRecord) => void;
  [key: string]: unknown;
}

export const InteractiveEventType: {
  readonly POINTER_ENTER: "pointer-enter";
  readonly POINTER_LEAVE: "pointer-leave";
  readonly FOCUS: "focus";
  readonly BLUR: "blur";
  readonly PRESS_START: "press-start";
  readonly PRESS_END: "press-end";
};

export const COMPONENT_TOKEN_MAP: Record<string, string[]>;

export const ChipsButton: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export const ChipsInput: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export const ChipsCheckbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLInputElement>>;
export const ChipsRadioGroup: React.ForwardRefExoticComponent<RadioGroupProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsSwitch: React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLButtonElement>>;
export const ChipsSelect: React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsDialog: React.ForwardRefExoticComponent<DialogProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsPopover: React.ForwardRefExoticComponent<PopoverProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsTabs: React.ForwardRefExoticComponent<TabsProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsMenu: React.ForwardRefExoticComponent<MenuProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsTooltip: React.ForwardRefExoticComponent<TooltipProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsFormField: React.ForwardRefExoticComponent<FormFieldProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsFormGroup: React.ForwardRefExoticComponent<FormGroupProps & React.RefAttributes<HTMLFieldSetElement>>;
export const ChipsVirtualList: React.ForwardRefExoticComponent<VirtualListProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsDataGrid: React.ForwardRefExoticComponent<DataGridProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsTree: React.ForwardRefExoticComponent<TreeProps & React.RefAttributes<HTMLUListElement>>;
export const ChipsDateTime: React.ForwardRefExoticComponent<DateTimeProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsCommandPalette: React.ForwardRefExoticComponent<CommandPaletteProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsSplitPane: React.ForwardRefExoticComponent<SplitPaneProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsDockPanel: React.ForwardRefExoticComponent<DockPanelProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsInspector: React.ForwardRefExoticComponent<InspectorProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsPanelHeader: React.ForwardRefExoticComponent<PanelHeaderProps & React.RefAttributes<HTMLElement>>;
export const ChipsCardShell: React.ForwardRefExoticComponent<CardShellProps & React.RefAttributes<HTMLElement>>;
export const ChipsToolWindow: React.ForwardRefExoticComponent<ToolWindowProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsErrorBoundary: React.ForwardRefExoticComponent<ErrorBoundaryProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsLoadingBoundary: React.ForwardRefExoticComponent<LoadingBoundaryProps & React.RefAttributes<HTMLElement>>;
export const ChipsNotification: React.ForwardRefExoticComponent<NotificationProps & React.RefAttributes<HTMLElement>>;
export const ChipsToast: React.ForwardRefExoticComponent<ToastProps & React.RefAttributes<HTMLElement>>;
export const ChipsEmptyState: React.ForwardRefExoticComponent<EmptyStateProps & React.RefAttributes<HTMLDivElement>>;
export const ChipsSkeleton: React.ForwardRefExoticComponent<SkeletonProps & React.RefAttributes<HTMLDivElement>>;

export function resolveInteractiveState(params: {
  disabled?: boolean;
  loading?: boolean;
  error?: StandardErrorLike | null;
  interaction?: { hovered?: boolean; focused?: boolean; active?: boolean };
}): InteractiveState;
export function interactiveStateReducer(
  state: { hovered?: boolean; focused?: boolean; active?: boolean },
  event: { type: (typeof InteractiveEventType)[keyof typeof InteractiveEventType] },
): { hovered: boolean; focused: boolean; active: boolean };
export function buildComponentContract(meta: ComponentMeta): ComponentMeta;
export function validateComponentA11y(component: string, props: Record<string, unknown>): boolean;
export const P0_BASE_INTERACTIVE_COMPONENTS: ComponentMeta[];
export const P0_DATA_FORM_COMPONENTS: ComponentMeta[];
export const STAGE7_DATA_ADVANCED_COMPONENTS: ComponentMeta[];
export const STAGE7_WORKBENCH_COMPONENTS: ComponentMeta[];
export const STAGE8_SYSTEM_UX_COMPONENTS: ComponentMeta[];
export function applyDataGridSort<T extends DataGridRow>(rows: T[], sort?: SortState | null): T[];
export function clampSplitRatio(ratio: number, minRatio?: number, maxRatio?: number): number;
export function computeVirtualWindow(params: {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}): { start: number; end: number; offsetTop: number; offsetBottom: number };
export function createComponentMeta(meta: ComponentMeta): ComponentMeta;
export function createObservationRecord(record: ObservationRecord): ObservationRecord;
export function dismissSystemMessage<T extends { id: string }>(items: T[], targetId: string): T[];
export function filterCommandPaletteItems<T extends CommandPaletteItem>(items: T[], query?: string): T[];
export function findTreeParentId(nodes: TreeNode[], nodeId: string): string | null;
export function flattenTreeNodes(nodes: TreeNode[], expandedIds?: string[]): Array<TreeNode & { parentId?: string; hasChildren?: boolean; expanded?: boolean }>;
export function getNextEnabledIndex(
  items: Array<{ disabled?: boolean }>,
  startIndex: number,
  direction: "next" | "prev",
  loop?: boolean,
): number;
export function normalizeSystemMessageItems(items: SystemMessageItem[], kind: string): Array<SystemMessageItem & { effectiveDurationMs?: number }>;
export function parsePositiveInteger(value: unknown): number | null;
export function resolveConfigValue<T>(params: {
  configSource?: ConfigSource;
  key: string;
  defaultValue: T;
  parser?: (value: unknown) => T;
  onDiagnostic?: (record: ObservationRecord | Record<string, unknown>) => void;
}): T;
export function resolveDockPanelStateMap(panels: DockPanelItem[], stateMap?: Record<string, string>): Record<string, string>;
export function resolveI18nText(params: {
  i18n?: I18nTextSource;
  key: string;
  fallback: string;
  params?: Record<string, string | number>;
  onDiagnostic?: (record: ObservationRecord | Record<string, unknown>) => void;
}): string;
export function toStandardError(error: unknown, fallbackCode?: string): StandardErrorLike;
export function toggleInspectorSection(sectionIds: string[] | undefined, sectionId: string): string[];
