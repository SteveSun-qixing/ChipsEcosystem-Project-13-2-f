import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Client } from "chips-sdk";
import { chipsClient } from "../../runtime/chips-client";
import { cardsApi, type CardOpenView } from "../api/content";
import { useAppPreferences } from "../contexts/PreferencesContext";
import { useAuth } from "../contexts/AuthContext";
import { createCommunityTransferService } from "../lib/transfer";
import { getErrorMessage, resolveCommunityUrl } from "../lib/ui";
import { getCommunityApiBaseUrl } from "../api/client";
import { Icon } from "../runtime/icons/Icon";
import "./CardDetailPage.css";

type TransferStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string; percent: number | null }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function formatTransferProgress(stage: string, percent: number): string | null {
  if (!stage) {
    return null;
  }
  return percent > 0 ? `${stage} ${Math.round(percent)}%` : stage;
}

export default function CardDetailPage() {
  const { t } = useAppPreferences();
  const client: Client = chipsClient;
  const { isAuthenticated } = useAuth();
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardOpenView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openStatus, setOpenStatus] = useState<TransferStatus>({ kind: "idle" });
  const [downloadStatus, setDownloadStatus] = useState<TransferStatus>({ kind: "idle" });
  const transferRef = useRef(createCommunityTransferService(client));

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    cardsApi
      .getCardOpenView(cardId)
      .then((response) => {
        if (active) {
          setCard(response);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(getErrorMessage(nextError, t("detail.notFound")));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cardId, t]);

  const handleOpenInLocalViewer = async () => {
    if (!cardId) {
      return;
    }

    setOpenStatus({ kind: "working", label: t("card.viewOpening"), percent: null });

    try {
      const result = await transferRef.current.openInLocalViewer(cardId, (progress) => {
        setOpenStatus({
          kind: "working",
          label: formatTransferProgress(progress.message || progress.stage, progress.percent) ?? t("card.viewOpening"),
          percent: progress.percent > 0 ? progress.percent : null,
        });
      });
      setOpenStatus({ kind: "success", message: t("card.viewOpened") });
      void result;
    } catch (nextError) {
      setOpenStatus({
        kind: "error",
        message: t("card.viewFailed", { message: getErrorMessage(nextError, t("common.error")) }),
      });
    }
  };

  const handleDownload = async () => {
    if (!cardId) {
      return;
    }

    setDownloadStatus({ kind: "working", label: t("card.downloading"), percent: null });

    try {
      const outputPath = await client.platform.saveFile({
        title: t("card.downloadAction"),
        defaultPath: `${card?.title ?? cardId}.card`,
      });
      if (!outputPath) {
        setDownloadStatus({ kind: "idle" });
        return;
      }

      const result = await transferRef.current.downloadCard(cardId, outputPath, (progress) => {
        setDownloadStatus({
          kind: "working",
          label: formatTransferProgress(progress.message || progress.stage, progress.percent) ?? t("card.downloading"),
          percent: progress.percent > 0 ? progress.percent : null,
        });
      });
      setDownloadStatus({ kind: "success", message: t("card.downloadComplete", { path: result.outputPath }) });
    } catch (nextError) {
      setDownloadStatus({
        kind: "error",
        message: t("card.downloadFailed", { message: getErrorMessage(nextError, t("common.error")) }),
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <section className="panel empty-panel">
          <span className="detail-transition-spinner" />
          <h1>{t("common.loading")}</h1>
        </section>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="page-container">
        <section className="panel error-panel">
          <h1>{error || t("detail.notFound")}</h1>
          <Link to="/" className="button button--secondary">{t("card.backToPrevious")}</Link>
        </section>
      </div>
    );
  }

  const authorHref = card.user ? `/@${card.user.username}` : null;
  const coverHref = card.coverUrl ? resolveCommunityUrl(getCommunityApiBaseUrl(), card.coverUrl) : null;

  return (
    <div className="page-container card-detail-page">
      <section className="panel card-detail-page__panel">
        <div className="card-detail-page__cover">
          {coverHref ? (
            <iframe
              className="card-detail-page__cover-frame"
              src={coverHref}
              title={card.title}
              loading="lazy"
              sandbox="allow-scripts"
              scrolling="no"
            />
          ) : (
            <div className="card-detail-page__cover-placeholder">
              <Icon name="card" size={48} />
            </div>
          )}
        </div>

        <div className="card-detail-page__info">
          <span className="eyebrow">{t("card.summaryTitle")}</span>
          <h1>{card.title}</h1>

          {card.user ? (
            <p className="card-detail-page__author">
              {t("common.owner")}：
              {authorHref ? (
                <Link to={authorHref}>{card.user.displayName || card.user.username}</Link>
              ) : (
                card.user.displayName || card.user.username
              )}
            </p>
          ) : null}

          <p className="muted">
            {t("common.createdAt")}：{new Date(card.createdAt).toLocaleString()}
          </p>

          {!isAuthenticated ? (
            <div className="inline-notice">{t("client.transfer.notLoggedIn")}</div>
          ) : null}

          <div className="card-detail-page__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void handleOpenInLocalViewer()}
              disabled={!isAuthenticated || openStatus.kind === "working"}
            >
              <Icon name="card" />
              {openStatus.kind === "working"
                ? t("card.viewOpening")
                : openStatus.kind === "success"
                  ? t("card.viewOpenAgain")
                  : t("card.viewLocalAction")}
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={() => void handleDownload()}
              disabled={!isAuthenticated || downloadStatus.kind === "working"}
            >
              <Icon name="download" />
              {downloadStatus.kind === "working" ? t("card.downloading") : t("card.downloadAction")}
            </button>
          </div>

          <p className="muted card-detail-page__hint">{t("card.viewLocalBody")}</p>

          {openStatus.kind === "working" ? (
            <div className="inline-notice" role="status">
              {openStatus.label}
            </div>
          ) : null}
          {openStatus.kind === "success" ? (
            <div className="inline-notice inline-notice--success" role="status">
              {openStatus.message}
            </div>
          ) : null}
          {openStatus.kind === "error" ? (
            <div className="inline-notice inline-notice--danger" role="alert">
              {openStatus.message}
            </div>
          ) : null}

          {downloadStatus.kind === "working" ? (
            <div className="inline-notice" role="status">
              {downloadStatus.label}
            </div>
          ) : null}
          {downloadStatus.kind === "success" ? (
            <div className="inline-notice inline-notice--success" role="status">
              {downloadStatus.message}
            </div>
          ) : null}
          {downloadStatus.kind === "error" ? (
            <div className="inline-notice inline-notice--danger" role="alert">
              {downloadStatus.message}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
