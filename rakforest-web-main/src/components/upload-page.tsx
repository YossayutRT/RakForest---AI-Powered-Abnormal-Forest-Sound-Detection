"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, FileAudio, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { validateAudio } from "@/lib/ml-contract";
import { analysis } from "@/lib/analysis-service";
import { predictionSource } from "@/lib/prediction";
import type { AnalysisConfig } from "@/lib/ml-contract";
import type { Snapshot } from "@/lib/types";

type Props = { state: Snapshot; busy: boolean; run: (action: () => Promise<unknown>, success?: string) => Promise<boolean> };
export default function UploadPage({ state, busy, run }: Props) {
  const [station, setStation] = useState("ST-01"), [file, setFile] = useState<File>(), [fail, setFail] = useState(false);
  const [config, setConfig] = useState<AnalysisConfig>(), [configError, setConfigError] = useState(""), [url, setUrl] = useState<string>();
  const [fileError,setFileError]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);
  const loadConfig = useCallback(async () => {
    setConfigError("");
    try { setConfig(await analysis.getConfig()); } catch (e) { setConfig(undefined); setConfigError(e instanceof Error ? e.message : "โหลดการตั้งค่าไม่ได้"); }
  }, []);
  useEffect(() => { let active = true; analysis.getConfig().then(c => { if (active) setConfig(c); }).catch(e => { if (active) setConfigError(e.message); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!file) { setUrl(undefined); return; } const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  const selected = state.stations.some(s => s.id === station && s.active) ? station : state.stations.find(s => s.active)?.id ?? "";
  const active = state.jobs.some(j => j.status === "queued" || j.status === "processing");
  const disabled = busy || active || !config?.configured;
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!file || !config) return; setFileError(""); try { validateAudio(file,config.limits); } catch(e) { setFileError(e instanceof Error?e.message:"กรุณาเลือกไฟล์เสียงใหม่"); fileInput.current?.focus(); return; } await run(() => analysis.submit(selected, file, fail)); };
  return <>
    <div className="page-title"><div><span className="eyebrow">ส่งเสียงเพื่อตรวจสอบ</span><h1>อัปโหลดเสียง</h1><p className="muted">อัปโหลดเสียงจากเสา เพื่อส่งวิเคราะห์และตรวจสอบผล</p></div></div>
    <section className="card" aria-label="บริการวิเคราะห์เสียง"><h2>บริการวิเคราะห์เสียง</h2>
      {config ? <><p role="status">{config.mode === "mock" ? "โหมดจำลองพร้อมใช้งาน — ไม่วิเคราะห์เนื้อหาเสียงจริง" : config.configured ? "ตั้งค่า API โมเดลแล้ว — จะตรวจการเชื่อมต่อเมื่อส่งเสียง" : "โหมด API โมเดล — ยังไม่ได้ตั้งค่าปลายทาง"}</p><p className="small muted">Telegram ยังจำลอง · ผลเก่าคงแหล่งที่มาเดิม</p></> : <p role="status">{configError || "กำลังโหลดการตั้งค่าบริการ…"}</p>}
      {(configError || (config && !config.configured)) && <Button variant="outline" onClick={loadConfig}>ลองโหลดการตั้งค่าใหม่</Button>}
    </section>
    <div className="two-col"><section className="card"><h2><FileAudio size={21}/>ข้อมูลเสียง</h2><form onSubmit={submit} aria-busy={busy || active}>
      <label>เสาจำลอง<select value={selected} onChange={e => setStation(e.target.value)} disabled={busy || active}><option value="" disabled>เลือกเสาที่เปิดใช้งาน</option>{state.stations.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></label>
      <label className="upload-zone"><Upload size={32}/><strong>เลือกไฟล์เสียงจากเครื่อง</strong><span>{config ? `${config.limits.extensions.join(", ").toUpperCase()} · ไม่เกิน ${config.limits.maxBytes / 1024 / 1024} MB` : "กำลังโหลดข้อจำกัดไฟล์"}</span><input ref={fileInput} aria-label="ไฟล์เสียง" aria-invalid={!!fileError} aria-describedby={fileError?"audio-error audio-hint":"audio-hint"} type="file" accept={config?.limits.extensions.map(e => "." + e).join(",")} disabled={busy || active || !config} onChange={e => {setFile(e.target.files?.[0]);setFileError("");}}/></label>
      {fileError && <p id="audio-error" role="alert" className="error-text">{fileError} · เลือกไฟล์ใหม่แล้วส่งอีกครั้ง</p>}
      <p id="audio-hint" className="small muted">ข้อจำกัดต้นแบบชั่วคราว รอยืนยันกับทีม ML · โหมด API จะส่งไฟล์ไปยังบริการที่ทีมตั้งค่า</p>
      {file && <div className="audio-card"><strong>{file.name}</strong><audio controls src={url}/></div>}
      {config?.mode === "mock" && <label className="check-label"><input type="checkbox" checked={fail} disabled={busy || active} onChange={e => setFail(e.target.checked)}/>จำลองการวิเคราะห์ล้มเหลว</label>}
      <Button className="wide" disabled={disabled || !file || !selected}><Activity size={18}/>{busy || active ? "กำลังประมวลผล…" : config?.mode === "http" ? "ส่งวิเคราะห์ด้วยโมเดล" : "ส่งวิเคราะห์จำลอง"}</Button>
    </form></section><section className="card"><h2>สถานะงานวิเคราะห์</h2><p className="notice">ผลสำเร็จเข้าสู่รายการรอตรวจ ส่วนกลางเป็นผู้ตัดสินใจส่งงาน คะแนนโมเดลไม่ยืนยันเหตุ</p>
      {state.jobs.length ? state.jobs.slice(0, 6).map(job => <div key={job.id} className="job"><div className="section-title"><strong>{job.stationId}</strong><span className={"badge " + (job.status === "failed" ? "failed" : "")}>{({ queued: "รอประมวลผล", processing: "กำลังประมวลผล", succeeded: "สำเร็จ", failed: "ล้มเหลว" })[job.status]}</span></div><small>{new Date(job.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · {predictionSource(job.source)}</small>{job.error && <p role="alert" className="error-text">{job.error}</p>}{job.status === "failed" && <Button variant="outline" disabled={disabled} onClick={() => run(() => analysis.retry(job.id))}>ลองวิเคราะห์ใหม่</Button>}{job.incidentId && <Button asChild variant="outline"><Link href={"/office/incidents/" + job.incidentId}>เปิดผล {job.incidentId}<ArrowRight size={16}/></Link></Button>}</div>) : <p className="empty">ยังไม่มีงานวิเคราะห์</p>}
    </section></div>
  </>;
}
