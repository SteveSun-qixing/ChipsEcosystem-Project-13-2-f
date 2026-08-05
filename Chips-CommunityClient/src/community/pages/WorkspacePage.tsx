import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Client } from "chips-sdk";
import { chipsClient } from "../../runtime/chips-client";
import { useAppPreferences } from "../contexts/PreferencesContext";
import { useAuth } from "../contexts/AuthContext";
import { createCommunityTransferService } from "../lib/transfer";
import { getErrorMessage } from "../lib/ui";
import { Icon } from "../runtime/icons/Icon";
import "./WorkspacePage.css";

type UploadStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string; percent: number | null }
  | { kind: "success"; message: string; communityUrl: string }
  | { kind: "error"; message: string };

interface UploadFileResult {
  fileName: string;
  ok: boolean;
  message: string;
  communityUrl: string;
}

function formatUploadProgress(stage: string, percent: number): string | null {
  if (!stage) {
    return null;
  }
  return percent > 0 ? `${stage} ${Math.round(percent)}%` : stage;
}

function getFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? filePath;
}

export default function WorkspacePage() {
  const { t } = useAppPreferences();
  const client: Client = chipsClient;
  const { user, isAuthenticated } = useAuth();
  const profileHref = useMemo(() => (user ? `/@${user.username}` : "/login"), [user]);
  const transferRef = useRef(createCommunityTransferService(client));
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ kind: "idle" });
  const [batch, setBatch] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<UploadFileResult[]>([]);

  if (!user) {
    return null;
  }

  const handleUpload = async () => {
    if (!isAuthenticated) {
      setUploadStatus({ kind: "error", message: t("workspace.uploadRequiresLogin") });
      return;
    }

    setUploadStatus({ kind: "idle" });
    setResults([]);
    setBatch(null);

    let filePaths: string[] = [];
    try {
      const selected = await client.platform.openFile({
        title: t("workspace.uploadTitle"),
        mode: "file",
        allowMultiple: true,
        mustExist: true,
        filters: [{ name: "Chips Card", extensions: ["card"] }],
      });
      filePaths = Array.isArray(selected) ? selected.filter(Boolean) : [];
    } catch (nextError) {
      setUploadStatus({ kind: "error", message: getErrorMessage(nextError, t("common.error")) });
      return;
    }

    if (filePaths.length === 0) {
      setUploadStatus({ kind: "error", message: t("workspace.uploadSelectCard") });
      return;
    }

    setBatch({ current: 0, total: filePaths.length });
    const outcomes: UploadFileResult[] = [];

    for (let index = 0; index < filePaths.length; index += 1) {
      const filePath = filePaths[index]!;
      const fileName = getFileName(filePath);
      setBatch({ current: index + 1, total: filePaths.length });
      setUploadStatus({
        kind: "working",
        label: t("workspace.uploadBatchProgress", {
          current: index + 1,
          total: filePaths.length,
          phase: t("workspace.uploading"),
        }),
        percent: null,
      });

      try {
        const result = await transferRef.current.uploadCard(filePath, (progress) => {
          setUploadStatus({
            kind: "working",
            label: t("workspace.uploadBatchProgress", {
              current: index + 1,
              total: filePaths.length,
              phase: formatUploadProgress(progress.message || progress.stage, progress.percent) ?? t("workspace.uploading"),
            }),
            percent: progress.percent > 0 ? progress.percent : null,
          });
        });
        outcomes.push({
          fileName,
          ok: true,
          message: t("workspace.uploadResultPublished"),
          communityUrl: result.communityUrl,
        });
      } catch (nextError) {
        outcomes.push({
          fileName,
          ok: false,
          message: getErrorMessage(nextError, t("common.error")),
          communityUrl: "",
        });
      }

      setResults([...outcomes]);
    }

    setBatch(null);

    const successCount = outcomes.filter((item) => item.ok).length;
    const failedCount = outcomes.length - successCount;
    const firstSuccess = outcomes.find((item) => item.ok);

    if (failedCount === 0) {
      setUploadStatus({
        kind: "success",
        message: t("workspace.uploadComplete", { count: successCount }),
        communityUrl: firstSuccess?.communityUrl ?? "",
      });
    } else {
      setUploadStatus({
        kind: "error",
        message: t("workspace.uploadBatchFailed", { success: successCount, failed: failedCount }),
      });
    }
  };

  const handleOpenCommunityUrl = () => {
    if (uploadStatus.kind !== "success") {
      return;
    }
    void client.platform.openExternal(uploadStatus.communityUrl);
  };

  return (
    <div className="page-container workspace-page">
      <header className="workspace-page__header">
        <div>
          <span className="eyebrow">{t("workspace.title")}</span>
          <h1>{t("workspace.title")}</h1>
          <p className="muted">{t("workspace.subtitle")}</p>
        </div>

        <Link to={profileHref} className="button button--secondary">
          <Icon name="arrow-left" size={16} />
          {t("workspace.backToProfile")}
        </Link>
      </header>

      <section className="panel workspace-upload">
        <div className="workspace-upload__icon" aria-hidden="true">
          <Icon name="upload" size={28} />
        </div>
        <div className="workspace-upload__copy">
          <h2>{t("workspace.uploadTitle")}</h2>
          <p>{t("workspace.uploadSubtitle")}</p>
        </div>

        <div className="workspace-upload__action">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void handleUpload()}
            disabled={!isAuthenticated || uploadStatus.kind === "working"}
          >
            {uploadStatus.kind === "working" ? t("workspace.uploading") : t("workspace.uploadAction")}
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="inline-notice inline-notice--danger">{t("workspace.uploadRequiresLogin")}</div>
        ) : null}

        {uploadStatus.kind === "working" ? (
          <div className="inline-notice" role="status">
            {uploadStatus.label}
          </div>
        ) : null}

        {uploadStatus.kind === "success" ? (
          <div className="inline-notice inline-notice--success" role="status">
            <span>{uploadStatus.message}</span>
            {uploadStatus.communityUrl ? (
              <button
                type="button"
                className="button button--ghost button--sm"
                onClick={() => void handleOpenCommunityUrl()}
              >
                {t("workspace.uploadCompleteOpen")}
              </button>
            ) : null}
          </div>
        ) : null}

        {uploadStatus.kind === "error" ? (
          <div className="inline-notice inline-notice--danger" role="alert">
            {uploadStatus.message}
          </div>
        ) : null}

        {results.length > 0 ? (
          <ul className="workspace-upload__results" aria-label={t("workspace.uploadResultListLabel")}>
            {results.map((item) => (
              <li
                key={item.fileName}
                className={`workspace-upload__result${item.ok ? " workspace-upload__result--ok" : " workspace-upload__result--fail"}`}
              >
                <Icon name={item.ok ? "check" : "warning"} size={16} />
                <span className="workspace-upload__result-name">{item.fileName}</span>
                <span className="workspace-upload__result-message">{item.message}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel workspace-client-publish">
        <div className="workspace-client-publish__icon" aria-hidden="true">
          <Icon name="document" size={28} />
        </div>
        <div className="workspace-client-publish__copy">
          <h2>{t("workspace.clientOnlyTitle")}</h2>
          <p>{t("workspace.clientOnlyBody")}</p>
        </div>
        <div className="workspace-client-publish__steps" aria-label={t("workspace.clientOnlyStepsLabel")}>
          <article>
            <strong>{t("workspace.clientOnlyStepCreate")}</strong>
            <span>{t("workspace.clientOnlyStepCreateBody")}</span>
          </article>
          <article>
            <strong>{t("workspace.clientOnlyStepPublish")}</strong>
            <span>{t("workspace.clientOnlyStepPublishBody")}</span>
          </article>
          <article>
            <strong>{t("workspace.clientOnlyStepView")}</strong>
            <span>{t("workspace.clientOnlyStepViewBody")}</span>
          </article>
        </div>
      </section>
    </div>
  );
}
