import React, { startTransition, useDeferredValue } from "react";
import ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { createClient, type Client } from "chips-sdk";
import { createLogger } from "../../config/logging";
import { formatMessage, resolveLocale } from "./i18n";
import type {
  ModuleFeatureItem,
  ModuleHandle,
  ModuleMountContext,
  ModuleRuntimeBootState,
  ModuleSnapshot,
} from "./types";

const logger = createLogger("module-runtime");

const DEFAULT_SNAPSHOT: ModuleSnapshot = {
  title: "{{ DISPLAY_NAME }}",
  summary: "围绕 Host 插槽、主题同步和多语言治理构建的标准模块运行时。",
  items: [
    {
      id: "theme-sync",
      title: "Theme synchronization",
      description: "Reads Host theme state and injects theme CSS into the module container.",
      tone: "primary",
      state: "ready",
    },
    {
      id: "locale-sync",
      title: "Locale synchronization",
      description: "Keeps local dictionaries in sync with Host language changes.",
      tone: "supporting",
      state: "ready",
    },
    {
      id: "hot-remount",
      title: "Hot slot remount",
      description: "Supports deterministic mount, update and unmount flow for future Host modules.",
      tone: "attention",
      state: "planned",
    },
  ],
};

interface RuntimeContextValue {
  bootState: ModuleRuntimeBootState;
  moduleId: string;
  slot: string;
  snapshot: ModuleSnapshot;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ModuleRuntimeContext = React.createContext<RuntimeContextValue | null>(null);

function mergeSnapshot(base: ModuleSnapshot, patch?: Partial<ModuleSnapshot>): ModuleSnapshot {
  if (!patch) {
    return base;
  }

  return {
    title: patch.title ?? base.title,
    summary: patch.summary ?? base.summary,
    items: patch.items ?? base.items,
  };
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallbackMessage;
}

function createRuntimeClient(
  client?: Client,
  bridgeScopeToken?: string
): Client | undefined {
  if (client) {
    return client;
  }
  if (typeof window === "undefined" || typeof (window as { chips?: unknown }).chips === "undefined") {
    return undefined;
  }
  if (bridgeScopeToken) {
    return createClient({
      bridgeScope: {
        token: bridgeScopeToken,
      },
    });
  }
  return createClient();
}

async function readBootState(
  client: Client | undefined,
  moduleId: string,
  preferredLocale?: string
): Promise<ModuleRuntimeBootState> {
  const fallbackLocale = resolveLocale(preferredLocale);

  if (!client) {
    return {
      locale: fallbackLocale,
      themeCssText: "",
      themeId: "local-preview",
      themeVersion: "0.0.0",
    };
  }

  try {
    const [themeCss, theme, locale] = await Promise.all([
      client.theme.getAllCss(),
      client.theme.getCurrent({ pluginId: moduleId }),
      client.i18n.getCurrent(),
    ]);

    return {
      locale: resolveLocale(locale),
      themeCssText: themeCss.css,
      themeId: theme.themeId,
      themeVersion: theme.version,
    };
  } catch (error) {
    return {
      locale: fallbackLocale,
      themeCssText: "",
      themeId: "local-preview",
      themeVersion: "0.0.0",
      errorMessage: toErrorMessage(error, "无法同步 Host 主题或语言状态。"),
    };
  }
}

function statusColor(item: ModuleFeatureItem): string {
  if (item.tone === "primary") {
    return "var(--chips-module-tone-primary, #2f6fed)";
  }
  if (item.tone === "supporting") {
    return "var(--chips-module-tone-supporting, #0d8a6a)";
  }
  return "var(--chips-module-tone-attention, #d97706)";
}

function stateLabel(locale: string, state: ModuleFeatureItem["state"]): string {
  return formatMessage(locale, `module.states.${state}`);
}

function useRuntimeContext(): RuntimeContextValue {
  const context = React.useContext(ModuleRuntimeContext);
  if (!context) {
    throw new Error("ModuleRuntimeContext is not available.");
  }
  return context;
}

function ModuleRuntimeProvider({
  children,
  client,
  moduleId,
  slot,
  snapshot,
  preferredLocale,
  bridgeScopeToken,
}: React.PropsWithChildren<{
  client?: Client;
  moduleId: string;
  slot: string;
  snapshot: ModuleSnapshot;
  preferredLocale?: string;
  bridgeScopeToken?: string;
}>): React.ReactElement {
  const runtimeClientRef = React.useRef<Client | undefined>(
    createRuntimeClient(client, bridgeScopeToken)
  );
  const [bootState, setBootState] = React.useState<ModuleRuntimeBootState>({
    locale: resolveLocale(preferredLocale),
    themeCssText: "",
    themeId: "local-preview",
    themeVersion: "0.0.0",
  });

  React.useEffect(() => {
    let active = true;
    const runtimeClient = runtimeClientRef.current;

    logger.info("mount module runtime", { moduleId, slot });

    void readBootState(runtimeClient, moduleId, preferredLocale).then((nextState) => {
      if (!active) {
        return;
      }
      startTransition(() => {
        setBootState(nextState);
      });
    });

    let unsubscribeTheme = () => undefined;
    let unsubscribeLanguage = () => undefined;

    if (runtimeClient) {
      try {
        unsubscribeTheme = runtimeClient.events.on("theme.changed", async () => {
          const nextTheme = await runtimeClient.theme.getAllCss();
          const themeState = await runtimeClient.theme.getCurrent({ pluginId: moduleId });
          if (!active) {
            return;
          }
          startTransition(() => {
            setBootState((current) => ({
              ...current,
              themeCssText: nextTheme.css,
              themeId: themeState.themeId,
              themeVersion: themeState.version,
              errorMessage: undefined,
            }));
          });
        });

        unsubscribeLanguage = runtimeClient.events.on<{ locale?: string }>(
          "language.changed",
          async (payload) => {
            const nextLocale =
              typeof payload?.locale === "string"
                ? resolveLocale(payload.locale)
                : resolveLocale(await runtimeClient.i18n.getCurrent());
            if (!active) {
              return;
            }
            startTransition(() => {
              setBootState((current) => ({
                ...current,
                locale: nextLocale,
              }));
            });
          }
        );
      } catch (error) {
        logger.warn("runtime events unavailable", { moduleId, slot, error: toErrorMessage(error, "unknown") });
      }
    }

    return () => {
      active = false;
      unsubscribeTheme();
      unsubscribeLanguage();
      logger.info("unmount module runtime", { moduleId, slot });
    };
  }, [moduleId, preferredLocale, slot]);

  const value: RuntimeContextValue = {
    bootState,
    moduleId,
    slot,
    snapshot,
    t(key, params) {
      return formatMessage(bootState.locale, key, params);
    },
  };

  return <ModuleRuntimeContext.Provider value={value}>{children}</ModuleRuntimeContext.Provider>;
}

function ModuleHeader(): React.ReactElement {
  const { moduleId, slot, snapshot, t } = useRuntimeContext();

  return (
    <header
      style={{
        display: "grid",
        gap: 8,
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, rgba(47,111,237,0.16), rgba(13,138,106,0.10))",
        border: "1px solid rgba(47,111,237,0.18)",
      }}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{snapshot.title}</h1>
        <span
          style={{
            fontSize: 12,
            borderRadius: 999,
            padding: "4px 10px",
            background: "rgba(17, 24, 39, 0.08)",
          }}
        >
          {t("module.slotLabel")}: {slot}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.86 }}>{snapshot.summary}</p>
      <div style={{ fontSize: 12, opacity: 0.72 }}>
        {t("module.moduleIdLabel")}: {moduleId}
      </div>
    </header>
  );
}

