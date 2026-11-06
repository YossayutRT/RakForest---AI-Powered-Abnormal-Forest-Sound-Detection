import {
  OUTCOME_LABELS_TH,
  RISK_LABELS_TH,
  STATION_STATUS_TH,
  STATUS_LABELS_TH,
} from "@/lib/utils/risk";
import type {
  FieldOutcome,
  ReportStatus,
  RiskLevel,
  StationStatus,
} from "@/types/database.types";

export function RiskBadge({
  level,
  size = "sm",
}: {
  level: RiskLevel;
  size?: "xs" | "sm" | "md";
}) {
  const styles: Record<RiskLevel, string> = {
    red: "bg-red-50 text-red-800 border-red-300",
    yellow: "bg-amber-50 text-amber-800 border-amber-300",
    green: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };
  const dotStyles: Record<RiskLevel, string> = {
    red: "bg-[#D62828]",
    yellow: "bg-[#F4A300]",
    green: "bg-[#2D8A3E]",
  };
  const sizeClass =
    size === "xs"
      ? "px-2 py-0.5 text-[11px]"
      : size === "md"
        ? "px-3 py-1 text-sm"
        : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-semibold whitespace-nowrap ${styles[level]} ${sizeClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles[level]}`} />
      {RISK_LABELS_TH[level]}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    pending: "bg-amber-50 text-amber-900 border-amber-300",
    under_review: "bg-blue-50 text-blue-800 border-blue-300",
    dispatched: "bg-indigo-50 text-indigo-800 border-indigo-300",
    acknowledged: "bg-sky-50 text-sky-800 border-sky-300",
    submitted: "bg-teal-50 text-teal-800 border-teal-300",
    confirmed: "bg-red-100 text-red-900 border-red-400",
    rejected: "bg-slate-100 text-slate-700 border-slate-300",
    closed: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {STATUS_LABELS_TH[status]}
    </span>
  );
}

export function StationStatusBadge({ status }: { status: StationStatus }) {
  const styles: Record<StationStatus, string> = {
    online: "bg-emerald-50 text-emerald-800 border-emerald-300",
    offline: "bg-red-50 text-red-800 border-red-300",
    maintenance: "bg-amber-50 text-amber-800 border-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "online"
            ? "bg-emerald-600"
            : status === "offline"
              ? "bg-red-600"
              : "bg-amber-600"
        }`}
      />
      {STATION_STATUS_TH[status]}
    </span>
  );
}

export function FieldOutcomeBadge({ outcome }: { outcome: FieldOutcome }) {
  const styles: Record<FieldOutcome, string> = {
    found: "bg-red-50 text-red-800 border-red-300",
    not_found: "bg-emerald-50 text-emerald-800 border-emerald-300",
    unable_to_inspect: "bg-amber-50 text-amber-800 border-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold ${styles[outcome]}`}
    >
      {OUTCOME_LABELS_TH[outcome]}
    </span>
  );
}
