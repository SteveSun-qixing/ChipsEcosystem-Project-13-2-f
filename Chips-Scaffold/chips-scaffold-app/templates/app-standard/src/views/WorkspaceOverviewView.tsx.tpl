import {
  ChipsBadge,
  ChipsSection,
  ChipsStack,
  ChipsText,
  useChipsDiagnostics,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme,
} from "@chips/component-library";
import { useAppText } from "../i18n/useAppText";
import { resolveThemeLabel } from "../theme/theme-runtime";

export function WorkspaceOverviewView() {
  const { text, locale } = useAppText();
  const theme = useChipsTheme();
  const surface = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();
  const hasCommandPermission = permission.hasPermission("command.invoke");

  return (
    <ChipsSection
      title={text("app.workspace.overviewTitle")}
      description={text("app.workspace.overviewDescription")}
    >
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
            {surface.surface?.kind ?? text("app.workspace.unknown")}
          </ChipsText>
        </div>
        <div className="app-status-item">
          <ChipsText>{text("app.workspace.permissionLabel")}</ChipsText>
          <ChipsStack gap="sm">
            <ChipsBadge
              tone={hasCommandPermission ? "success" : "warning"}
              label={hasCommandPermission
                ? text("app.workspace.permissionReady")
                : text("app.workspace.permissionMissing")}
            />
            <ChipsText className="app-status-item__value">
              {text("app.workspace.diagnosticsLabel")}: {diagnostics.diagnostics.length}
            </ChipsText>
          </ChipsStack>
        </div>
      </div>
    </ChipsSection>
  );
}
