import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Client } from "chips-sdk";
import { chipsClient } from "../../runtime/chips-client";
import { useAppPreferences } from "../contexts/PreferencesContext";
import { useAuth } from "../contexts/AuthContext";
import { useAppRuntime } from "../../app/AppRuntimeProvider";
import { useAppText } from "../../i18n/useAppText";
import {
  configureCommunityApiBaseUrl,
  getCommunityApiBaseUrl,
} from "../api/client";
import {
  normalizeCommunityServerUrl,
  saveCommunityServerUrl,
} from "../lib/server-config";
import { getErrorMessage } from "../lib/ui";
import { Icon } from "../runtime/icons/Icon";
import "./SettingsPage.css";

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function nextLocale(locale: string): string {
  return locale === "zh-CN" ? "en-US" : "zh-CN";
}

export default function SettingsPage() {
  const { t } = useAppPreferences();
  const client: Client = chipsClient;
  const { user, logout } = useAuth();
  const runtime = useAppRuntime();
  const { locale } = useAppText();
  const [serverUrl, setServerUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  useEffect(() => {
    const current = getCommunityApiBaseUrl();
    if (current) {
      setServerUrl(current);
    }
  }, []);

  const handleSave = async () => {
    const normalized = normalizeCommunityServerUrl(serverUrl);
    if (!normalized) {
      setSaveStatus({ kind: "error", message: t("client.settings.invalidUrl") });
      return;
    }

    const previousUrl = getCommunityApiBaseUrl();
    setSaveStatus({ kind: "saving" });
    try {
      await saveCommunityServerUrl(client, normalized);
      if (previousUrl && previousUrl !== normalized) {
        await logout();
        configureCommunityApiBaseUrl(normalized);
        setServerUrl(normalized);
        setSaveStatus({ kind: "success", message: t("client.settings.savedRequireLogin") });
      } else {
        configureCommunityApiBaseUrl(normalized);
        setServerUrl(normalized);
        setSaveStatus({ kind: "success", message: t("client.settings.saved") });
      }
    } catch (nextError) {
      setSaveStatus({
        kind: "error",
        message: t("client.settings.saveFailed", { message: getErrorMessage(nextError, t("common.error")) }),
      });
    }
  };

  const handleLogout = async () => {
    const confirmed = await client.platform.showConfirm({
      title: t("common.logout"),
      message: t("common.logout"),
    });
    if (confirmed) {
      await logout();
    }
  };

  const switchLocale = () => {
    void runtime.setLocale(nextLocale(locale));
  };

  return (
    <div className="page-container settings-page">
      <header className="settings-page__header">
        <div>
          <span className="eyebrow">{t("client.settings.title")}</span>
          <h1>{t("client.settings.title")}</h1>
          <p className="muted">{t("client.settings.subtitle")}</p>
        </div>

        <Link to={user ? `/@${user.username}` : "/"} className="button button--secondary">
          <Icon name="arrow-left" size={16} />
          {t("common.back")}
        </Link>
      </header>

      <section className="panel settings-card">
        <div className="field">
          <label htmlFor="server-url">{t("client.settings.serverUrl")}</label>
          <input
            id="server-url"
            className="input"
            type="url"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder={t("client.settings.serverUrlPlaceholder")}
            disabled={saveStatus.kind === "saving"}
          />
          <p className="muted settings-card__hint">{t("client.settings.serverUrlHint")}</p>
        </div>

        <div className="settings-card__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void handleSave()}
            disabled={saveStatus.kind === "saving"}
          >
            {saveStatus.kind === "saving" ? t("common.loading") : t("client.settings.save")}
          </button>
        </div>

        {saveStatus.kind === "success" ? (
          <div className="inline-notice inline-notice--success" role="status">
            {saveStatus.message}
          </div>
        ) : null}
        {saveStatus.kind === "error" ? (
          <div className="inline-notice inline-notice--danger" role="alert">
            {saveStatus.message}
          </div>
        ) : null}
      </section>

      <section className="panel settings-card">
        <div className="settings-card__row">
          <div>
            <strong>{t("app.shell.languageSwitch", { locale: nextLocale(locale) })}</strong>
            <p className="muted">{locale}</p>
          </div>
          <button type="button" className="button button--secondary" onClick={switchLocale}>
            {t("app.shell.languageSwitch", { locale: nextLocale(locale) })}
          </button>
        </div>
      </section>

      <section className="panel settings-card">
        <div className="settings-card__row">
          <div>
            <strong>{user ? t("client.settings.loggedInAs", { username: user.username }) : t("auth.loginTitle")}</strong>
            <p className="muted">{user ? user.username : t("auth.loginSubtitle")}</p>
          </div>
          {user ? (
            <button type="button" className="button button--ghost" onClick={() => void handleLogout()}>
              <Icon name="logout" />
              {t("client.settings.logout")}
            </button>
          ) : (
            <Link to="/login" className="button button--primary">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
