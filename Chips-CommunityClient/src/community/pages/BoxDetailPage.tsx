import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Client } from "chips-sdk";
import { chipsClient } from "../../runtime/chips-client";
import { boxesApi, type BoxDetail } from "../api/content";
import { useAppPreferences } from "../contexts/PreferencesContext";
import { createCommunityTransferService } from "../lib/transfer";
import { getErrorMessage, resolveCommunityUrl } from "../lib/ui";
import { getCommunityApiBaseUrl } from "../api/client";
import { Icon } from "../runtime/icons/Icon";
import "./BoxDetailPage.css";

export default function BoxDetailPage() {
  const { t } = useAppPreferences();
  const { boxId } = useParams<{ boxId: string }>();
  const [box, setBox] = useState<BoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingCardId, setOpeningCardId] = useState<string | null>(null);
  const clientRef = useRef<Client>(chipsClient);
  const transferRef = useRef(createCommunityTransferService(clientRef.current));

  const handleOpenCommunityCard = async (cardId: string) => {
    if (openingCardId) {
      return;
    }
    setOpeningCardId(cardId);
    try {
      await transferRef.current.openInLocalViewer(cardId);
    } catch (nextError) {
      await clientRef.current.platform.showMessage({
        title: t("card.viewFailedTitle"),
        message: t("card.viewFailed", {
          message: getErrorMessage(nextError, t("common.error")),
        }),
      });
    } finally {
      setOpeningCardId(null);
    }
  };

  useEffect(() => {
    if (!boxId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    boxesApi
      .getBox(boxId)
      .then((response) => {
        if (active) {
          setBox(response);
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
  }, [boxId, t]);

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

  if (error || !box) {
    return (
      <div className="page-container">
        <section className="panel error-panel">
          <h1>{error || t("detail.notFound")}</h1>
          <Link to="/" className="button button--secondary">{t("card.backToPrevious")}</Link>
        </section>
      </div>
    );
  }

  const baseUrl = getCommunityApiBaseUrl();
  const coverHref = box.coverUrl ? resolveCommunityUrl(baseUrl, box.coverUrl) : null;
  const visibleCards = (box.cards ?? []).filter((card) => card.enabled !== false);

  return (
    <div className="page-container box-detail-page">
      <section className="panel box-detail-page__panel">
        <div className="box-detail-page__cover">
          {coverHref ? (
            <img src={coverHref} alt={box.title} />
          ) : (
            <div className="box-detail-page__cover-placeholder">
              <Icon name="box" size={48} />
            </div>
          )}
        </div>

        <div className="box-detail-page__info">
          <span className="eyebrow">{t("box.summaryTitle")}</span>
          <h1>{box.title}</h1>

          {box.user ? (
            <p className="box-detail-page__author">
              {t("common.owner")}：
              <Link to={`/@${box.user.username}`}>{box.user.displayName || box.user.username}</Link>
            </p>
          ) : null}

          <p className="muted">
            {t("common.createdAt")}：{new Date(box.createdAt).toLocaleString()}
          </p>

          <p className="muted box-detail-page__hint">{t("box.notReady")}</p>
        </div>
      </section>

      <section className="box-detail-page__references">
        <h2>{t("box.referenceTitle")}</h2>
        {visibleCards.length > 0 ? (
          <ul className="box-detail-page__list">
            {visibleCards.map((card, index) => (
              <li key={card.communityCardId ?? `${box.id}-${index}`} className="panel box-reference-row">
                <div className="box-reference-row__copy">
                  <strong>{card.title || card.communityCardId || card.url}</strong>
                  <span className="muted">{card.communityCardId ?? card.url}</span>
                </div>
                {card.communityCardId ? (
                  <button
                    type="button"
                    className="button button--secondary button--icon"
                    aria-label={t("box.communityCard")}
                    onClick={() => void handleOpenCommunityCard(card.communityCardId!)}
                    disabled={openingCardId === card.communityCardId}
                  >
                    <Icon name="card" />
                  </button>
                ) : null}
                {card.url ? (
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button--ghost button--icon"
                    aria-label={t("box.sourceLink")}
                  >
                    <Icon name="arrow-up-right" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="works-section__empty">{t("box.empty")}</div>
        )}
      </section>
    </div>
  );
}
