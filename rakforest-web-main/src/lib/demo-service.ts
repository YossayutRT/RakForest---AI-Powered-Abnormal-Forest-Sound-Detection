import { update } from "./browser-store";
import { predictionClassesAtThreshold, predictionName } from "./prediction";
import { validateStation } from "./thailand";
import { FIELD_USER, seed } from "./fixtures";
import type { DataService, Incident, NotificationService, Outcome, Snapshot } from "./types";
function find(state: Snapshot, id: string): Incident {
  const item=state.incidents.find(i=>i.id===id);
  if(!item) throw new Error("ไม่พบเหตุการณ์นี้");
  return item;
}
function log(item: Incident,text: string) { item.history.push({at:new Date().toISOString(),text}); }
function assertStatus(item: Incident, allowed: Incident["status"][]) {
  if(!allowed.includes(item.status)) throw new Error("สถานะงานเปลี่ยนแล้ว กรุณาตรวจสอบข้อมูลล่าสุด");
}
function validateImages(images: File[]) {
  if(images.length>3) throw new Error("แนบภาพได้ไม่เกิน 3 ภาพ");
  for(const file of images) if(!/^image\/(jpeg|png|webp)$/.test(file.type) || !file.size || file.size>5*1024*1024) throw new Error("ใช้ภาพ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB ต่อภาพ");
}
export function messageFor(item: Incident) {
  const classes=predictionClassesAtThreshold(item.prediction);
  const soundSummary=classes.length?classes.map(value=>`${value.label} ${Math.round(value.score*100)}%`).join(", "):predictionName(item.prediction)+" (ไม่มีคลาสถึงเกณฑ์เบื้องต้น)";
  return "RakForest • "+item.id+"\nคลาสเสียงที่ได้คะแนนถึงเกณฑ์: "+soundSummary+" • "+(item.prediction.stationSnapshot?.name ?? item.prediction.stationId)+"\n"+new Date(item.prediction.recordedAt).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})+"\n"+(item.note || "โปรดตรวจสอบบริเวณเสา")+"\nเปิดรายละเอียดงาน: /field/tasks/"+item.id;
}
function notify(state:Snapshot,item:Incident,fail:boolean) {
  const previous=state.notifications.filter(n=>n.incidentId===item.id);
  const error=!state.telegramConnected ? "ยังไม่เชื่อม Telegram จำลอง" : fail ? "จำลองการส่งข้อความล้มเหลว":"";
  state.notifications.push({id:crypto.randomUUID(),incidentId:item.id,status:error?"failed":"accepted",at:new Date().toISOString(),attempt:previous.length+1,message:messageFor(item),error:error||undefined});
}
export const demo: DataService & NotificationService = {
  saveStation: async (station, editing) => {
    if (sessionStorage.getItem("rakforest-role")!=="office") throw new Error("เฉพาะส่วนกลางจัดการเสาได้");
    const value=structuredClone(station); value.id=value.id.trim(); value.name=value.name.trim();
    await validateStation(value);
    return update(state=>{
      const index=state.stations.findIndex(s=>s.id===value.id);
      if (!editing && index!==-1) throw new Error("รหัสเสานี้มีอยู่แล้ว");
      if (editing && index===-1) throw new Error("ไม่พบเสาที่ต้องการแก้ไข");
      if (editing) state.stations[index]=value; else state.stations.push(value);
    });
  },
  getSnapshot: () => update(state=>state,true),
  reset: (empty=false) => update(state=>{Object.assign(state,seed(empty));return state;}),
  retry: (id) => update(state=>{
    const item=find(state,id);assertStatus(item,["dispatched","acknowledged","submitted"]);
    const last=state.notifications.filter(n=>n.incidentId===id).at(-1);
    if(last?.status==="accepted") throw new Error("รายการนี้ส่งจำลองสำเร็จแล้ว");
    notify(state,item,false);
  }),
  dispatch: (id,note,fail) => update(state=>{
    const item=find(state,id);assertStatus(item,["pending"]);
    item.status="dispatched";item.assigneeId=FIELD_USER;item.note=note.trim();
    log(item,"ส่วนกลางมอบหมายให้สมชาย ใจดี");notify(state,item,fail);
  }),
  acknowledge: id => update(state=>{
    const item=find(state,id);assertStatus(item,["dispatched"]);
    if(item.assigneeId!==FIELD_USER) throw new Error("ไม่มีสิทธิ์รับงานนี้");
    item.status="acknowledged";log(item,"เจ้าหน้าที่ภาคสนามรับทราบงาน");
  }),
  submitResult: (id,outcome:Outcome,notes,images) => {
    validateImages(images);
    return update(state=>{
      const item=find(state,id);assertStatus(item,["acknowledged"]);
      if(item.assigneeId!==FIELD_USER) throw new Error("ไม่มีสิทธิ์ส่งผล");
      if(!["found","not_found","unable_to_inspect"].includes(outcome)) throw new Error("กรุณาเลือกผลตรวจสอบ");
      const imageIds=images.map(file=>{const id=crypto.randomUUID();state.attachments.push({id,name:file.name,blob:file});return id;});
      item.result={outcome,notes:notes.trim(),imageIds};item.status="submitted";log(item,"ภาคสนามส่งผลตรวจสอบแล้ว");
    });
  },
  close: (id,reason) => update(state=>{
    const item=find(state,id);assertStatus(item,["pending","submitted"]);
    if(!reason.trim()) throw new Error("กรุณาระบุเหตุผลปิดงาน");
    item.status="closed";item.closeReason=reason.trim();log(item,"ส่วนกลางปิดงาน: "+reason.trim());
  }),
  setConnected: connected => update(state=>{state.telegramConnected=connected;})
};
