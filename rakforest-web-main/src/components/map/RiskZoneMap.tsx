"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Layers, Maximize2, Navigation, Radio } from "lucide-react";
import { createCirclePolygon } from "@/lib/utils/geo";
import type {
  ForestZone,
  ReportRecord,
  SensorStation,
} from "@/types/database.types";

export type BasemapStyle = "street" | "topo" | "satellite";

interface Props {
  zones?: ForestZone[];
  stations?: SensorStation[];
  reports?: ReportRecord[];
  selectedZoneId?: string | null;
  selectedStationId?: string | null;
  selectedReportId?: string | null;
  onSelectZone?: (zoneId: string) => void;
  onSelectStation?: (stationId: string) => void;
  onSelectReport?: (reportId: string) => void;
  onMapClickCoordinates?: (coords: [number, number]) => void; // [lng, lat]
  draftPolygonCoords?: [number, number][]; // For drawing a new forest zone
  draftPointCoords?: [number, number] | null; // For placing a station or field GPS pin
  draftRadiusMeters?: number;
  heightClass?: string;
  showLayerControls?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const THAILAND_BOUNDS: [[number, number], [number, number]] = [
  [97.3, 5.6],
  [105.7, 20.5],
];

const CHIANGMAI_BOUNDS: [[number, number], [number, number]] = [
  [98.72, 18.08],
  [98.89, 18.21],
];

export default function RiskZoneMap({
  zones = [],
  stations = [],
  reports = [],
  selectedZoneId,
  selectedStationId,
  selectedReportId,
  onSelectZone,
  onSelectStation,
  onSelectReport,
  onMapClickCoordinates,
  draftPolygonCoords,
  draftPointCoords,
  draftRadiusMeters = 350,
  heightClass = "h-[520px]",
  showLayerControls = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<BasemapStyle>("street");
  const [showZones, setShowZones] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showRadii, setShowRadii] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);

  const callbacksRef = useRef({
    onSelectZone,
    onSelectStation,
    onSelectReport,
    onMapClickCoordinates,
  });
  callbacksRef.current = {
    onSelectZone,
    onSelectStation,
    onSelectReport,
    onMapClickCoordinates,
  };

  function flyToZone(zone: ForestZone) {
    const map = mapRef.current;
    if (!map || !zone.polygon_coords?.length) return;
    const bounds = new maplibregl.LngLatBounds();
    zone.polygon_coords.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
  }

