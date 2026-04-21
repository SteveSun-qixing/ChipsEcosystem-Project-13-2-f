import React from "react";
import type { ReaderPreferences } from "../utils/book-reader";
import { PanelShell } from "./PanelShell";

export interface PreferencesPanelProps {
  preferences: ReaderPreferences;
  onUpdatePreferences: (prefs: ReaderPreferences) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function PreferencesPanel(props: PreferencesPanelProps): React.ReactElement {
  const { preferences, onUpdatePreferences, onClose, t } = props;

  return (
    <PanelShell
      title={t("book-reader.labels.preferences")}
      eyebrow={t("book-reader.labels.appName")}
      onClose={onClose}
      className="book-reader-panel--preferences"
      t={t}
    >
      <div className="book-reader-preferences">
        <section className="book-reader-preferences__section">
          <h3>{t("book-reader.labels.readingMode")}</h3>
          <div className="book-reader-chipRow">
            {(["paginated", "scroll"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`book-reader-chip${preferences.readingMode === mode ? " book-reader-chip--active" : ""}`}
                onClick={() => onUpdatePreferences({ ...preferences, readingMode: mode })}
              >
                {t(`book-reader.labels.${mode}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="book-reader-preferences__section">
          <h3>{t("book-reader.labels.backgroundTone")}</h3>
          <div className="book-reader-chipRow">
            {(["theme", "warm", "mist", "night"] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                className={`book-reader-chip${preferences.backgroundTone === tone ? " book-reader-chip--active" : ""}`}
                onClick={() => onUpdatePreferences({ ...preferences, backgroundTone: tone })}
              >
                {tone === "theme"
                  ? t("book-reader.labels.backgroundTheme")
                  : t(`book-reader.labels.background${tone.charAt(0).toUpperCase()}${tone.slice(1)}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="book-reader-preferences__section">
          <h3>{t("book-reader.labels.fontFamily")}</h3>
          <div className="book-reader-chipRow">
            {(["serif", "sans"] as const).map((family) => (
              <button
                key={family}
                type="button"
                className={`book-reader-chip${preferences.fontFamily === family ? " book-reader-chip--active" : ""}`}
                onClick={() => onUpdatePreferences({ ...preferences, fontFamily: family })}
              >
                {t(`book-reader.labels.${family}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="book-reader-preferences__section">
          <div className="book-reader-sliderLabel">
            <span>{t("book-reader.labels.fontScale")}</span>
            <strong>{Math.round(preferences.fontScale * 100)}%</strong>
          </div>
          <input
            type="range"
            min={0.85}
            max={1.4}
            step={0.05}
            value={preferences.fontScale}
            onChange={(event) =>
              onUpdatePreferences({
                ...preferences,
                fontScale: Number(event.target.value),
              })
            }
          />
        </section>

        <section className="book-reader-preferences__section">
          <div className="book-reader-sliderLabel">
            <span>{t("book-reader.labels.contentWidth")}</span>
            <strong>{preferences.contentWidth}px</strong>
          </div>
          <input
            type="range"
            min={560}
            max={980}
            step={20}
            value={preferences.contentWidth}
            onChange={(event) =>
              onUpdatePreferences({
                ...preferences,
                contentWidth: Number(event.target.value),
              })
            }
          />
        </section>
      </div>
    </PanelShell>
  );
}
