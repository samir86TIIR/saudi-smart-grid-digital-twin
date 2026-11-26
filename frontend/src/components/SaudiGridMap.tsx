import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import {
  BlastRadiusResult,
  EnergyFlowEdge,
  GridSiteNode,
  RegionViewport,
} from '../types/grid';

interface SaudiGridMapProps {
  nodes: GridSiteNode[];
  edges: EnergyFlowEdge[];
  viewport: RegionViewport;
  selectedNodeId: string | null;
  blastRadius: BlastRadiusResult | null;
  showArcs: boolean;
  onSelectNode: (node: GridSiteNode) => void;
}

const CARTO_DARK_MATTER_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function getNodeFillColor(
  node: GridSiteNode,
  isSelected: boolean,
  isImpacted: boolean
): [number, number, number, number] {
  if (isImpacted) return [239, 68, 68, 245]; // Crimson Blast Radius
  if (isSelected) return [34, 211, 238, 255]; // Cyan Highlight
  if (node.status === 'critical') return [239, 68, 68, 235];
  if (node.status === 'warning') return [245, 158, 11, 235];
  if (node.category === 'energy_source') return [16, 185, 129, 235]; // Renewable Emerald
  if (node.category === 'regional_hub') return [34, 211, 238, 230]; // Hub Cyan
  if (node.category === 'critical_asset') return [168, 85, 247, 230]; // Critical Asset Violet
  return [56, 189, 248, 220]; // Substation Sky
}

function getNodeRadius(node: GridSiteNode): number {
  switch (node.category) {
    case 'regional_hub':
      return 16500;
    case 'energy_source':
      return 13500;
    case 'substation':
      return 11500;
    case 'critical_asset':
      return 9500;
  }
}

