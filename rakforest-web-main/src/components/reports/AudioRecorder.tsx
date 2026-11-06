"use client";

import { useEffect, useRef, useState } from "react";
import { FileAudio, Mic, Square, Trash2, Upload, Wand2 } from "lucide-react";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * Generates an in-memory valid WAV audio file with realistic frequency modulation
 * so officers or rangers can test the full FastAPI AudioCNN pipeline with 1 click
 * even if they don't have a chainsaw/fire .wav file on their phone/computer.
 */
function createSynthesizedWavFile(
  preset: "chainsaw" | "fire" | "vehicle" | "natural_ambient"
): File {
  const sampleRate = 16000;
  const durationSeconds = 6;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (preset === "chainsaw") {
      const f0 = 115 + 25 * Math.sin(2 * Math.PI * 4.5 * t);
      sample =
        0.45 * Math.sin(2 * Math.PI * f0 * t) +
        0.3 * Math.sin(2 * Math.PI * f0 * 2 * t) +
        0.15 * Math.sin(2 * Math.PI * f0 * 3 * t) +
        (Math.random() * 2 - 1) * 0.1;
    } else if (preset === "fire") {
      const crackle = Math.random() > 0.96 ? (Math.random() * 2 - 1) * 0.85 : 0;
      sample = (Math.random() * 2 - 1) * 0.18 + crackle;
    } else if (preset === "vehicle") {
      sample =
        0.5 * Math.sin(2 * Math.PI * 68 * t) +
        0.25 * Math.sin(2 * Math.PI * 136 * t) +
        (Math.random() * 2 - 1) * 0.08;
    } else {
      sample =
        0.25 * Math.sin(2 * Math.PI * 1850 * t) * Math.max(0, Math.sin(2 * Math.PI * 3 * t)) +
        (Math.random() * 2 - 1) * 0.04;
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  return new File([buffer], `sample_${preset}_${Date.now()}.wav`, {
    type: "audio/wav",
  });
}

export default function AudioRecorder({ file, onChange, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const recordedFile = new File(
          [blob],
          `field_recording_${Date.now()}.webm`,
          { type: "audio/webm" }
        );
        onChange(recordedFile);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(
        "ไม่สามารถเปิดไมโครโฟนได้ กรุณาอนุญาตสิทธิ์ไมโครโฟน หรือเลือกอัปโหลดไฟล์เสียงแทน"
      );
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Live Microphone Record Button */}
        {!recording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg border-2 border-[#1B4332] bg-[#1B4332] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-50 transition"
          >
            <Mic className="h-5 w-5" />
            <span>บันทึกเสียงสดจากไมโครโฟน</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg border-2 border-[#D62828] bg-[#D62828] px-4 py-3 text-sm font-semibold text-white animate-pulse"
          >
            <Square className="h-5 w-5" />
            <span>กำลังอัดเสียง ({seconds} วินาที) • กดเพื่อหยุด</span>
          </button>
        )}

        {/* File Upload Picker */}
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-[#8FA394] bg-white px-4 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#EBF2ED] transition">
          <Upload className="h-5 w-5" />
          <span>อัปโหลดไฟล์เสียง (.WAV, .MP3, .M4A)</span>
          <input
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
            disabled={disabled || recording}
            className="hidden"
            onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              if (chosen) onChange(chosen);
            }}
          />
        </label>
      </div>

      {/* Quick Test Sample Audio Presets (Generates real WAV bytes for FastAPI AudioCNN) */}
      <div className="rounded-lg border border-[#D4DCD5] bg-[#F6F9F6] p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#526358] mb-2">
          <Wand2 className="h-3.5 w-3.5 text-[#1B4332]" />
          <span>สร้างไฟล์เสียงสัญญาณตัวอย่าง (.WAV) สำหรับส่งเข้าโมเดล AI ทันที:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "chainsaw" as const, label: "ตัวอย่างเสียงเลื่อยยนต์" },
            { id: "fire" as const, label: "ตัวอย่างเสียงไฟไหม้ป่า" },
            { id: "vehicle" as const, label: "ตัวอย่างเสียงรถบรรทุกไม้" },
            { id: "natural_ambient" as const, label: "ตัวอย่างเสียงธรรมชาติ" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || recording}
              onClick={() => onChange(createSynthesizedWavFile(preset.id))}
              className="rounded border border-[#B8C7BC] bg-white px-2.5 py-1.5 text-xs font-medium text-[#14241B] hover:border-[#1B4332] hover:bg-[#EBF2ED] transition"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-[#D62828]">
          {error}
        </p>
      )}

      {/* Selected / Recorded Audio Preview */}
      {file && (
        <div className="rounded-lg border border-[#B8C7BC] bg-white p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio className="h-4 w-4 text-[#1B4332] shrink-0" />
              <span className="font-mono-code text-xs font-semibold text-[#14241B] truncate">
                {file.name}
              </span>
              <span className="text-xs text-[#526358]">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#D62828] hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              ลบไฟล์
            </button>
          </div>
          {previewUrl && (
            <audio controls src={previewUrl} className="w-full h-10" />
          )}
        </div>
      )}
    </div>
  );
}
