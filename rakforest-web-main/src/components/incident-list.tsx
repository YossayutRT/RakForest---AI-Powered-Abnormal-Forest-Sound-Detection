import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { predictionSource } from "@/lib/prediction";
import PredictionSummary from "./prediction-summary";
import { statusNames } from "@/lib/fixtures";
import type { Incident, Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) { return <span className={"badge " + status}><span className="dot" aria-hidden="true"/>{statusNames[status]}</span>; }
const date = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export default function IncidentList({ items }: { items: Incident[] }) {
  if (!items.length) return <div className="empty"><p>ยังไม่มีเหตุการณ์</p><Link href="/office/upload">อัปโหลดเสียงเพื่อเริ่มตรวจสอบ</Link></div>;
  return <>
    <div className="table-scroll incident-table"><table><caption className="sr-only">รายการเหตุการณ์และสถานะการตรวจสอบ</caption><thead><tr>{["เหตุการณ์ / เวลา", "จุดตรวจ", "ประเภทเสียง", "คะแนนโมเดล", "สถานะงาน", "รายละเอียด"].map(name => <th key={name} scope="col">{name}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}>
      <td><strong>{item.id}</strong><small>{date(item.prediction.recordedAt)}</small></td>
      <td>{item.prediction.stationSnapshot?.name ?? item.prediction.stationId}<small>{item.prediction.stationId}</small></td>
      <td><PredictionSummary prediction={item.prediction} compact/><small>{predictionSource(item.prediction.source)}</small></td>
      <td><span className="score">{Math.round(item.prediction.scores[item.prediction.label] * 100)}%</span></td>
      <td><StatusBadge status={item.status}/></td><td><Link className="row-link" href={"/office/incidents/" + item.id} aria-label={"ดูรายละเอียด " + item.id}>ดูรายละเอียด<ArrowRight size={18} aria-hidden="true"/></Link></td>
    </tr>)}</tbody></table></div>
    <div className="incident-cards">{items.map(item => <article key={item.id} className="incident-card" aria-label={"เหตุการณ์ " + item.id}>
      <div className="section-title"><h3>{item.id}</h3><StatusBadge status={item.status}/></div>
      <dl className="info-list compact">
        <div><dt>เวลาที่ตรวจพบ</dt><dd>{date(item.prediction.recordedAt)}</dd></div>
        <div><dt>จุดตรวจ</dt><dd>{item.prediction.stationSnapshot?.name ?? item.prediction.stationId}<small> ({item.prediction.stationId})</small></dd></div>
        <div><dt>ประเภทเสียง</dt><dd><PredictionSummary prediction={item.prediction} compact/></dd></div>
        <div><dt>คะแนนโมเดล</dt><dd>{Math.round(item.prediction.scores[item.prediction.label] * 100)}%</dd></div>
        <div><dt>แหล่งผล</dt><dd>{predictionSource(item.prediction.source)}</dd></div>
      </dl><Link className="button button-outline" href={"/office/incidents/" + item.id}>ดูรายละเอียด {item.id}<ArrowRight size={18} aria-hidden="true"/></Link>
    </article>)}</div>
  </>;
}