export function SaudiGridMap({
  nodes,
  edges,
  viewport,
  selectedNodeId,
  blastRadius,
  showArcs,
  onSelectNode,
}: SaudiGridMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{
    node: GridSiteNode;
    x: number;
    y: number;
  } | null>(null);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const impactedNodeSet = useMemo(
    () => new Set(blastRadius?.impactedNodeIds ?? []),
    [blastRadius]
  );
  const impactedEdgeSet = useMemo(
    () => new Set(blastRadius?.impactedEdgeIds ?? []),
    [blastRadius]
  );

  // Initialize MapLibre GL JS + Deck.gl MapboxOverlay once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_MATTER_STYLE,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      pitch: viewport.pitch,
      bearing: viewport.bearing,
      antialias: true,
      maxPitch: 60,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });

    map.addControl(overlay as unknown as maplibregl.IControl);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth flyTo when user switches KSA region viewport
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      pitch: viewport.pitch,
      bearing: viewport.bearing,
      duration: 1100,
      essential: true,
    });
  }, [viewport]);

  // Update Deck.gl layers whenever telemetry, selection, or blast radius changes
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    type ArcDatum = EnergyFlowEdge & {
      sourcePosition: [number, number];
      targetPosition: [number, number];
    };

    const arcData: ArcDatum[] = showArcs
      ? edges
          .map((edge) => {
            const source = nodeMap.get(edge.sourceId);
            const target = nodeMap.get(edge.targetId);
            if (!source || !target) return null;
            return {
              ...edge,
              sourcePosition: source.coordinates,
              targetPosition: target.coordinates,
            };
          })
          .filter((d): d is ArcDatum => d !== null)
      : [];

    const arcLayer = new ArcLayer<ArcDatum>({
      id: 'energy-flow-arcs',
      data: arcData,
      pickable: false,
      getSourcePosition: (d) => d.sourcePosition,
      getTargetPosition: (d) => d.targetPosition,
      getSourceColor: (d): [number, number, number, number] => {
        if (impactedEdgeSet.has(d.id)) return [239, 68, 68, 255];
        if (d.status === 'critical') return [239, 68, 68, 190];
        if (d.renewableMixPct >= 80) return [16, 185, 129, 200];
        return [34, 211, 238, 165];
      },
      getTargetColor: (d): [number, number, number, number] => {
        if (impactedEdgeSet.has(d.id)) return [245, 158, 11, 255];
        if (d.status === 'critical') return [245, 158, 11, 200];
        if (d.status === 'warning') return [245, 158, 11, 180];
        return [56, 189, 248, 150];
      },
      getWidth: (d) => {
        if (impactedEdgeSet.has(d.id)) return 5.5;
        return Math.max(1.8, Math.min(4.8, d.allocatedMw / 180));
      },
      getHeight: 0.28,
      greatCircle: false,
      updateTriggers: {
        getSourceColor: [blastRadius?.originNodeId, edges],
        getTargetColor: [blastRadius?.originNodeId, edges],
        getWidth: [blastRadius?.originNodeId, edges],
      },
    });

    // Outer ambient halo / status ring
    const haloLayer = new ScatterplotLayer<GridSiteNode>({
      id: 'site-status-halos',
      data: nodes,
      pickable: false,
      stroked: true,
      filled: true,
      radiusUnits: 'meters',
      radiusMinPixels: 11,
      radiusMaxPixels: 34,
      getPosition: (d) => d.coordinates,
      getRadius: (d) => {
        const base = getNodeRadius(d);
        if (impactedNodeSet.has(d.id) || d.id === selectedNodeId) return base * 2.1;
        if (d.status !== 'nominal') return base * 1.9;
        return base * 1.45;
      },
      getFillColor: (d) => {
        if (impactedNodeSet.has(d.id)) return [239, 68, 68, 65];
        if (d.id === selectedNodeId) return [34, 211, 238, 65];
        if (d.status === 'critical') return [239, 68, 68, 70];
        if (d.status === 'warning') return [245, 158, 11, 60];
        return [16, 185, 129, 32];
      },
      getLineColor: (d) => {
        if (impactedNodeSet.has(d.id)) return [239, 68, 68, 220];
        if (d.id === selectedNodeId) return [34, 211, 238, 230];
        if (d.status === 'critical') return [239, 68, 68, 185];
        if (d.status === 'warning') return [245, 158, 11, 175];
        return [148, 163, 184, 55];
      },
      lineWidthMinPixels: 1.5,
      updateTriggers: {
        getRadius: [selectedNodeId, blastRadius?.originNodeId, nodes],
        getFillColor: [selectedNodeId, blastRadius?.originNodeId, nodes],
        getLineColor: [selectedNodeId, blastRadius?.originNodeId, nodes],
      },
    });

    // Interactive core site markers
    const siteLayer = new ScatterplotLayer<GridSiteNode>({
      id: 'site-core-markers',
      data: nodes,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: 'meters',
      radiusMinPixels: 6,
      radiusMaxPixels: 18,
      getPosition: (d) => d.coordinates,
      getRadius: (d) => getNodeRadius(d),
      getFillColor: (d) =>
        getNodeFillColor(d, d.id === selectedNodeId, impactedNodeSet.has(d.id)),
      getLineColor: [248, 250, 252, 220],
      lineWidthMinPixels: 1.5,
      onClick: (info: PickingInfo<GridSiteNode>) => {
        if (info.object) {
          onSelectNode(info.object);
        }
      },
      onHover: (info: PickingInfo<GridSiteNode>) => {
        if (info.object && info.x !== undefined && info.y !== undefined) {
          setHoveredInfo({ node: info.object, x: info.x, y: info.y });
        } else {
          setHoveredInfo(null);
        }
      },
      updateTriggers: {
        getFillColor: [selectedNodeId, blastRadius?.originNodeId, nodes],
      },
    });

    // Executive labels for the 5 primary Saudi regional hubs
    const hubLabels = new TextLayer<GridSiteNode>({
      id: 'regional-hub-labels',
      data: nodes.filter((n) => n.category === 'regional_hub'),
      pickable: false,
      getPosition: (d) => d.coordinates,
      getText: (d) => d.regionLabel.toUpperCase(),
      getSize: 12,
      getColor: [226, 232, 240, 235],
      getPixelOffset: [0, -24],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [6, 10, 18, 230],
      background: true,
      getBackgroundColor: [6, 10, 18, 175],
      backgroundPadding: [6, 3, 6, 3],
    });

    overlay.setProps({
      layers: [arcLayer, haloLayer, siteLayer, hubLabels],
    });
  }, [
    blastRadius?.originNodeId,
    edges,
    impactedEdgeSet,
    impactedNodeSet,
    nodeMap,
    nodes,
    onSelectNode,
    selectedNodeId,
    showArcs,
  ]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Hover Telemetry Tooltip */}
      {hoveredInfo && (
        <div
          className="pointer-events-none fixed z-40 glass-panel-strong rounded-lg px-3 py-2.5 shadow-2xl border border-slate-700/80 min-w-[230px]"
          style={{
            left: Math.min(hoveredInfo.x + 16, window.innerWidth - 260),
            top: Math.max(hoveredInfo.y - 12, 72),
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
              {hoveredInfo.node.id}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                hoveredInfo.node.status === 'critical'
                  ? 'bg-red-500/20 text-red-400'
                  : hoveredInfo.node.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {hoveredInfo.node.status}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-100 leading-tight">
            {hoveredInfo.node.name}
          </p>
          <p className="text-[11px] text-slate-400 mb-2">
            {hoveredInfo.node.assetSubtype}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono border-t border-slate-700/60 pt-1.5">
            <span className="text-slate-400">Live Load</span>
            <span className="text-right text-slate-100">
              {hoveredInfo.node.liveLoadMw} / {hoveredInfo.node.capacityMw} MW
            </span>
            <span className="text-slate-400">Voltage / Freq</span>
            <span className="text-right text-slate-100">
              {hoveredInfo.node.voltageV}V · {hoveredInfo.node.frequencyHz}Hz
            </span>
            <span className="text-slate-400">Renewable Share</span>
            <span className="text-right text-emerald-400">
              {hoveredInfo.node.kapsarc.renewableSharePct}%
            </span>
            <span className="text-slate-400">KAPSARC HVAC</span>
            <span className="text-right text-amber-300">
              {hoveredInfo.node.kapsarc.summerPeakMultiplier}x Peak
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-cyan-300/80">
            Click node to inspect &amp; run Blast Radius simulation
          </p>
        </div>
      )}
    </div>
  );
}
