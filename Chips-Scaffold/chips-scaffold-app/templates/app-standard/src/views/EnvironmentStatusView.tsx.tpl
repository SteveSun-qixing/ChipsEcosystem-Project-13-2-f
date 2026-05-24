import {
  ChipsButton,
  ChipsEmptyState,
  ChipsSection,
  ChipsStack,
  ChipsText,
  useChipsDiagnostics,
  useChipsI18n,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme,
} from "@chips/component-library";
import { useAppText } from "../i18n/useAppText";
import { resolveThemeLabel } from "../theme/theme-runtime";

export function EnvironmentStatusView() {
  const { text, locale } = useAppText();
  const theme = useChipsTheme();
  const i18n = useChipsI18n();
  const surface = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();

  function refreshEnvironment() {
    void Promise.all([
      theme.refresh(),
      i18n.refresh(),
      surface.refresh(),
      diagnostics.refresh(),
    ]);
  }

  return (
    <ChipsSection
      title={text("app.workspace.environmentTitle")}
      description={text("app.scenes.settings.description")}
    >
      <ChipsStack gap="md">
        <div className="app-status-grid">
          <div className="app-status-item">
            <ChipsText>{text("app.workspace.themeLabel")}</ChipsText>
            <ChipsText className="app-status-item__value">
              {resolveThemeLabel(theme.theme)}
            </ChipsText>
          </div>
          <div className="app-status-item">
            <ChipsText>{text("app.workspace.localeLabel")}</ChipsText>
            <ChipsText className="app-status-item__value">{locale}</ChipsText>
          </div>
          <div className="app-status-item">
            <ChipsText>{text("app.workspace.surfaceLabel")}</ChipsText>
            <ChipsText className="app-status-item__value">
              {surface.surface?.surfaceId ?? surface.surface?.kind ?? text("app.workspace.unknown")}
            </ChipsText>
          </div>
          <div className="app-status-item">
            <ChipsText>{text("app.workspace.permissionLabel")}</ChipsText>
            <ChipsText className="app-status-item__value">
              {permission.hasPermission("command.invoke")
                ? text("app.workspace.permissionReady")
                : text("app.workspace.permissionMissing")}
            </ChipsText>
          </div>
        </div>
        {diagnostics.diagnostics.length === 0 ? (
          <ChipsEmptyState
            title={text("app.workspace.emptyTitle")}
            description={text("app.workspace.emptyDescription")}
            actionLabel={text("app.workspace.emptyAction")}
            ariaLabel={text("app.workspace.emptyTitle")}
            onAction={refreshEnvironment}
          />
        ) : (
          <ChipsButton type="button" onPress={diagnostics.clear}>
            {text("app.workspace.emptyAction")}
          </ChipsButton>
        )}
      </ChipsStack>
    </ChipsSection>
  );
}
