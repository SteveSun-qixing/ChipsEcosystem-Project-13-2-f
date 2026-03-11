import React from "react";
import { ChipsErrorBoundary, ChipsLoadingBoundary } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import type { SettingsPanelError } from "../runtime/errors";
import { normalizeSettingsError } from "../runtime/errors";

interface SectionStateBoundaryProps {
  loading: boolean;
  error: SettingsPanelError | null;
  loadingLabel: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

interface RuntimeRenderBoundaryProps {
  error: SettingsPanelError | null;
  retryLabel: string;
  loadingLabel: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

interface RuntimeRenderBoundaryState {
  capturedError: SettingsPanelError | null;
}

class RuntimeRenderBoundary extends React.Component<RuntimeRenderBoundaryProps, RuntimeRenderBoundaryState> {
  public override state: RuntimeRenderBoundaryState = {
    capturedError: null,
  };

  public static getDerivedStateFromError(error: unknown): RuntimeRenderBoundaryState {
    return {
      capturedError: normalizeSettingsError(error, "Failed to render settings section."),
    };
  }

  public override componentDidUpdate(previousProps: RuntimeRenderBoundaryProps): void {
    if (previousProps.error && !this.props.error && this.state.capturedError) {
      this.setState({ capturedError: null });
    }
  }

  private handleRetry = (): void => {
    this.setState({ capturedError: null });
    this.props.onRetry?.();
  };

  public override render(): React.ReactNode {
    const effectiveError = this.props.error ?? this.state.capturedError;

    if (effectiveError) {
      return (
        <ChipsErrorBoundary
          error={effectiveError}
          title={effectiveError.message}
          description={effectiveError.code}
          retryLabel={this.props.onRetry ? this.props.retryLabel : undefined}
          onRetry={this.props.onRetry ? this.handleRetry : undefined}
          ariaLabel={this.props.loadingLabel}
        />
      );
    }

    return this.props.children;
  }
}

export function SectionStateBoundary({
  loading,
  error,
  loadingLabel,
  onRetry,
  children,
}: SectionStateBoundaryProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <RuntimeRenderBoundary
      error={error}
      retryLabel={t("settingsPanel.app.retry")}
      loadingLabel={loadingLabel}
      onRetry={onRetry}
    >
      <ChipsLoadingBoundary loading={loading} loadingText={loadingLabel} ariaLabel={loadingLabel}>
        {children}
      </ChipsLoadingBoundary>
    </RuntimeRenderBoundary>
  );
}
