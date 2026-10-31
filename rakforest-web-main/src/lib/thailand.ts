import type { Station } from "./types";
export type Boundary = {type:"FeatureCollection";features:{type:"Feature";properties:Record<string,unknown>;geometry:{type:"Polygon";coordinates:number[][][]}|{type:"MultiPolygon";coordinates:number[][][][]}}[]};
let boundary: Promise<Boundary> | undefined;
export function loadThailand(): Promise<Boundary> {
  if (!boundary) boundary = fetch("/data/thailand.geojson").then(async response => {
    if (!response.ok) throw new Error();
    const data = await response.json() as Boundary;
    if (data.type !== "FeatureCollection" || !data.features.length || data.features.some(f => !["Polygon", "MultiPolygon"].includes(f.geometry.type))) throw new Error();
    return data;
  }).catch(() => { boundary = undefined; throw new Error("โหลดขอบเขตประเทศไทยไม่ได้ กรุณาลองใหม่ ข้อมูลในฟอร์มยังอยู่"); });
  return boundary;
}
function ringContains([x,y]: number[], ring: number[][]): boolean {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [a,b]=ring[i], [c,d]=ring[j];
    if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
  }
  return inside;
}
export function inThailand(point: number[], data: Boundary): boolean {
  return data.features.some(f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
    .some(p => ringContains(point,p[0]) && !p.slice(1).some(hole => ringContains(point,hole))));
}
export async function validateStation(station: Station) {
  const [lng,lat]=station.coordinates;
  if (!station.id.trim() || !station.name.trim()) throw new Error("กรุณาระบุรหัสและชื่อเสา");
  if (!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) throw new Error("กรุณาตรวจละติจูดและลองจิจูด");
  if (!Number.isFinite(station.radius)||station.radius<=0) throw new Error("รัศมีต้องเป็นจำนวนบวก");
  if (!inThailand(station.coordinates,await loadThailand())) throw new Error("รอบนี้รองรับการติดตั้งเสาเฉพาะประเทศไทย");
}
