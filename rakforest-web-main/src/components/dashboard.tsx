"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Headphones, Radio, Upload, Users } from "lucide-react";
import { Button } from "./ui/button";
import { StatusBadge } from "./incident-list";
import { predictionSource } from "@/lib/prediction";
import PredictionSummary from "./prediction-summary";
import type { Snapshot } from "@/lib/types";

const StationMap = dynamic(() => import("./station-map"), { ssr: false, loading: () => <div className="skeleton map-loading">กำลังเตรียมแผนที่…</div> });
type Filter = "pending" | "working" | "submitted" | "latest";
const filters: Record<Filter, string> = { pending: "รอตรวจ", working: "กำลังดำเนินการ", submitted: "รอปิดงาน", latest: "ล่าสุด" };
const date = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Dashboard({ state }: { state: Snapshot }) {
  const [filter, setFilter] = useState<Filter>("pending"), [stationId, setStationId] = useState<string>(), [view, setView] = useState<"map" | "work">("map");
  const workHeading = useRef<HTMLHeadingElement>(null), list = useRef<HTMLDivElement>(null);
  const station = state.stations.find(s => s.id === stationId);
  const counts = (value: Filter) => state.incidents.filter(i => value === "latest" || (value === "working" ? i.status === "dispatched" || i.status === "acknowledged" : i.status === value)).length;
  const items = state.incidents.filter(i => (!station || i.prediction.stationId === station.id) && (filter === "latest" || (filter === "working" ? i.status === "dispatched" || i.status === "acknowledged" : i.status === filter)))
    .sort((a, b) => Date.parse(b.prediction.recordedAt) - Date.parse(a.prediction.recordedAt) || b.id.localeCompare(a.id));
  function showWork() {
    setView("work");
    requestAnimationFrame(() => { if (document.querySelector(".dashboard-tabs")?.getClientRects().length) workHeading.current?.focus(); });
  }
  function changeFilter(value: Filter) { setFilter(value); list.current?.scrollTo({ top: 0 }); }
  function chooseMetric(value: Filter) { changeFilter(value); setStationId(undefined); showWork(); }
  const metrics = [
    { filter: "pending" as const, label: "รอตรวจ", icon: Headphones },
    { filter: "working" as const, label: "กำลังดำเนินการ", icon: Users },
    { filter: "submitted" as const, label: "รอปิดงาน", icon: CheckCircle2 }
  ];
  return <div className="dashboard-overview" data-view={view}>
    <div className="dashboard-heading"><h1>ภาพรวม</h1><Button asChild><Link href="/office/upload"><Upload size={20} aria-hidden="true"/>อัปโหลดเสียง</Link></Button></div>
    <div className="dashboard-metrics" aria-label="สรุปงานทุกเสา">
      <Link href="/office/map" className="dashboard-metric" aria-label={`ดูเสาไมค์ ${state.stations.length} เสา`}><Radio size={24} aria-hidden="true"/><span>เสาไมค์</span><strong>{state.stations.length}</strong></Link>
      {metrics.map(m => <button key={m.filter} className="dashboard-metric" type="button" aria-pressed={filter === m.filter} onClick={() => chooseMetric(m.filter)}><m.icon size={24} aria-hidden="true"/><span>{m.label}</span><strong>{counts(m.filter)}</strong></button>)}
    </div>
    <div className="dashboard-tabs" role="group" aria-label="เลือกมุมมองภาพรวม">
      <Button variant="outline" aria-pressed={view === "map"} aria-controls="overview-map" onClick={() => setView("map")}>แผนที่</Button>
      <Button variant="outline" aria-pressed={view === "work"} aria-controls="overview-work" onClick={() => setView("work")}>รายการงาน</Button>
    </div>
    <div className="dashboard-board">
      <section className="card dashboard-map" id="overview-map" aria-labelledby="overview-map-title">
        <div className="dashboard-map-heading"><h2 id="overview-map-title">พื้นที่เฝ้าตรวจ</h2><label className="sr-only" htmlFor="overview-station">เลือกเสาในภาพรวม</label><select id="overview-station" value={station?.id ?? ""} onChange={e => { setStationId(e.target.value || undefined); list.current?.scrollTo({ top: 0 }); }}><option value="">ทุกเสา</option>{state.stations.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}{s.active ? "" : " (ปิด)"}</option>)}</select><Link href="/office/map" className="dashboard-map-link">เปิดแผนที่<ArrowRight size={18} aria-hidden="true"/></Link></div>
        <StationMap stations={state.stations} selected={station?.id} onSelect={id => { setStationId(id); list.current?.scrollTo({ top: 0 }); showWork(); }} compact collapsibleNotes showAllAreas/>
      </section>
      <section className="card dashboard-work" id="overview-work" aria-labelledby="overview-work-title">
        <h2 id="overview-work-title" ref={workHeading} tabIndex={-1}>งานที่ต้องตรวจ</h2>
        <div className="dashboard-work-filters"><label htmlFor="overview-filter">รายการที่ต้องการดู</label><select id="overview-filter" value={filter} onChange={e => changeFilter(e.target.value as Filter)}>{Object.entries(filters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="dashboard-work-scope"><p aria-live="polite">{station ? station.name + " · " + station.id : "ทุกเสา"} · {items.length} งาน</p>{station && <button type="button" className="text-button" onClick={() => setStationId(undefined)}>แสดงงานทุกเสา</button>}</div>
        <div className="dashboard-work-list" ref={list} role="region" aria-label={`รายการงาน${filters[filter]}`} tabIndex={0} onKeyDown={e => {
          const el = e.currentTarget;
          if (e.target !== el || e.ctrlKey || e.metaKey || e.altKey || getComputedStyle(el).overflowY === "visible" || el.scrollHeight <= el.clientHeight) return;
          const targets: Record<string, number> = { ArrowDown: el.scrollTop + 48, ArrowUp: el.scrollTop - 48, PageDown: el.scrollTop + el.clientHeight * .9, PageUp: el.scrollTop - el.clientHeight * .9, Home: 0, End: el.scrollHeight };
          if (Object.prototype.hasOwnProperty.call(targets, e.key)) { e.preventDefault(); el.scrollTo({ top: targets[e.key] }); }
        }}>
          {items.length ? items.map(item => <article className="overview-job" key={item.id} aria-label={"งาน " + item.id}>
            <div className="section-title"><h3>{item.id}</h3><StatusBadge status={item.status}/></div>
            <p className="overview-job-station">{item.prediction.stationSnapshot?.name ?? item.prediction.stationId} · {item.prediction.stationId}</p>
            <PredictionSummary prediction={item.prediction} compact/>
            <small>{date(item.prediction.recordedAt)} · {predictionSource(item.prediction.source)}</small>
            <Link className="button button-outline" href={"/office/incidents/" + item.id}>ดูรายละเอียด {item.id}<ArrowRight size={18} aria-hidden="true"/></Link>
          </article>) : <div className="overview-empty"><p>ไม่มีงาน{filters[filter]}{station ? "ของเสานี้" : ""}</p><p className="small muted">ลองเปลี่ยนรายการที่ต้องการดู{station ? " หรือแสดงงานทุกเสา" : ""}</p></div>}
        </div>
        <Link className="button button-outline dashboard-all-events" href="/office/incidents">เปิดรายการเหตุการณ์ทั้งหมด<ArrowRight size={18} aria-hidden="true"/></Link>
      </section>
    </div>
  </div>;
}