function ModuleSummaryPanel(): React.ReactElement {
  const { snapshot, t } = useRuntimeContext();
  return (
    <section
      style={{
        display: "grid",
        gap: 8,
        padding: 18,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.72)",
        border: "1px solid rgba(17, 24, 39, 0.08)",
      }}
    >
      <strong style={{ fontSize: 13 }}>{t("module.summaryHeading")}</strong>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{snapshot.summary}</p>
    </section>
  );
}

function ModuleCatalog(): React.ReactElement {
  const { snapshot, t, bootState } = useRuntimeContext();
  const [search, setSearch] = React.useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const visibleItems =
    deferredSearch.length === 0
      ? snapshot.items
      : snapshot.items.filter((item) => {
          const haystack = `${item.title} ${item.description}`.toLowerCase();
          return haystack.includes(deferredSearch);
        });

  return (
    <section
      style={{
        display: "grid",
        gap: 14,
        padding: 18,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.72)",
        border: "1px solid rgba(17, 24, 39, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 13 }}>{t("module.catalogHeading")}</strong>
          <span style={{ fontSize: 12, opacity: 0.72 }}>
            {t("module.itemsCount", { count: visibleItems.length })}
          </span>
        </div>
        <label style={{ display: "grid", gap: 6, minWidth: 240, fontSize: 12 }}>
          <span>{t("module.searchLabel")}</span>
          <input
            aria-label={t("module.searchLabel")}
            placeholder={t("module.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(17, 24, 39, 0.12)",
              padding: "10px 12px",
              font: "inherit",
              background: "rgba(255, 255, 255, 0.96)",
            }}
          />
        </label>
      </div>

      {bootState.errorMessage ? (
        <div
          style={{
            fontSize: 12,
            color: "#b45309",
            background: "rgba(245, 158, 11, 0.14)",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          {t("module.runtimeError")} {bootState.errorMessage}
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            border: "1px dashed rgba(17, 24, 39, 0.16)",
            fontSize: 13,
            opacity: 0.72,
          }}
        >
          {t("module.empty")}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {visibleItems.map((item) => (
            <ModuleFeatureCard key={item.id} item={item} locale={bootState.locale} />
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleFeatureCard({
  item,
  locale,
}: {
  item: ModuleFeatureItem;
  locale: string;
}): React.ReactElement {
  const color = statusColor(item);

  return (
    <article
      style={{
        display: "grid",
        gap: 10,
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${color}33`,
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong style={{ fontSize: 14 }}>{item.title}</strong>
        <span
          style={{
            borderRadius: 999,
            padding: "4px 9px",
            fontSize: 11,
            color,
            background: `${color}18`,
          }}
        >
          {stateLabel(locale, item.state)}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.82 }}>{item.description}</p>
    </article>
  );
}

function ModuleFooter(): React.ReactElement {
  const { bootState, t } = useRuntimeContext();

  return (
    <footer
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 12,
        opacity: 0.72,
      }}
    >
      <span>
        {t("module.themeLabel")}: {bootState.themeId} / {bootState.themeVersion}
      </span>
    </footer>
  );
}

function ModuleSurface(): React.ReactElement {
  const { bootState } = useRuntimeContext();

  return (
    <div lang={bootState.locale} data-chips-theme-id={bootState.themeId}>
      <style>{bootState.themeCssText}</style>
      <div
        data-chips-module-shell="{{ MODULE_CAPABILITY }}"
        style={{
          display: "grid",
          gap: 16,
          padding: 20,
          minHeight: "100%",
          color: "var(--chips-sys-color-on-surface, #111827)",
          background:
            "radial-gradient(circle at top left, rgba(47,111,237,0.14), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,248,252,0.92))",
        }}
      >
        <ModuleHeader />
        <ModuleSummaryPanel />
        <ModuleCatalog />
        <ModuleFooter />
      </div>
    </div>
  );
}

export function mountModule(context: ModuleMountContext): ModuleHandle {
  const container = context.container;
  const moduleId = context.moduleId.trim();
  const slot = context.slot.trim();

  if (!container) {
    throw new Error("mountModule: container is required.");
  }
  if (!moduleId) {
    throw new Error("mountModule: moduleId is required.");
  }
  if (!slot) {
    throw new Error("mountModule: slot is required.");
  }

  const root = ReactDOM.createRoot(container);
  let snapshot = mergeSnapshot(DEFAULT_SNAPSHOT, context.initialSnapshot);

  const render = () => {
    flushSync(() => {
      root.render(
        <React.StrictMode>
          <ModuleRuntimeProvider
            client={context.client}
            bridgeScopeToken={context.bridgeScopeToken}
            moduleId={moduleId}
            slot={slot}
            snapshot={snapshot}
            preferredLocale={context.locale}
          >
            <ModuleSurface />
          </ModuleRuntimeProvider>
        </React.StrictMode>
      );
    });
  };

  render();

  return {
    update(patch) {
      snapshot = mergeSnapshot(snapshot, patch);
      render();
    },
    unmount() {
      root.unmount();
    },
  };
}
