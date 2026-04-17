import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type SyntheticEvent } from "react";
import {
  PLAYBACK_RATES,
  clampPlaybackTime,
  clampVolume,
  resolveMediaErrorKey,
  type VideoTrackOption,
  type VideoDimensions,
} from "../utils/video-player";

interface UseVideoPlayerControllerOptions {
  sessionKey: string | null;
}

interface VideoPlayerController {
  surfaceRef: MutableRefObject<HTMLDivElement | null>;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  isReady: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  duration: number;
  currentTime: number;
  bufferedUntil: number;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  canUsePictureInPicture: boolean;
  videoSize: VideoDimensions | null;
  errorKey: string | null;
  subtitleTracks: VideoTrackOption[];
  audioTracks: VideoTrackOption[];
  togglePlayback: () => Promise<void>;
  seekBy: (offsetSeconds: number) => void;
  seekTo: (nextTime: number) => void;
  setVolumeLevel: (nextVolume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (nextRate: number) => void;
  selectSubtitleTrack: (nextIndex: number | null) => void;
  selectAudioTrack: (nextIndex: number | null) => void;
  toggleFullscreen: () => Promise<void>;
  togglePictureInPicture: () => Promise<void>;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => void;
  handleCanPlay: () => void;
  handlePlaying: () => void;
  handlePause: () => void;
  handleWaiting: () => void;
  handleEnded: () => void;
  handleTimeUpdate: () => void;
  handleDurationChange: () => void;
  handleProgress: () => void;
  handleVolumeChange: () => void;
  handleError: () => void;
}

interface PictureInPictureVideoElement extends HTMLVideoElement {
  requestPictureInPicture?: () => Promise<unknown>;
}

interface PictureInPictureDocument extends Document {
  pictureInPictureEnabled?: boolean;
  pictureInPictureElement?: Element | null;
  exitPictureInPicture?: () => Promise<void>;
}

interface AudioTrackLike {
  id?: string;
  kind?: string;
  label?: string;
  language?: string;
  enabled?: boolean;
}

interface AudioTrackListLike {
  length: number;
  [index: number]: AudioTrackLike;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

interface VideoElementWithTracks extends PictureInPictureVideoElement {
  audioTracks?: AudioTrackListLike;
}

function resolveInitialRate(): number {
  return PLAYBACK_RATES.includes(1) ? 1 : PLAYBACK_RATES[0] ?? 1;
}

function isSubtitleTextTrack(track: TextTrack): boolean {
  return track.kind === "subtitles" || track.kind === "captions" || track.kind === "";
}

function readSubtitleTracks(video: HTMLVideoElement): VideoTrackOption[] {
  const { textTracks } = video;
  const subtitleTracks: VideoTrackOption[] = [];

  for (let index = 0; index < textTracks.length; index += 1) {
    const track = textTracks[index];
    if (!track || !isSubtitleTextTrack(track)) {
      continue;
    }

    subtitleTracks.push({
      index,
      label: track.label?.trim() ?? "",
      language: track.language?.trim() ?? "",
      kind: track.kind?.trim() ?? "",
      selected: track.mode === "showing",
    });
  }

  return subtitleTracks;
}

function readAudioTracks(video: VideoElementWithTracks): VideoTrackOption[] {
  const audioTracks = video.audioTracks;
  if (!audioTracks) {
    return [];
  }

  const resolvedTracks: VideoTrackOption[] = [];
  for (let index = 0; index < audioTracks.length; index += 1) {
    const track = audioTracks[index];
    if (!track) {
      continue;
    }

    resolvedTracks.push({
      index,
      label: track.label?.trim() ?? "",
      language: track.language?.trim() ?? "",
      kind: track.kind?.trim() ?? "",
      selected: track.enabled === true,
    });
  }

  return resolvedTracks;
}

export function useVideoPlayerController(options: UseVideoPlayerControllerOptions): VideoPlayerController {
  const { sessionKey } = options;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [playbackRate, setPlaybackRateState] = useState(resolveInitialRate);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedUntil, setBufferedUntil] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [videoSize, setVideoSize] = useState<VideoDimensions | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<VideoTrackOption[]>([]);
  const [audioTracks, setAudioTracks] = useState<VideoTrackOption[]>([]);

  const canUsePictureInPicture =
    typeof document !== "undefined" &&
    (document as PictureInPictureDocument).pictureInPictureEnabled === true;

