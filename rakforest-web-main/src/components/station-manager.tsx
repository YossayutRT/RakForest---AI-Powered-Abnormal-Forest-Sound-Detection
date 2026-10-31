"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "./ui/button";
import { demo } from "@/lib/demo-service";
import { validateStation } from "@/lib/thailand";
import { predictionSource } from "@/lib/prediction";
import PredictionSummary from "./prediction-summary";
import { FIELD_USER, statusNames } from "@/lib/fixtures";
import type { Snapshot, Station } from "@/lib/types";
const StationMap = dynamic(() => import("./station-map"), { ssr: false });
type Form = { id: string; name: string; lat: string; lng: string; radius: string; active: boolean };
type Errors = Partial<Record<Exclude<keyof Form, "active">, string>>;
export default function StationManager({ state, field, run, busy }: { state: Snapshot; field: boolean; run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>; busy: boolean }) {
  const [selected, setSelected] = useState("ST-01"), [form, setForm] = useState<Form>(), [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Errors>({}), [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null), summaryRef = useRef<HTMLHeadingElement>(null), wasOpen = useRef(false), saving = useRef(false);
  const open = !!form;
  useEffect(() => {
    if (open) formRef.current?.querySelector<HTMLInputElement>(editing ? "#station-name" : "#station-id")?.focus();
    else if (wasOpen.current) summaryRef.current?.focus();
    wasOpen.current = open;
  }, [open, editing]);
  const station = state.stations.find(s => s.id === selected);
  const patch = (value: Partial<Form>) => { setForm(f => f ? { ...f, ...value } : f); setErrors(e => { const next = { ...e }; for (const key of Object.keys(value)) delete next[key as keyof Errors]; return next; }); setError(""); };
  const candidate: Station | undefined = form ? { id: form.id.trim() || "ตัวอย่าง", name: form.name.trim() || "เสาใหม่", coordinates: [Number(form.lng), Number(form.lat)], radius: Number(form.radius), active: form.active } : undefined;
  const draft = candidate && form?.lat.trim() && form.lng.trim() && candidate.coordinates.every(Number.isFinite) && Math.abs(candidate.coordinates[0]) <= 180 && Math.abs(candidate.coordinates[1]) <= 90 && candidate.radius > 0 && Number.isFinite(candidate.radius) ? candidate : undefined;
  function begin(s?: Station) {
    setEditing(!!s); setError(""); setErrors({});
    setForm(s ? { id: s.id, name: s.name, lat: String(s.coordinates[1]), lng: String(s.coordinates[0]), radius: String(s.radius), active: s.active } : { id: "", name: "", lat: "", lng: "", radius: "300", active: true });
  }
  function invalid(value: Errors) { setErrors(value); const key = Object.keys(value)[0]; document.getElementById("station-" + key)?.focus(); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving.current || busy || !form || !candidate) return;
    setError(""); const next: Errors = {};
    if (!form.id.trim()) next.id = "กรุณากรอกรหัสเสา เช่น ST-04";
    if (!form.name.trim()) next.name = "กรุณากรอกชื่อที่เจ้าหน้าที่จดจำได้";
    if (!form.lat.trim() || !Number.isFinite(Number(form.lat)) || Math.abs(Number(form.lat)) > 90) next.lat = "กรอกละติจูดระหว่าง -90 ถึง 90 เช่น 18.1234";
    if (!form.lng.trim() || !Number.isFinite(Number(form.lng)) || Math.abs(Number(form.lng)) > 180) next.lng = "กรอกลองจิจูดระหว่าง -180 ถึง 180 เช่น 98.7654";
    if (!form.radius.trim() || !Number.isFinite(Number(form.radius)) || Number(form.radius) <= 0) next.radius = "กรอกรัศมีมากกว่า 0 หน่วยเป็นเมตร เช่น 300";
    if (Object.keys(next).length) { invalid(next); return; }
    saving.current = true;
    try {
      const value = { ...candidate, id: form.id.trim(), name: form.name.trim() };
      try { await validateStation(value); } catch (e) {
        const message = e instanceof Error ? e.message : "ตรวจพิกัดไม่สำเร็จ กรุณาลองใหม่";
        if (message.includes("เฉพาะประเทศไทย")) invalid({ lat: message }); else setError(message);
        return;
      }
      if (await run(async () => {
        try { await demo.saveStation(value, editing); } catch (e) {
          if (e instanceof Error && e.message.includes("รหัสเสานี้")) invalid({ id: e.message });
          else setError("ยังบันทึกไม่ได้ ข้อมูลในฟอร์มยังอยู่ ตรวจข้อความแจ้งเตือนแล้วกดบันทึกอีกครั้ง");
          throw e;
        }
      }, "บันทึกเสาแล้ว")) { setSelected(value.id); setForm(undefined); }
    } finally { saving.current = false; }
  }
  const fields: { key: keyof Errors; label: string; hint: string; type?: string }[] = [
    { key: "id", label: "รหัสเสา", hint: "เช่น ST-04 · หลังบันทึกแล้วเปลี่ยนรหัสไม่ได้" },
    { key: "name", label: "ชื่อเสา", hint: "เช่น เสาใกล้หน่วยพิทักษ์ป่า" },
    { key: "lat", label: "ละติจูด (Latitude)", hint: "เช่น 18.1234 · ตรวจค่าจาก GPS ก่อนบันทึก", type: "number" },
    { key: "lng", label: "ลองจิจูด (Longitude)", hint: "เช่น 98.7654 · ต้องเป็นตำแหน่งภายในประเทศไทย", type: "number" },
    { key: "radius", label: "รัศมีรับเสียงโดยประมาณ (เมตร)", hint: "ค่าเริ่มต้น 300 เมตร · ยังไม่ผ่านการทดสอบภาคสนาม", type: "number" }
  ];
  const related = state.incidents.filter(i => i.prediction.stationId === selected && (!field || i.assigneeId === FIELD_USER));
  return <>
    <div className="page-title"><div><span className="eyebrow">ตำแหน่งเสาในประเทศไทย</span><h1>{field ? "แผนที่งานของฉัน" : "แผนที่เสาไมค์"}</h1><p className="muted">เลือกเสาจากแผนที่หรือรายการด้านล่าง เพื่อดูรายละเอียด</p></div>{!field && !form && <Button onClick={() => begin()}>เพิ่มเสาไมค์</Button>}</div>
    <div className="map-layout"><section className="card map-card" aria-label="แผนที่และรายการเสา">
      {form && <p className="notice">กรอกพิกัดในฟอร์ม หรือคลิกแผนที่เพื่อช่วยเลือกตำแหน่ง จากนั้นกดบันทึกเสา</p>}
      <StationMap stations={state.stations} selected={selected} onSelect={setSelected} draft={draft} onPick={!field && form ? ([lng, lat]) => patch({ lat: lat.toFixed(6), lng: lng.toFixed(6) }) : undefined}/>
      <h2>เลือกเสาไมค์</h2><div className="station-strip" aria-label="รายการเสาไมค์">{state.stations.map(s => <Button key={s.id} variant="outline" aria-pressed={selected === s.id} className={selected === s.id ? "selected-station" : ""} onClick={() => setSelected(s.id)}>{selected === s.id && <span aria-hidden="true">✓</span>}{s.name} · {s.id}{!s.active ? " (ปิด)" : ""}</Button>)}</div>
    </section><section className="card">{form && !field ? <form ref={formRef} noValidate onSubmit={save} aria-busy={busy}>
      <h2>{editing ? "แก้ไขเสาไมค์" : "เพิ่มเสาไมค์"}</h2><p className="muted">กรอกข้อมูลให้ครบ แล้วตรวจตำแหน่งก่อนบันทึก</p>
      {fields.map(({ key, label, hint, type }) => <div key={key}><label htmlFor={"station-" + key}>{label} <span aria-hidden="true">*</span></label><input id={"station-" + key} aria-label={label} required type={type ?? "text"} step={type === "number" ? "any" : undefined} value={form[key]} disabled={busy || (editing && key === "id")} aria-invalid={!!errors[key]} aria-describedby={`station-${key}-hint${errors[key] ? ` station-${key}-error` : ""}`} onChange={e => patch({ [key]: e.target.value })}/><small className="field-hint" id={"station-" + key + "-hint"}>{hint}</small>{errors[key] && <p role="alert" className="error-text" id={"station-" + key + "-error"}>{errors[key]}</p>}</div>)}
      <label className="check-label"><input type="checkbox" checked={form.active} disabled={busy} onChange={e => patch({ active: e.target.checked })}/>เปิดใช้งานเสา</label>
      <p className="notice">วงรับเสียงเป็นค่าประมาณ ไม่รับประกันว่าจะตรวจพบทุกเสียงภายในวง</p>{error && <p role="alert" className="error-text">{error}</p>}
      <div className="actions"><Button disabled={busy}>{busy ? "กำลังบันทึกเสา…" : "บันทึกเสา"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setForm(undefined); setError(""); setErrors({}); }}>ยกเลิก</Button></div>
    </form> : <>
      <h2 ref={summaryRef} tabIndex={-1}>{station?.name ?? "เลือกเสาบนแผนที่"}</h2>
      {station && <><dl className="info-list"><div><dt>รหัสเสา</dt><dd>{station.id}</dd></div><div><dt>สถานะเสา</dt><dd>{station.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</dd></div><div><dt>ละติจูด</dt><dd>{station.coordinates[1]}</dd></div><div><dt>ลองจิจูด</dt><dd>{station.coordinates[0]}</dd></div><div><dt>รัศมีโดยประมาณ</dt><dd>{station.radius} เมตร</dd></div></dl>{!field && <Button variant="outline" onClick={() => begin(station)}>แก้ไขเสา</Button>}</>}
      <hr/><h3>เหตุการณ์ที่เกี่ยวข้อง</h3>{related.length ? related.map(i => <Link className="mini-incident" key={i.id} href={(field ? "/field/tasks/" : "/office/incidents/") + i.id}><strong>{i.id}</strong><dl className="info-list compact"><div><dt>สถานะงาน</dt><dd>{statusNames[i.status]}</dd></div><div><dt>คลาสที่ผ่านเกณฑ์</dt><dd><PredictionSummary prediction={i.prediction} compact/></dd></div><div><dt>แหล่งผล</dt><dd>{predictionSource(i.prediction.source)}</dd></div></dl><span className="text-link">ดูรายละเอียดงาน →</span></Link>) : <p className="muted">ยังไม่มีเหตุการณ์ของเสานี้</p>}
    </>}</section></div>
  </>;
}
