import { predictionClassesAtThreshold } from "@/lib/prediction";
import type { Prediction } from "@/lib/types";

export default function PredictionSummary({ prediction, compact = false }: { prediction: Prediction; compact?: boolean }) {
  const classes = predictionClassesAtThreshold(prediction);
  const threshold = Math.round((prediction.decisionThreshold ?? 0.5) * 100);
  return <div className={`prediction-summary${compact ? " compact" : ""}`} aria-label={`คลาสที่ได้คะแนนตั้งแต่ ${threshold} เปอร์เซ็นต์`}>
    <span className="prediction-summary-title">คลาสที่ได้คะแนนถึงเกณฑ์เบื้องต้น ≥{threshold}%</span>
    {classes.length ? <div className="prediction-summary-chips">{classes.map(item => <span className="prediction-summary-chip" key={item.classId}>{item.label} <strong>{Math.round(item.score * 100)}%</strong></span>)}</div> : <p className="prediction-summary-empty">ไม่มีคลาสถึงเกณฑ์ • คะแนนสูงสุด {Math.round(Math.max(...Object.values(prediction.scores), 0) * 100)}%</p>}
    {classes.some(item => item.classId === "other") && <small>“เสียงอื่น” เป็นหมวดกว้าง ควรเปิดฟังและตรวจรายละเอียด</small>}
  </div>;
}