  function syncProgressState(video: HTMLVideoElement): void {
    setCurrentTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    if (video.buffered.length > 0) {
      setBufferedUntil(video.buffered.end(video.buffered.length - 1));
      return;
    }

    setBufferedUntil(0);
  }

  function syncTrackState(video: HTMLVideoElement | null): void {
    if (!video) {
      setSubtitleTracks([]);
      setAudioTracks([]);
      return;
    }

    setSubtitleTracks(readSubtitleTracks(video));
    setAudioTracks(readAudioTracks(video as VideoElementWithTracks));
  }

  async function togglePlayback(): Promise<void> {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      setErrorKey(null);
      try {
        await video.play();
      } catch {
        setErrorKey(resolveMediaErrorKey(video.error));
      }
      return;
    }

    video.pause();
  }

  function seekTo(nextTime: number): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const targetTime = clampPlaybackTime(nextTime, video.duration);
    video.currentTime = targetTime;
    syncProgressState(video);
  }

  function seekBy(offsetSeconds: number): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    seekTo(video.currentTime + offsetSeconds);
  }

  function setVolumeLevel(nextVolume: number): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const normalized = clampVolume(nextVolume);
    video.volume = normalized;
    video.muted = normalized === 0 ? true : false;
    setVolume(normalized);
    setIsMuted(video.muted);
  }

  function toggleMute(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function setPlaybackRate(nextRate: number): void {
    const video = videoRef.current;
    const normalized = PLAYBACK_RATES.includes(nextRate) ? nextRate : resolveInitialRate();
    if (video) {
      video.playbackRate = normalized;
    }
    setPlaybackRateState(normalized);
  }

  function selectSubtitleTrack(nextIndex: number | null): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    for (let index = 0; index < video.textTracks.length; index += 1) {
      const track = video.textTracks[index];
      if (!track || !isSubtitleTextTrack(track)) {
        continue;
      }

      track.mode = nextIndex === index ? "showing" : "disabled";
    }

    syncTrackState(video);
  }

  function selectAudioTrack(nextIndex: number | null): void {
    const video = videoRef.current as VideoElementWithTracks | null;
    const trackList = video?.audioTracks;
    if (!video || !trackList) {
      return;
    }

    for (let index = 0; index < trackList.length; index += 1) {
      const track = trackList[index];
      if (!track) {
        continue;
      }

      track.enabled = nextIndex === null ? index === 0 : index === nextIndex;
    }

    syncTrackState(video);
  }

  async function toggleFullscreen(): Promise<void> {
    if (typeof document === "undefined") {
      return;
    }

    const surface = surfaceRef.current;
    if (!surface || typeof surface.requestFullscreen !== "function") {
      return;
    }

    if (document.fullscreenElement === surface) {
      if (typeof document.exitFullscreen === "function") {
        await document.exitFullscreen();
      }
      return;
    }

    await surface.requestFullscreen();
  }

  async function togglePictureInPicture(): Promise<void> {
    if (typeof document === "undefined" || !canUsePictureInPicture) {
      return;
    }

    const doc = document as PictureInPictureDocument;
    const video = videoRef.current as PictureInPictureVideoElement | null;
    if (!video || typeof video.requestPictureInPicture !== "function") {
      return;
    }

    if (doc.pictureInPictureElement === video) {
      await doc.exitPictureInPicture?.();
      return;
    }

    await video.requestPictureInPicture();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const target = event.target as HTMLElement | null;
    if (target && target.closest("input, textarea, select")) {
      return;
    }

    switch (event.key) {
      case " ":
      case "k":
      case "K":
        event.preventDefault();
        void togglePlayback();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekBy(-5);
        break;
      case "ArrowRight":
        event.preventDefault();
        seekBy(5);
        break;
      case "ArrowUp":
        event.preventDefault();
        setVolumeLevel(volume + 0.05);
        break;
      case "ArrowDown":
        event.preventDefault();
        setVolumeLevel(volume - 0.05);
        break;
      case "f":
      case "F":
        event.preventDefault();
        void toggleFullscreen();
        break;
      case "m":
      case "M":
        event.preventDefault();
        toggleMute();
        break;
      default:
        break;
    }
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>): void {
    const video = event.currentTarget;
    setVideoSize({
      width: video.videoWidth,
      height: video.videoHeight,
    });
    syncProgressState(video);
    syncTrackState(video);
  }

  function handleCanPlay(): void {
    syncTrackState(videoRef.current);
    setIsReady(true);
    setIsBuffering(false);
    setErrorKey(null);
  }

  function handlePlaying(): void {
    setIsReady(true);
    setIsPlaying(true);
    setIsBuffering(false);
    setErrorKey(null);
  }

  function handlePause(): void {
    setIsPlaying(false);
    setIsBuffering(false);
  }

  function handleWaiting(): void {
    setIsBuffering(true);
  }

  function handleEnded(): void {
    setIsPlaying(false);
    setIsBuffering(false);
  }

  function handleTimeUpdate(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    syncProgressState(video);
  }

  function handleDurationChange(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
  }

  function handleProgress(): void {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0) {
      setBufferedUntil(0);
      return;
    }
    setBufferedUntil(video.buffered.end(video.buffered.length - 1));
  }

  function handleVolumeChange(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setVolume(clampVolume(video.volume));
    setIsMuted(video.muted);
  }

  function handleError(): void {
    const video = videoRef.current;
    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setErrorKey(resolveMediaErrorKey(video?.error ?? null));
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.volume = 0.85;
    video.playbackRate = resolveInitialRate();
    video.muted = false;
    setVolume(0.85);
    setIsMuted(false);
  }, [sessionKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }

    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setDuration(0);
    setCurrentTime(0);
    setBufferedUntil(0);
    setVideoSize(null);
    setErrorKey(null);
    setIsPictureInPicture(false);
    setSubtitleTracks([]);
    setAudioTracks([]);
    setPlaybackRateState(resolveInitialRate());
  }, [sessionKey]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      const surface = surfaceRef.current;
      setIsFullscreen(Boolean(surface && document.fullscreenElement === surface));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current as PictureInPictureVideoElement | null;
    if (!video) {
      return;
    }

    const handleEnterPictureInPicture = () => {
      setIsPictureInPicture(true);
    };
    const handleLeavePictureInPicture = () => {
      setIsPictureInPicture(false);
    };

    video.addEventListener("enterpictureinpicture", handleEnterPictureInPicture as EventListener);
    video.addEventListener("leavepictureinpicture", handleLeavePictureInPicture as EventListener);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPictureInPicture as EventListener);
      video.removeEventListener("leavepictureinpicture", handleLeavePictureInPicture as EventListener);
    };
  }, [sessionKey]);

  useEffect(() => {
    const video = videoRef.current as VideoElementWithTracks | null;
    if (!video) {
      return;
    }

    const syncTracks = () => {
      syncTrackState(video);
    };

    video.textTracks.addEventListener("addtrack", syncTracks as EventListener);
    video.textTracks.addEventListener("removetrack", syncTracks as EventListener);
    video.textTracks.addEventListener("change", syncTracks as EventListener);

    const audioTrackList = video.audioTracks;
    audioTrackList?.addEventListener?.("addtrack", syncTracks as EventListener);
    audioTrackList?.addEventListener?.("removetrack", syncTracks as EventListener);
    audioTrackList?.addEventListener?.("change", syncTracks as EventListener);

    syncTrackState(video);

    return () => {
      video.textTracks.removeEventListener("addtrack", syncTracks as EventListener);
      video.textTracks.removeEventListener("removetrack", syncTracks as EventListener);
      video.textTracks.removeEventListener("change", syncTracks as EventListener);
      audioTrackList?.removeEventListener?.("addtrack", syncTracks as EventListener);
      audioTrackList?.removeEventListener?.("removetrack", syncTracks as EventListener);
      audioTrackList?.removeEventListener?.("change", syncTracks as EventListener);
    };
  }, [sessionKey]);

  return {
    surfaceRef,
    videoRef,
    isReady,
    isPlaying,
    isBuffering,
    isMuted,
    volume,
    playbackRate,
    duration,
    currentTime,
    bufferedUntil,
    isFullscreen,
    isPictureInPicture,
    canUsePictureInPicture,
    videoSize,
    errorKey,
    subtitleTracks,
    audioTracks,
    togglePlayback,
    seekBy,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setPlaybackRate,
    selectSubtitleTrack,
    selectAudioTrack,
    toggleFullscreen,
    togglePictureInPicture,
    handleKeyDown,
    handleLoadedMetadata,
    handleCanPlay,
    handlePlaying,
    handlePause,
    handleWaiting,
    handleEnded,
    handleTimeUpdate,
    handleDurationChange,
    handleProgress,
    handleVolumeChange,
    handleError,
  };
}