  function flyToStations() {
    const map = mapRef.current;
    if (!map || !stations.length) return;
    const bounds = new maplibregl.LngLatBounds();
    stations.slice(0, 4).forEach((s) => bounds.extend([s.lng, s.lat]));
    map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 600 });
  }

  // Initialize MapLibre instance ONCE with all 3 raster basemap layers so switching basemaps never destroys vector overlays!
  useEffect(() => {
    if (!containerRef.current) return;
    let map: maplibregl.Map | null = null;
    setReady(false);

    try {
      const streetTileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

      map = new maplibregl.Map({
        container: containerRef.current,
        bounds: CHIANGMAI_BOUNDS,
        fitBoundsOptions: { padding: 40 },
        maxBounds: [
          [94.0, 3.0],
          [109.0, 23.0],
        ],
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            "basemap-street": {
              type: "raster",
              tiles: [streetTileUrl],
              tileSize: 256,
              maxzoom: 19,
              attribution: "© OpenStreetMap contributors",
            },
            "basemap-topo": {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: "Tiles © Esri — World Topographic Map",
            },
            "basemap-satellite": {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: "Tiles © Esri — World Imagery",
            },
          },
          layers: [
            {
              id: "basemap-street-layer",
              type: "raster",
              source: "basemap-street",
              layout: { visibility: "visible" },
            },
            {
              id: "basemap-topo-layer",
              type: "raster",
              source: "basemap-topo",
              layout: { visibility: "none" },
            },
            {
              id: "basemap-satellite-layer",
              type: "raster",
              source: "basemap-satellite",
              layout: { visibility: "none" },
            },
          ],
        },
      });

      mapRef.current = map;
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );

      map.on("click", (e) => {
        callbacksRef.current.onMapClickCoordinates?.([
          Number(e.lngLat.lng.toFixed(6)),
          Number(e.lngLat.lat.toFixed(6)),
        ]);
      });

      map.on("load", () => {
        if (!map) return;

        // 1. Forest Zones Source & High-Contrast Layers (clearly visible on Street, Topo, and Satellite!)
        map.addSource("forest-zones", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "forest-zones-fill",
          type: "fill",
          source: "forest-zones",
          paint: {
            "fill-color": [
              "match",
              ["get", "risk"],
              "red",
              "#EF4444",
              "yellow",
              "#F59E0B",
              "#10B981",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["get", "selected"], false],
              0.45,
              0.28,
            ],
          },
        });

        // White outer casing so zone borders stand out sharply on dark satellite imagery
        map.addLayer({
          id: "forest-zones-casing",
          type: "line",
          source: "forest-zones",
          paint: {
            "line-color": "#FFFFFF",
            "line-width": [
              "case",
              ["boolean", ["get", "selected"], false],
              5,
              3.5,
            ],
            "line-opacity": 0.85,
          },
        });

        map.addLayer({
          id: "forest-zones-line",
          type: "line",
          source: "forest-zones",
          paint: {
            "line-color": [
              "match",
              ["get", "risk"],
              "red",
              "#DC2626",
              "yellow",
              "#D97706",
              "#059669",
            ],
            "line-width": [
              "case",
              ["boolean", ["get", "selected"], false],
              3.5,
              2.5,
            ],
          },
        });

        map.on("click", "forest-zones-fill", (e) => {
          const zoneId = e.features?.[0]?.properties?.id;
          if (zoneId && callbacksRef.current.onSelectZone) {
            callbacksRef.current.onSelectZone(zoneId);
          }
        });

        // 2. Station Listening Radius Source & Layers
        map.addSource("station-radii", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "station-radii-fill",
          type: "fill",
          source: "station-radii",
          paint: {
            "fill-color": [
              "match",
              ["get", "tone"],
              "red",
              "#D62828",
              "yellow",
              "#D97706",
              "#2D6A4F",
            ],
            "fill-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "station-radii-line",
          type: "line",
          source: "station-radii",
          paint: {
            "line-color": [
              "match",
              ["get", "tone"],
              "red",
              "#FF4D4D",
              "yellow",
              "#FBBF24",
              "#34D399",
            ],
            "line-width": 2,
            "line-dasharray": [3, 2],
          },
        });

        // 3. Draft Polygon / Draft Point Source
        map.addSource("draft-geometry", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "draft-polygon-fill",
          type: "fill",
          source: "draft-geometry",
          paint: {
            "fill-color": "#2563EB",
            "fill-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "draft-polygon-line",
          type: "line",
          source: "draft-geometry",
          paint: {
            "line-color": "#1D4ED8",
            "line-width": 2.5,
            "line-dasharray": [2, 2],
          },
        });

        setReady(true);
      });
    } catch {
      // WebGL fallback handled gracefully
    }

    const observer = new ResizeObserver(() => {
      map?.resize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current = null;
      setReady(false);
      map?.remove();
    };
  }, []);

  // Toggle Basemap Raster Layer Visibility without resetting the map or losing polygons!
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const layerMap: Record<BasemapStyle, string> = {
      street: "basemap-street-layer",
      topo: "basemap-topo-layer",
      satellite: "basemap-satellite-layer",
    };

    (Object.keys(layerMap) as BasemapStyle[]).forEach((key) => {
      const layerId = layerMap[key];
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          basemap === key ? "visible" : "none"
        );
      }
    });
  }, [ready, basemap]);

  // Update GeoJSON sources & HTML markers whenever data or visibility toggles change
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    // 1. Update Forest Zones GeoJSON
    const zonesSource = map.getSource("forest-zones") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (zonesSource) {
      zonesSource.setData({
        type: "FeatureCollection",
        features: showZones
          ? zones
              .filter((z) => z.polygon_coords && z.polygon_coords.length >= 3)
              .map((z) => {
                const ring =
                  z.polygon_coords[0][0] ===
                    z.polygon_coords[z.polygon_coords.length - 1][0] &&
                  z.polygon_coords[0][1] ===
                    z.polygon_coords[z.polygon_coords.length - 1][1]
                    ? z.polygon_coords
                    : [...z.polygon_coords, z.polygon_coords[0]];
                return {
                  type: "Feature" as const,
                  properties: {
                    id: z.id,
                    name: z.name,
                    risk: z.current_risk_level,
                    selected: z.id === selectedZoneId,
                  },
                  geometry: {
                    type: "Polygon" as const,
                    coordinates: [ring],
                  },
                };
              })
          : [],
      });
    }

    // 2. Update Station Listening Radii GeoJSON
    const radiiSource = map.getSource("station-radii") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (radiiSource) {
      const features =
        showStations && showRadii
          ? stations.map((st) => {
              const activeReports = reports.filter(
                (r) =>
                  r.station_id === st.id &&
                  !["closed", "rejected"].includes(r.status)
              );
              const hasRed = activeReports.some((r) => r.risk_level === "red");
              const hasYellow = activeReports.some(
                (r) => r.risk_level === "yellow"
              );
              return {
                type: "Feature" as const,
                properties: {
                  id: st.id,
                  tone: hasRed ? "red" : hasYellow ? "yellow" : "green",
                },
                geometry: {
                  type: "Polygon" as const,
                  coordinates: [
                    createCirclePolygon(st.lng, st.lat, st.radius_meters || 350),
                  ],
                },
              };
            })
          : [];

      if (draftPointCoords) {
        features.push({
          type: "Feature" as const,
          properties: { id: "draft-station", tone: "yellow" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              createCirclePolygon(
                draftPointCoords[0],
                draftPointCoords[1],
                draftRadiusMeters
              ),
            ],
          },
        });
      }

      radiiSource.setData({
        type: "FeatureCollection",
        features,
      });
    }

    // 3. Update Draft Polygon Source
    const draftSource = map.getSource("draft-geometry") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (draftSource) {
      if (draftPolygonCoords && draftPolygonCoords.length >= 2) {
        const ring = [...draftPolygonCoords, draftPolygonCoords[0]];
        draftSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry:
                draftPolygonCoords.length >= 3
                  ? { type: "Polygon" as const, coordinates: [ring] }
                  : {
                      type: "LineString" as const,
                      coordinates: draftPolygonCoords,
                    },
            },
          ],
        });
      } else {
        draftSource.setData({ type: "FeatureCollection", features: [] });
      }
    }

    // 4. Rebuild DOM Markers for Forest Zones, Sensor Stations & Field Reports
    markersRef.current.forEach((m) => m.remove());
    const nextMarkers: maplibregl.Marker[] = [];

    // 4a. Zone Label Badges at polygon centroid (so zones are visible even at nationwide zoom!)
    if (showZones) {
      for (const z of zones) {
        if (!z.polygon_coords || z.polygon_coords.length < 3) continue;
        const pts = z.polygon_coords;
        const avgLng = pts.reduce((acc, p) => acc + p[0], 0) / pts.length;
        const avgLat = pts.reduce((acc, p) => acc + p[1], 0) / pts.length;
        const isSelected = z.id === selectedZoneId;

        const badge = document.createElement("button");
        badge.type = "button";
        const colorStyle =
          z.current_risk_level === "red"
            ? "bg-red-700/90 text-white border-red-200"
            : z.current_risk_level === "yellow"
              ? "bg-amber-600/90 text-white border-amber-200"
              : "bg-emerald-800/90 text-white border-emerald-200";
        badge.className = `px-2 py-0.5 rounded-full border text-[11px] font-bold shadow-md cursor-pointer transition hover:scale-105 ${colorStyle} ${
          isSelected ? "ring-2 ring-amber-300" : ""
        }`;
        badge.textContent = `🌲 ${z.zone_code}`;
        badge.title = `${z.zone_code} · ${z.name} (คลิกเพื่อซูมดูขอบเขตโซนป่า)`;
        badge.onclick = (e) => {
          e.stopPropagation();
          callbacksRef.current.onSelectZone?.(z.id);
          flyToZone(z);
        };

        const zm = new maplibregl.Marker({ element: badge, anchor: "bottom" })
          .setLngLat([avgLng, Math.max(...pts.map((p) => p[1]))])
          .addTo(map);
        nextMarkers.push(zm);
      }
    }

    if (showStations) {
      for (const st of stations) {
        const activeReports = reports.filter(
          (r) =>
            r.station_id === st.id && !["closed", "rejected"].includes(r.status)
        );
        const hasRed = activeReports.some((r) => r.risk_level === "red");
        const hasYellow = activeReports.some((r) => r.risk_level === "yellow");
        const isSelected =
          st.id === selectedStationId || st.station_code === selectedStationId;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = [
          "rf-station-marker font-mono-code",
          hasRed
            ? "is-alert"
            : hasYellow
              ? "is-warning"
              : st.status !== "online"
                ? "is-maintenance"
                : "",
          isSelected ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        btn.innerHTML = `<span>📡 ${st.station_code}</span>`;
        btn.title = `${st.station_code} · ${st.name} (รัศมี ${st.radius_meters} ม.)`;
        btn.onclick = (e) => {
          e.stopPropagation();
          callbacksRef.current.onSelectStation?.(st.id);
        };

        const marker = new maplibregl.Marker({ element: btn })
          .setLngLat([st.lng, st.lat])
          .addTo(map);
        nextMarkers.push(marker);
      }
    }

    if (showReports) {
      for (const rep of reports) {
        if (rep.status === "closed" || rep.status === "rejected") continue;
        // Offset slightly if at the exact same coordinate as a station so both remain clickable
        const offsetLng =
          rep.source_type === "station_sensor" ? rep.lng + 0.0012 : rep.lng;
        const offsetLat =
          rep.source_type === "station_sensor" ? rep.lat + 0.0009 : rep.lat;

        const el = document.createElement("button");
        el.type = "button";
        el.className = `rf-report-marker risk-${rep.risk_level} ${
          rep.id === selectedReportId ? "ring-4 ring-amber-300" : ""
        }`;
        el.textContent = rep.risk_level === "red" ? "!" : "•";
        el.title = `${rep.report_code} (${rep.description || "รายงานเหตุการณ์"})`;
        el.onclick = (e) => {
          e.stopPropagation();
          callbacksRef.current.onSelectReport?.(rep.id);
        };

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([offsetLng, offsetLat])
          .addTo(map);
        nextMarkers.push(marker);
      }
    }

    if (draftPointCoords) {
      const pin = document.createElement("div");
      pin.className =
        "px-2 py-1 rounded bg-blue-600 text-white font-mono-code text-xs font-bold border-2 border-white shadow-lg";
      pin.textContent = `📍 ${draftPointCoords[1].toFixed(4)}, ${draftPointCoords[0].toFixed(4)}`;
      const m = new maplibregl.Marker({ element: pin })
        .setLngLat(draftPointCoords)
        .addTo(map);
      nextMarkers.push(m);
    }

    markersRef.current = nextMarkers;
  }, [
    ready,
    zones,
    stations,
    reports,
    selectedZoneId,
    selectedStationId,
    selectedReportId,
    showZones,
    showStations,
    showRadii,
    showReports,
    draftPolygonCoords,
    draftPointCoords,
    draftRadiusMeters,
  ]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-[#C6D1C8] bg-[#DCE5DD] ${heightClass}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Top Controls Overlay Bar (Flex-wrap so left camera jumps & right basemaps never collide in ก+ mode!) */}
      <div className="absolute top-2.5 inset-x-2.5 z-10 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        {/* Left Camera Jumps */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={flyToStations}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#B8C7BC] bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14241B] shadow-xs hover:bg-[#EBF2ED] whitespace-nowrap"
          >
            <Radio className="h-3.5 w-3.5 text-[#1B4332]" />
            <span>เสาไมค์แม่ริม–แม่แตง</span>
          </button>
          <button
            type="button"
            onClick={() =>
              mapRef.current?.fitBounds(THAILAND_BOUNDS, {
                padding: 35,
                duration: 600,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[#B8C7BC] bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14241B] shadow-xs hover:bg-[#EBF2ED] whitespace-nowrap"
          >
            <Maximize2 className="h-3.5 w-3.5 text-[#1B4332]" />
            <span>ทั่วประเทศ</span>
          </button>
          {selectedZoneId && (
            <button
              type="button"
              onClick={() => {
                const z = zones.find((item) => item.id === selectedZoneId);
                if (z) flyToZone(z);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#1B4332] bg-[#1B4332] px-2.5 py-1 text-xs font-semibold text-white shadow-xs whitespace-nowrap"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>ซูมเข้าโซนที่เลือก</span>
            </button>
          )}
        </div>

        {/* Right Basemap & Layer Control Trigger */}
        {showLayerControls && (
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 ml-auto">
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-[#B8C7BC] bg-white/95 p-1 shadow-xs">
              {(
                [
                  { id: "street", label: "ทั่วไป" },
                  { id: "topo", label: "ภูมิประเทศ" },
                  { id: "satellite", label: "ดาวเทียม" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBasemap(item.id)}
                  className={`rounded px-2 py-0.5 text-xs font-semibold transition whitespace-nowrap ${
                    basemap === item.id
                      ? "bg-[#1B4332] text-white"
                      : "text-[#526358] hover:text-[#14241B]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLayerDrawerOpen((v) => !v)}
                className="ml-0.5 inline-flex items-center gap-1 rounded border border-[#D4DCD5] bg-[#F4F7F4] px-2 py-0.5 text-xs font-semibold text-[#1B4332] whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ชั้นข้อมูล</span>
              </button>
            </div>

            {layerDrawerOpen && (
              <div className="w-60 rounded-lg border border-[#B8C7BC] bg-white/98 p-3 shadow-lg text-xs space-y-2">
                <p className="font-bold text-[#14241B] border-b border-[#E5ECE6] pb-1.5">
                  เปิด/ปิดชั้นข้อมูล GIS
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showZones}
                    onChange={(e) => setShowZones(e.target.checked)}
                  />
                  <span>ขอบเขตโซนป่าไม้ (Polygons)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStations}
                    onChange={(e) => setShowStations(e.target.checked)}
                  />
                  <span>เสาไมค์ตรวจจับเสียง (ST-XX)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRadii}
                    onChange={(e) => setShowRadii(e.target.checked)}
                  />
                  <span>วงรัศมีรับเสียงของเสาไมค์</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReports}
                    onChange={(e) => setShowReports(e.target.checked)}
                  />
                  <span>หมุดเหตุการณ์แจ้งเตือน</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom-Left Legend */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex flex-wrap items-center gap-3 rounded-md border border-[#B8C7BC] bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[#14241B] shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D62828]" />
          เสี่ยงสูง (ไฟป่า/เลื่อยยนต์/ปืน)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F4A300]" />
          เฝ้าระวัง (ยานพาหนะ/บุกรุก)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2D8A3E]" />
          ปกติ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-dashed border-[#1B4332] bg-[#2D6A4F]/25" />
          รัศมีรับเสียงเสาไมค์
        </span>
      </div>
    </div>
  );
}
