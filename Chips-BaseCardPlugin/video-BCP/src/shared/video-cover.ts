export interface ExtractVideoCoverFileOptions {
  file: File;
  fileName: string;
  captureAtSeconds?: number;
  mimeType?: string;
}

function waitForEvent<T extends Event>(
  target: EventTarget,
  successEvent: string,
  errorEvent: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handleSuccess = (event: Event) => {
      cleanup();
      resolve(event as T);
    };

    const handleError = (event: Event) => {
      cleanup();
      reject(event);
    };

    const cleanup = () => {
      target.removeEventListener(successEvent, handleSuccess);
      target.removeEventListener(errorEvent, handleError);
    };

    target.addEventListener(successEvent, handleSuccess, { once: true });
    target.addEventListener(errorEvent, handleError, { once: true });
  });
}

async function captureVideoFrameBlob(options: {
  resourceUrl: string;
  captureAtSeconds: number;
  mimeType: string;
}): Promise<Blob | null> {
  const { resourceUrl, captureAtSeconds, mimeType } = options;
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.src = resourceUrl;

  await waitForEvent(video, "loadeddata", "error");

  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const targetTime = duration > 0
    ? Math.min(Math.max(captureAtSeconds, 0), Math.max(duration - 0.01, 0))
    : 0;

  if (Math.abs(video.currentTime - targetTime) > 0.001) {
    video.currentTime = targetTime;
    await waitForEvent(video, "seeked", "error");
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth));
  canvas.height = Math.max(1, Math.round(video.videoHeight));
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, mimeType, 0.92);
  });
}

export async function extractVideoCoverFile(options: ExtractVideoCoverFileOptions): Promise<File | null> {
  const {
    file,
    fileName,
    captureAtSeconds = 0.08,
    mimeType = "image/jpeg",
  } = options;

  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof HTMLVideoElement === "undefined"
  ) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const blob = await captureVideoFrameBlob({
      resourceUrl: objectUrl,
      captureAtSeconds,
      mimeType,
    });

    if (!blob) {
      return null;
    }

    return new File([blob], fileName, { type: blob.type || mimeType });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
