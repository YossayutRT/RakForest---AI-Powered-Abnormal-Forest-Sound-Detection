export type UserRole =
  | "super_admin"
  | "officer_backoffice"
  | "field_ranger"
  | "pending_verification"
  | "suspended";

export type VerificationStatus =
  | "pending"
  | "otp_sent"
  | "otp_verified"
  | "approved"
  | "rejected";

export type RiskLevel = "red" | "yellow" | "green";

export type ReportStatus =
  | "pending"
  | "under_review"
  | "dispatched"
  | "acknowledged"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "closed";

export type SourceType = "station_sensor" | "field_patrol";

export type FieldOutcome = "found" | "not_found" | "unable_to_inspect";

export type StationStatus = "online" | "offline" | "maintenance";

export interface Profile {
  id: string;
  employee_code: string | null;
  email: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  role: UserRole;
  assigned_zone_ids: string[];
  id_card_file_url: string | null;
  verification_status: VerificationStatus;
  otp_code?: string | null;
  otp_expires_at?: string | null;
  password_hash?: string | null;
  telegram_chat_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "security_alert" | "info" | "system";
  is_read: boolean;
  created_at: string;
}

export interface ForestZone {
  id: string;
  zone_code: string | null;
  name: string;
  province: string | null;
  district: string | null;
  area_rai: number | null;
  polygon_coords: [number, number][]; // [lng, lat][]
  current_risk_level: RiskLevel;
  responsible_officer_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorStation {
  id: string;
  station_code: string; // e.g., ST-01
  name: string;
  zone_id: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  status: StationStatus;
  battery_percent: number;
  last_heartbeat_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIScoreItem {
  classId: string;
  label: string;
  score: number;
}

export interface AISegmentItem {
  segmentIndex: number;
  startSeconds: number;
  endSeconds: number;
  scores: AIScoreItem[];
}

export interface AIRawResponse {
  requestId?: string;
  modelVersion?: string;
  label?: string;
  decisionThreshold?: number;
  source?: "http" | "fallback";
  scores?: AIScoreItem[];
  segments?: AISegmentItem[];
}

export interface AIClassification {
  id: string;
  report_audio_id: string;
  predicted_label: string;
  confidence: number;
  raw_response: AIRawResponse | null;
  model_version: string | null;
  processed_at: string;
}

export interface ReportAudio {
  id: string;
  report_id: string;
  file_url: string;
  file_name: string | null;
  duration_seconds: number | null;
  uploaded_at: string;
  ai_classifications?: AIClassification[];
}

export interface ReportEvidence {
  id: string;
  report_id: string;
  file_url: string;
  file_name: string | null;
  file_type: "image" | "video";
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ReportRecord {
  id: string;
  report_code: string;
  source_type: SourceType;
  reporter_id: string | null;
  zone_id: string | null;
  station_id: string | null;
  lat: number;
  lng: number;
  description: string | null;
  status: ReportStatus;
  risk_level: RiskLevel;
  assigned_to: string | null;
  dispatch_note: string | null;
  dispatched_at: string | null;
  acknowledged_at: string | null;
  field_outcome: FieldOutcome | null;
  field_notes: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  forest_zones?: ForestZone | null;
  sensor_stations?: SensorStation | null;
  reporter?: Profile | null;
  assignee?: Profile | null;
  report_audio?: ReportAudio[];
  report_evidence?: ReportEvidence[];
}

export interface NotificationRule {
  id: string;
  risk_level: RiskLevel;
  action_description: string | null;
  channels: string[];
  auto_dispatch: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  report_id: string | null;
  channel: string;
  recipient: string | null;
  message: string;
  status: "sent" | "failed" | "pending";
  error_message: string | null;
  sent_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
