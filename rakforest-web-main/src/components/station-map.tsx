"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Station } from "@/lib/types";
import { loadThailand } from "@/lib/thailand";
function circle(lng:number,lat:number,radius:number): number[][] {
  const phi=lat*Math.PI/180, lambda=lng*Math.PI/180, delta=radius/6371008.8;
  return Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2; const p=Math.asin(Math.sin(phi)*Math.cos(delta)+Math.cos(phi)*Math.sin(delta)*Math.cos(a));return [(lambda+Math.atan2(Math.sin(a)*Math.sin(delta)*Math.cos(phi),Math.cos(delta)-Math.sin(phi)*Math.sin(p)))*180/Math.PI,p*180/Math.PI];});
}
const THAILAND: [[number,number],[number,number]]=[[97.3,5.5],[105.7,20.5]];
export default function StationMap({stations,selected,onSelect,compact=false,onPick,draft,collapsibleNotes=false,showAllAreas=false}:{stations:Station[];selected?:string;onSelect?:(id:string)=>void;compact?:boolean;onPick?:(coordinates:[number,number])=>void;draft?:Station;collapsibleNotes?:boolean;showAllAreas?:boolean}) {
  const container=useRef<HTMLDivElement>(null), mapRef=useRef<maplibregl.Map|null>(null);
  const current=useRef({stations,onSelect,onPick,selected}); current.current={stations,onSelect,onPick,selected};
  const markersRef=useRef<maplibregl.Marker[]>([]);
  const [error,setError]=useState(""),[ready,setReady]=useState(false),[tilesLoading,setTilesLoading]=useState(true);
  function fitStations() {
    const list=current.current.stations, map=mapRef.current;
    if(!map||!list.length)return;
    const bounds=new maplibregl.LngLatBounds();list.forEach(s=>bounds.extend(s.coordinates));
    map.fitBounds(bounds,{padding:95,maxZoom:15,duration:0});
  }
  useEffect(()=>{
    if(!container.current)return;
    let map:maplibregl.Map|undefined, disposed=false;
    try {
      map=new maplibregl.Map({container:container.current,bounds:THAILAND,fitBoundsOptions:{padding:35},maxBounds:[[95,3],[108,23]],attributionControl:{compact:false},style:{version:8,sources:{osm:{type:"raster",tiles:[process.env.NEXT_PUBLIC_MAP_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,maxzoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}},layers:[{id:"base",type:"raster",source:"osm"}]}});
      mapRef.current=map; map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
      const zoomIn=map.getContainer().querySelector<HTMLButtonElement>(".maplibregl-ctrl-zoom-in"),zoomOut=map.getContainer().querySelector<HTMLButtonElement>(".maplibregl-ctrl-zoom-out");
      zoomIn?.setAttribute("aria-label","ขยายแผนที่");zoomIn?.setAttribute("title","ขยายแผนที่");zoomOut?.setAttribute("aria-label","ย่อแผนที่");zoomOut?.setAttribute("title","ย่อแผนที่");
      map.on("dataloading",()=>setTilesLoading(true));
      map.on("idle",()=>setTilesLoading(false));
      map.on("error",()=>setError("โหลดแผนที่บางส่วนไม่สำเร็จ ยังใช้รายการเสาและกรอกพิกัดได้"));
      map.on("click",e=>current.current.onPick?.([e.lngLat.lng,e.lngLat.lat]));
      map.on("load",()=>{
        if(!map)return;
        map.addSource("area",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
        map.addLayer({id:"area-fill",type:"fill",source:"area",paint:{"fill-color":"#d5a04a","fill-opacity":.2}});
        map.addLayer({id:"area-line",type:"line",source:"area",paint:{"line-color":"#b87a20","line-width":2,"line-dasharray":[3,2]}});
        setReady(true); if(compact)fitStations();
        loadThailand().then(data=>{if(disposed||!map)return;map.addSource("thailand",{type:"geojson",data});map.addLayer({id:"thailand-border",type:"line",source:"thailand",paint:{"line-color":"#356c55","line-width":1.5}},"area-fill");}).catch(e=>{if(!disposed)setError(e.message);});
      });
    } catch {setError("อุปกรณ์นี้ไม่รองรับแผนที่ WebGL ใช้รายการเสาและกรอกพิกัดได้");}
    const observer=new ResizeObserver(()=>{if(container.current?.clientWidth&&container.current?.clientHeight)map?.resize();});
    observer.observe(container.current);
    return()=>{disposed=true;observer.disconnect();mapRef.current=null;map?.remove();};
  },[compact]);
  const dataKey=JSON.stringify({stations,draft});
  useEffect(()=>{
    const map=mapRef.current; if(!ready||!map)return;
    const list=draft?[...stations.filter(s=>s.id!==draft.id),draft]:stations;
    const markers=list.map(station=>{
      const button=document.createElement("button");button.className="map-pin";button.type="button";button.textContent=station.id+" · "+station.name+(station.active?"":" (ปิด)");button.setAttribute("aria-label","เลือก"+station.name);button.dataset.stationId=station.id;button.disabled=!onSelect;
      button.onclick=e=>{e.stopPropagation();current.current.onSelect?.(station.id);};
      return new maplibregl.Marker({element:button}).setLngLat(station.coordinates).addTo(map);
    });
    markersRef.current=markers;
    return()=>{markers.forEach(marker=>marker.remove());markersRef.current=[];};
    // Marker DOM stays stable while only the selected station changes, preserving keyboard focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready,dataKey]);
  useEffect(()=>{
    const map=mapRef.current;if(!ready||!map)return;
    const list=draft?[...stations.filter(s=>s.id!==draft.id),draft]:stations;
    for(const marker of markersRef.current){const el=marker.getElement();const chosen=el.dataset.stationId===(draft?.id??selected);el.classList.toggle("is-selected",chosen);el.setAttribute("aria-pressed",String(chosen));el.style.zIndex=chosen?"2":"1";const station=list.find(s=>s.id===el.dataset.stationId);if(station)el.textContent=(chosen?"✓ ":"")+station.name+" · "+station.id+(station.active?"":" (ปิด)");}
    (map.getSource("area") as maplibregl.GeoJSONSource).setData({type:"FeatureCollection",features:list.filter(s=>(showAllAreas&&!draft&&!selected)||s.id===(draft?.id||selected)).map(s=>({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[circle(...s.coordinates,s.radius)]}}))});
    // Serialized station content prevents unnecessary updates on IDB polling snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready,dataKey,selected,showAllAreas]);
  const notes=<><p className="small muted">ข้อมูลเสาสาธิต · รัศมีรับเสียงโดยประมาณ — ยังไม่ผ่านการทดสอบภาคสนาม · ไม่ยืนยันตำแหน่งต้นเสียง</p><p className="small muted">ขอบเขตประเทศ: geoBoundaries / OpenStreetMap, Wambacher (ODbL) · ไม่ใช่แนวเขตทางกฎหมาย</p></>;
  return <><div className="actions map-tools"><button type="button" className="button button-outline" disabled={!ready} onClick={()=>mapRef.current?.fitBounds(THAILAND,{padding:35,duration:0})}>ดูประเทศไทย</button><button type="button" className="button button-outline" disabled={!ready} onClick={fitStations}>ดูเสาทั้งหมด</button><button type="button" className="button button-outline" disabled={!ready||(!draft&&!selected)} onClick={()=>{const target=draft??stations.find(s=>s.id===selected);if(!target)return;const bounds=new maplibregl.LngLatBounds();circle(...target.coordinates,target.radius).forEach(p=>bounds.extend(p as [number,number]));mapRef.current?.fitBounds(bounds,{padding:55,maxZoom:16,duration:0});}}>ดูตำแหน่งที่เลือก</button></div><div data-map-ready={ready} data-map-idle={ready&&!tilesLoading} className={"map-wrap "+(compact?"compact":"")}><div ref={container} className="map-canvas" aria-busy={tilesLoading} aria-label="แผนที่เสาไมค์ประเทศไทย"/>{error&&<div role="alert" className="map-error">{error}</div>}</div>{collapsibleNotes?<details className="map-details"><summary>ข้อมูลแผนที่และข้อจำกัด</summary>{notes}</details>:notes}</>;
}
