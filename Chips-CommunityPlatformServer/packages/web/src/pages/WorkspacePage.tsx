import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { boxesApi, cardsApi } from '../api/content';
import { UploadDropzone } from '../components/UploadDropzone';
import { UploadQueue } from '../components/UploadQueue';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { createLocalId, getErrorMessage, getUploadTypeFromFile, sleep } from '../lib/ui';
import { Icon } from '../runtime/icons/Icon';
import type { UploadQueueItem } from '../types/community';
import './WorkspacePage.css';

type QueuePatch = Partial<UploadQueueItem> | ((item: UploadQueueItem) => Partial<UploadQueueItem>);

export default function WorkspacePage() {
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const profileHref = useMemo(() => (user ? `/@${user.username}` : '/login'), [user]);

  const updateQueueItem = useCallback((localId: string, patch: QueuePatch) => {
    setQueue((current) =>
      current.map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        const nextPatch = typeof patch === 'function' ? patch(item) : patch;
        return { ...item, ...nextPatch };
      }),
    );
  }, []);

  const pollCardUntilSettled = useCallback(
    async (cardId: string) => {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const status = await cardsApi.getCardStatus(cardId);

        if (status.status === 'ready' || status.status === 'error') {
          return status;
        }

        await sleep(1500);
      }

      throw new Error(t('workspace.timeout'));
    },
    [t],
  );

  const processQueueItem = useCallback(
    async (item: UploadQueueItem) => {
      if (item.type === 'card') {
        updateQueueItem(item.localId, {
          status: 'uploading',
          progress: 0,
          detailMessage: '',
          errorMessage: '',
        });

        const uploadResult = await cardsApi.uploadCard(
          item.file,
          { visibility: 'public' },
          (progress) => {
            updateQueueItem(item.localId, {
              status: 'uploading',
              progress,
            });
          },
        );

        updateQueueItem(item.localId, {
          status: 'processing',
          progress: 100,
          remoteId: uploadResult.cardId,
          resultHref: `/cards/${uploadResult.cardId}`,
          detailMessage: t('workspace.processingHint'),
        });

        const cardStatus = await pollCardUntilSettled(uploadResult.cardId);

        if (cardStatus.status === 'ready') {
          updateQueueItem(item.localId, {
            status: 'success',
            progress: 100,
            detailMessage: t('workspace.successCard'),
            resultHref: `/cards/${uploadResult.cardId}`,
          });
          return;
        }

        updateQueueItem(item.localId, {
          status: 'error',
          progress: 100,
          errorMessage: cardStatus.errorMessage || t('workspace.statusError'),
          resultHref: `/cards/${uploadResult.cardId}`,
        });
        return;
      }

      updateQueueItem(item.localId, {
        status: 'uploading',
        progress: 0,
        detailMessage: '',
        errorMessage: '',
      });

      const uploadResult = await boxesApi.uploadBox(
        item.file,
        { visibility: 'public' },
        (progress) => {
          updateQueueItem(item.localId, {
            status: 'uploading',
            progress,
          });
        },
      );

      updateQueueItem(item.localId, {
        status: 'success',
        progress: 100,
        remoteId: uploadResult.boxId,
        resultHref: `/boxes/${uploadResult.boxId}`,
        detailMessage: t('workspace.successBox'),
      });
    },
    [pollCardUntilSettled, t, updateQueueItem],
  );

  useEffect(() => {
    if (activeUploadId) {
      return;
    }

    const nextItem = queue.find((item) => item.status === 'queued');

    if (!nextItem) {
      return;
    }

    setActiveUploadId(nextItem.localId);

    void processQueueItem(nextItem)
      .catch((error) => {
        updateQueueItem(nextItem.localId, {
          status: 'error',
          errorMessage: getErrorMessage(error, t('common.error')),
        });
      })
      .finally(() => {
        setActiveUploadId((current) => (current === nextItem.localId ? null : current));
      });
  }, [activeUploadId, processQueueItem, queue, t, updateQueueItem]);

  const handleFiles = useCallback(
    (files: File[]) => {
      const accepted: UploadQueueItem[] = [];
      let hasInvalidType = false;

      files.forEach((file) => {
        const type = getUploadTypeFromFile(file.name);

        if (!type) {
          hasInvalidType = true;
          return;
        }

        accepted.push({
          localId: createLocalId(),
          file,
          type,
          status: 'queued',
          progress: 0,
        });
      });

      if (accepted.length > 0) {
        setQueue((current) => [...current, ...accepted]);
      }

      setNotice(hasInvalidType ? t('workspace.invalidType') : '');
    },
    [t],
  );

  if (!user) {
    return null;
  }

  return (
    <div className="page-container workspace-page">
      <header className="workspace-page__header">
        <div>
          <span className="eyebrow">{t('workspace.title')}</span>
          <h1>{t('workspace.title')}</h1>
          <p className="muted">{t('workspace.subtitle')}</p>
        </div>

        <Link to={profileHref} className="button button--secondary">
          <Icon name="arrow-left" size={16} />
          {t('workspace.backToProfile')}
        </Link>
      </header>

      {notice ? <div className="inline-notice inline-notice--danger">{notice}</div> : null}

      <UploadDropzone onFiles={handleFiles} disabled={false} />
      <UploadQueue items={queue} profileHref={profileHref} />
    </div>
  );
}
