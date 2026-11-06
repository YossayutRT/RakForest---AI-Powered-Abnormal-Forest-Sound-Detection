"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import {
  formatAudioTimestamp,
  getClassNameTh,
  getClassSeverity,
  summarizeSegmentDetections,
} from "@/lib/utils/risk";
import type { AISegmentItem } from "@/types/database.types";

interface Props {
  fileUrl?: string | null;
  fileName?: string | null;
  durationSeconds?: number | null;
  predictedLabel?: string;
  segments?: AISegmentItem[];
}

export default function AudioWaveformPlayer({
  fileUrl,
  fileName,
  durationSeconds = 12,
  predictedLabel = "chainsaw",
  segments = [],
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const totalDuration = useMemo(() => {
    const segEnd = segments.at(-1)?.endSeconds;
    return Math.max(durationSeconds || 12, segEnd || 12);
  }, [durationSeconds, segments]);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(totalDuration);

  const mergedRanges = useMemo(
    () => summarizeSegmentDetections(segments, 0.45),
    [segments]
  );

  // Deterministic waveform bars colored by segment threat intensity
  const bars = useMemo(() => {
    const count = 64;
    return Array.from({ length: count }, (_, idx) => {
      const ratio = idx / count;
      const sec = ratio * duration;
      const seg = segments.find(
        (s) => sec >= s.startSeconds && sec <= s.endSeconds
      );
      let topClass = predictedLabel;
      let topScore = 0.45;
      if (seg && seg.scores.length > 0) {
        const sorted = [...seg.scores].sort((a, b) => b.score - a.score);
        topClass = sorted[0].classId;
        topScore = sorted[0].score;
      }
      const severity = getClassSeverity(topClass);
      const wave =
        Math.abs(Math.sin(idx * 0.65) * 0.45 + Math.cos(idx * 1.35) * 0.35) +
        0.2;
      const heightPercent = Math.min(
        100,
        Math.max(18, Math.round(wave * (0.55 + topScore * 0.6) * 100))
      );
      return { idx, sec, severity, topScore, heightPercent };
    });
  }, [duration, predictedLabel, segments]);

  useEffect(() => {
    setDuration(totalDuration);
  }, [totalDuration]);

  useEffect(() => {
    return () => {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  function playShortSynthTone(type: string) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type =
        type === "chainsaw"
          ? "sawtooth"
          : type === "vehicle"
            ? "triangle"
            : "sine";
      osc.frequency.setValueAtTime(
        type === "chainsaw" ? 135 : type === "fire" ? 260 : 95,
        ctx.currentTime
      );
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // ignore if browser blocks audio context
    }
  }

  function togglePlay() {
    if (fileUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play().catch(() => undefined);
        setPlaying(true);
      }
      return;
    }

    // Fallback interactive timeline playback when inspecting seeded reports without raw audio blob
    if (playing) {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      setPlaying(false);
    } else {
      playShortSynthTone(predictedLabel);
      setPlaying(true);
      synthTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev + 0.2 >= duration) {
            if (synthTimerRef.current) clearInterval(synthTimerRef.current);
            setPlaying(false);
            return 0;
          }
          return prev + 0.2;
        });
      }, 200);
    }
  }

  function seekTo(seconds: number) {
    const clamped = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(clamped);
    if (fileUrl && audioRef.current) {
      audioRef.current.currentTime = clamped;
      audioRef.current.play().catch(() => undefined);
      setPlaying(true);
    } else {
      playShortSynthTone(predictedLabel);
      if (!playing) {
        setPlaying(true);
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        synthTimerRef.current = setInterval(() => {
          setCurrentTime((prev) => {
            if (prev + 0.2 >= duration) {
              if (synthTimerRef.current) clearInterval(synthTimerRef.current);
              setPlaying(false);
              return 0;
            }
            return prev + 0.2;
          });
        }, 200);
      }
    }
  }

  const activeSegment = segments.find(
    (s) => currentTime >= s.startSeconds && currentTime <= s.endSeconds
  );

  return (
    <div className="rounded-lg border border-[#D4DCD5] bg-[#F8FAF8] p-4">
      {fileUrl && (
        <audio
          ref={audioRef}
          src={fileUrl}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (
              Number.isFinite(e.currentTarget.duration) &&
              e.currentTarget.duration > 0
            ) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="h-4 w-4 text-[#1B4332] shrink-0" />
          <span className="font-mono-code text-xs font-semibold text-[#14241B] truncate">
            {fileName || "audio_capture_stream.wav"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#526358]">
          {activeSegment && (
            <span className="rounded bg-[#1B4332]/10 px-2 py-0.5 font-mono-code text-[11px] font-medium text-[#1B4332]">
              หน้าต่างเวลา #{activeSegment.segmentIndex + 1} (
              {formatAudioTimestamp(activeSegment.startSeconds)}–
              {formatAudioTimestamp(activeSegment.endSeconds)})
            </span>
          )}
          <span className="font-mono-code font-semibold text-[#14241B]">
            {formatAudioTimestamp(currentTime)} / {formatAudioTimestamp(duration)}
          </span>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "หยุดชั่วคราว" : "เล่นเสียง"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="relative flex h-16 items-end gap-[3px] rounded border border-[#D4DCD5] bg-white px-2.5 py-2 cursor-pointer select-none"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seekTo(ratio * duration);
            }}
          >
            {bars.map((bar) => {
              const passed = bar.sec <= currentTime;
              const baseColor =
                bar.severity === "red"
                  ? passed
                    ? "bg-[#D62828]"
                    : "bg-red-300"
                  : bar.severity === "yellow"
                    ? passed
                      ? "bg-[#D97706]"
                      : "bg-amber-300"
                    : passed
                      ? "bg-[#2D8A3E]"
                      : "bg-emerald-200";
              return (
                <div
                  key={bar.idx}
                  style={{ height: `${bar.heightPercent}%` }}
                  className={`flex-1 rounded-t transition-colors ${baseColor}`}
                  title={`${formatAudioTimestamp(bar.sec)} (${Math.round(
                    bar.topScore * 100
                  )}%)`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => seekTo(0)}
          title="เริ่มเล่นใหม่ตั้งแต่ต้น"
          aria-label="เริ่มเล่นใหม่ตั้งแต่ต้น"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#D4DCD5] bg-white text-[#526358] hover:text-[#14241B] hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Clickable Segment Time Jump Chips */}
      {mergedRanges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E2E8E3]">
          <p className="text-xs font-semibold text-[#526358] mb-2">
            กดปุ่มช่วงเวลาด้านล่างเพื่อกรอเสียงไปยังจุดเกิดเหตุทันที:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {mergedRanges.map((entry) =>
              entry.ranges.map((r, idx) => {
                const isCurrent =
                  currentTime >= r.startSeconds && currentTime <= r.endSeconds;
                const badgeTone =
                  entry.severity === "red"
                    ? "border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
                    : entry.severity === "yellow"
                      ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                      : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100";
                return (
                  <button
                    key={`${entry.classId}-${idx}`}
                    type="button"
                    onClick={() => seekTo(r.startSeconds)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs sm:text-sm font-semibold shadow-2xs transition ${badgeTone} ${
                      isCurrent ? "ring-2 ring-[#1B4332]" : ""
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 shrink-0" />
                    <span>{getClassNameTh(entry.classId)}</span>
                    <span className="font-mono-code font-bold">
                      {formatAudioTimestamp(r.startSeconds)}–
                      {formatAudioTimestamp(r.endSeconds)}
                    </span>
                    <span className="font-mono-code opacity-85">
                      ({Math.round(r.maxScore * 100)}%)
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
