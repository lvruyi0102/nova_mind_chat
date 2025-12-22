/**
 * MediaPlayer - Universal media player for music, video, audio, and animations
 * Supports playback controls, volume, progress tracking, and fullscreen mode
 */

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface MediaPlayerProps {
  url: string;
  title?: string;
  mediaType: "music" | "video" | "audio" | "animation";
  onDownload?: () => void;
  autoPlay?: boolean;
  className?: string;
}

export default function MediaPlayer({
  url,
  title,
  mediaType,
  onDownload,
  autoPlay = false,
  className = "",
}: MediaPlayerProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isVideo = mediaType === "video" || mediaType === "animation";

  // Handle play/pause
  const togglePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play().catch((err) => {
          console.error("Playback error:", err);
          toast.error("播放失败，请检查媒体文件");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (mediaRef.current) {
      mediaRef.current.volume = vol;
    }
    if (vol > 0) {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (mediaRef.current) {
      if (isMuted) {
        mediaRef.current.volume = volume;
        setIsMuted(false);
      } else {
        mediaRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Handle progress change
  const handleProgressChange = (newTime: number[]) => {
    const time = newTime[0];
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!isVideo) return;

    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        const newTime = Math.min(currentTime + 5, duration);
        handleProgressChange([newTime]);
      } else if (e.code === "ArrowLeft") {
        const newTime = Math.max(currentTime - 5, 0);
        handleProgressChange([newTime]);
      } else if (e.code === "ArrowUp") {
        const newVol = Math.min(volume + 0.1, 1);
        handleVolumeChange([newVol]);
      } else if (e.code === "ArrowDown") {
        const newVol = Math.max(volume - 0.1, 0);
        handleVolumeChange([newVol]);
      } else if (e.code === "KeyM") {
        toggleMute();
      } else if (e.code === "KeyF" && isVideo) {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentTime, duration, volume, isPlaying, isVideo, isFullscreen]);

  // Format time display
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 rounded-lg overflow-hidden border border-purple-500/20 ${className}`}
    >
      {/* Media Element */}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => {
            setDuration((e.target as HTMLVideoElement).duration);
            setIsLoading(false);
          }}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          onError={() => {
            setError("无法加载视频文件");
            setIsLoading(false);
          }}
          className="w-full h-auto max-h-96 bg-black"
          autoPlay={autoPlay}
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => {
            setDuration((e.target as HTMLAudioElement).duration);
            setIsLoading(false);
          }}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onError={() => {
            setError("无法加载音频文件");
            setIsLoading(false);
          }}
          autoPlay={autoPlay}
        />
      )}

      {/* Player Controls */}
      <div className="p-4 space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
        {/* Title */}
        {title && (
          <div className="text-sm font-semibold text-purple-300 truncate">{title}</div>
        )}

        {/* Error Message */}
        {error && <div className="text-xs text-red-400">{error}</div>}

        {/* Progress Bar */}
        <div className="space-y-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleProgressChange}
            disabled={isLoading || !!error}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-purple-300">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-1">
            <Button
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
              title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            {/* Skip Buttons */}
            <Button
              onClick={() => {
                const newTime = Math.max(currentTime - 10, 0);
                handleProgressChange([newTime]);
              }}
              disabled={isLoading || !!error}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
              title="快退 10 秒"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => {
                const newTime = Math.min(currentTime + 10, duration);
                handleProgressChange([newTime]);
              }}
              disabled={isLoading || !!error}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
              title="快进 10 秒"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="flex items-center gap-1">
              <Button
                onClick={toggleMute}
                disabled={isLoading || !!error}
                variant="ghost"
                size="sm"
                className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
                title={isMuted ? "取消静音 (M)" : "静音 (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                disabled={isLoading || !!error}
                className="w-20"
              />
            </div>

            {/* Download Button */}
            {onDownload && (
              <Button
                onClick={onDownload}
                disabled={isLoading || !!error}
                variant="ghost"
                size="sm"
                className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
                title="下载"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {/* Fullscreen Button */}
            {isVideo && (
              <Button
                onClick={toggleFullscreen}
                disabled={isLoading || !!error}
                variant="ghost"
                size="sm"
                className="text-purple-300 hover:bg-purple-500/20 h-8 w-8 p-0"
                title={isFullscreen ? "退出全屏 (F)" : "全屏 (F)"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-purple-400/50 space-y-1">
          <div>快捷键: 空格(播放/暂停) | ←→(快进/快退) | ↑↓(音量) | M(静音)</div>
          {isVideo && <div>F(全屏)</div>}
        </div>
      </div>
    </div>
  );
}
