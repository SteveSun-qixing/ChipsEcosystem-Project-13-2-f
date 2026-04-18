import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type SyntheticEvent } from "react";
import { appConfig } from "../../config/app-config";
import { clampPlaybackTime, clampVolume, resolveMediaErrorKey } from "../utils/music-player";

export interface MusicPlayerController {
  surfaceRef: MutableRefObject<HTMLDivElement | null>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  isReady: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  bufferedUntil: number;
  loopMode: "off" | "one";
  errorKey: string | null;
  togglePlayback: () => Promise<void>;
  seekBy: (offsetSeconds: number) => void;
  seekTo: (nextTime: number) => void;
  setVolumeLevel: (nextVolume: number) => void;
  toggleMute: () => void;
  toggleLoopMode: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => void;
  handleCanPlay: () => void;
  handlePlaying: () => void;
  handlePause: () => void;
  handleWaiting: () => void;
  handleEnded: () => void;
  handleTimeUpdate: () => void;
  handleProgress: () => void;
  handleVolumeChange: () => void;
  handleError: () => void;
}

interface UseMusicPlayerControllerOptions {
  sessionKey: string | null;
}

const DEFAULT_VOLUME = 0.82;
const SEEK_OFFSET_SECONDS = 10;
const VOLUME_STEP = 0.05;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function useMusicPlayerController(options: UseMusicPlayerControllerOptions): MusicPlayerController {
  const { sessionKey } = options;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedUntil, setBufferedUntil] = useState(0);
  const [loopMode, setLoopMode] = useState<"off" | "one">(appConfig.defaultLoopMode);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  function syncProgressState(audio: HTMLAudioElement): void {
    setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    if (audio.buffered.length > 0) {
      setBufferedUntil(audio.buffered.end(audio.buffered.length - 1));
      return;
    }

    setBufferedUntil(0);
  }

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      setErrorKey(null);
      try {
        await audio.play();
      } catch {
        setErrorKey(resolveMediaErrorKey(audio.error));
      }
      return;
    }

    audio.pause();
  }

  function seekTo(nextTime: number): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const targetTime = clampPlaybackTime(nextTime, audio.duration);
    audio.currentTime = targetTime;
    syncProgressState(audio);
  }

  function seekBy(offsetSeconds: number): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    seekTo(audio.currentTime + offsetSeconds);
  }

  function setVolumeLevel(nextVolume: number): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const normalized = clampVolume(nextVolume);
    audio.volume = normalized;
    audio.muted = normalized === 0;
    setVolume(normalized);
    setIsMuted(audio.muted);
    if (normalized > 0) {
      previousVolumeRef.current = normalized;
    }
  }

  function toggleMute(): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.muted || audio.volume === 0) {
      const restoredVolume = previousVolumeRef.current > 0 ? previousVolumeRef.current : DEFAULT_VOLUME;
      audio.muted = false;
      audio.volume = restoredVolume;
      setVolume(restoredVolume);
      setIsMuted(false);
      return;
    }

    previousVolumeRef.current = audio.volume > 0 ? audio.volume : previousVolumeRef.current;
    audio.muted = true;
    setIsMuted(true);
  }

  function toggleLoopMode(): void {
    const audio = audioRef.current;
    const nextMode = loopMode === "one" ? "off" : "one";
    if (audio) {
      audio.loop = nextMode === "one";
    }
    setLoopMode(nextMode);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    switch (key) {
      case " ":
      case "spacebar":
        event.preventDefault();
        void togglePlayback();
        break;
      case "arrowleft":
        event.preventDefault();
        seekBy(-SEEK_OFFSET_SECONDS);
        break;
      case "arrowright":
        event.preventDefault();
        seekBy(SEEK_OFFSET_SECONDS);
        break;
      case "arrowup":
        event.preventDefault();
        setVolumeLevel(volume + VOLUME_STEP);
        break;
      case "arrowdown":
        event.preventDefault();
        setVolumeLevel(volume - VOLUME_STEP);
        break;
      case "m":
        event.preventDefault();
        toggleMute();
        break;
      case "l":
        event.preventDefault();
        toggleLoopMode();
        break;
      default:
        break;
    }
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>): void {
    const audio = event.currentTarget;
    audio.loop = loopMode === "one";
    audio.volume = volume;
    audio.muted = isMuted;
    syncProgressState(audio);
  }

  function handleCanPlay(): void {
    setIsReady(true);
    setIsBuffering(false);
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
    setIsPlaying(loopMode === "one");
    setIsBuffering(false);
  }

  function handleTimeUpdate(): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    syncProgressState(audio);
  }

  function handleProgress(): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    syncProgressState(audio);
  }

  function handleVolumeChange(): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setVolume(audio.volume);
    setIsMuted(audio.muted);
    if (!audio.muted && audio.volume > 0) {
      previousVolumeRef.current = audio.volume;
    }
  }

  function handleError(): void {
    const audio = audioRef.current;
    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setErrorKey(resolveMediaErrorKey(audio?.error ?? null));
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = loopMode === "one";
      audio.volume = volume;
      audio.muted = isMuted;
    }

    setIsReady(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setDuration(0);
    setCurrentTime(0);
    setBufferedUntil(0);
    setErrorKey(null);
  }, [sessionKey, loopMode, volume, isMuted]);

  return {
    surfaceRef,
    audioRef,
    isReady,
    isPlaying,
    isBuffering,
    isMuted,
    volume,
    duration,
    currentTime,
    bufferedUntil,
    loopMode,
    errorKey,
    togglePlayback,
    seekBy,
    seekTo,
    setVolumeLevel,
    toggleMute,
    toggleLoopMode,
    handleKeyDown,
    handleLoadedMetadata,
    handleCanPlay,
    handlePlaying,
    handlePause,
    handleWaiting,
    handleEnded,
    handleTimeUpdate,
    handleProgress,
    handleVolumeChange,
    handleError,
  };
}
