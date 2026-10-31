export type Role = "office" | "field";
export type Status = "pending" | "dispatched" | "acknowledged" | "submitted" | "closed";
export type Outcome = "found" | "not_found" | "unable_to_inspect";
export type Station = { id: string; name: string; coordinates: [number, number]; radius: number; active: boolean };
export type PredictionSegment = { segmentIndex: number; startSeconds: number; endSeconds: number; scores: Record<string, number> };
export type Prediction = { id: string; stationId: string; stationSnapshot?: Station; label: string; scores: Record<string, number>; classLabels?: Record<string, string>; source: "mock" | "http"; modelVersion: string; recordedAt: string; audioId?: string; decisionThreshold?: number; segments?: PredictionSegment[] };
export type Job = { id: string; stationId: string; stationSnapshot?: Station; audioId: string; createdAt: string; readyAt?: number; fail?: boolean; source: "mock" | "http"; attemptId?: string; interrupted?: boolean; status: "queued" | "processing" | "succeeded" | "failed"; incidentId?: string; error?: string };
export type Incident = { id: string; prediction: Prediction; status: Status; assigneeId?: string; note?: string; result?: { outcome: Outcome; notes: string; imageIds: string[] }; closeReason?: string; history: { at: string; text: string }[] };
export type Notification = { id: string; incidentId: string; status: "accepted" | "failed"; at: string; attempt: number; message: string; error?: string };
export type Attachment = { id: string; name: string; blob: Blob };
export type Snapshot = { version: 2; stations: Station[]; incidents: Incident[]; jobs: Job[]; notifications: Notification[]; attachments: Attachment[]; telegramConnected: boolean };
export interface DataService {
  getSnapshot(): Promise<Snapshot>;
  saveStation(station: Station, editing: boolean): Promise<void>;
  reset(empty?: boolean): Promise<Snapshot>;
  dispatch(id: string, note: string, fail: boolean): Promise<void>;
  acknowledge(id: string): Promise<void>;
  submitResult(id: string, outcome: Outcome, notes: string, images: File[]): Promise<void>;
  close(id: string, reason: string): Promise<void>;
}
export interface AnalysisService {
  getConfig(): Promise<import("./ml-contract").AnalysisConfig>;
  recover(): Promise<void>;
  submit(stationId: string, audio: File, fail?: boolean): Promise<string>;
  retry(jobId: string): Promise<void>;
}
export interface NotificationService { setConnected(connected: boolean): Promise<void>; retry(incidentId: string): Promise<void> }
