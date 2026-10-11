import L, { type LatLngExpression } from 'leaflet';
import { Fragment } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { AlertTriangle, MapPinned } from 'lucide-react';

type AlertPoint = {
  id: string;
  name: string;
  region: string;
  type: string;
  count: number;
  intensity: 'high' | 'medium' | 'low';
  position: [number, number];
};

const mapCenter: LatLngExpression = [12.24, -1.56];
const intensityStyles = {
  high: { color: '#D92D20', fillColor: '#F04438', radius: 18, opacity: 0.25 },
  medium: { color: '#CA8504', fillColor: '#F79009', radius: 13, opacity: 0.2 },
  low: { color: '#0F8A63', fillColor: '#10B981', radius: 9, opacity: 0.16 },
};

export function AlertHeatmap({ points }: { points: AlertPoint[] }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-cream-300 bg-obsidian-800 shadow-soft dark:border-obsidian-700">
      <MapContainer center={mapCenter} zoom={6.4} minZoom={5.8} maxZoom={12} scrollWheelZoom className="h-[440px] w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((alert) => { const style = intensityStyles[alert.intensity]; return <Fragment key={alert.id}><Circle center={alert.position} radius={style.radius * 1000} pathOptions={{ color: style.color, fillColor: style.fillColor, fillOpacity: style.opacity, weight: 1 }} /><CircleMarker center={alert.position} radius={6} pathOptions={{ color: '#FFFEFB', weight: 2, fillColor: style.fillColor, fillOpacity: 1 }}><Popup><strong>{alert.name}</strong><br />{alert.region}<br />{alert.type}<br /><b>{alert.count} signalements actifs</b></Popup></CircleMarker></Fragment>; })}
      </MapContainer>
      {points.length === 0 && <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-obsidian-950/20 p-6"><div className="max-w-sm rounded-card border border-white/20 bg-obsidian-950/90 p-5 text-center text-white shadow-soft backdrop-blur-md"><MapPinned className="mx-auto mb-3 h-6 w-6 text-gold-300" /><strong className="block text-sm">Aucun agrégat cartographique disponible</strong><span className="mt-2 block text-xs leading-relaxed text-white/70">La carte s’affichera dès que des signalements agrégés pourront être publiés pour votre périmètre.</span></div></div>}
      <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-full border border-white/20 bg-obsidian-950/85 px-3 py-2 text-xs font-semibold text-white shadow-soft backdrop-blur-sm"><MapPinned className="h-3.5 w-3.5 text-gold-300" /> Carte nationale des alertes</div>
      <div className="absolute bottom-4 left-4 z-[1000] rounded-control border border-white/15 bg-obsidian-950/85 p-3 text-[11px] text-white shadow-soft backdrop-blur-sm"><p className="mb-2 font-bold">Intensité des signalements</p><div className="flex items-center gap-3"><LegendDot color="#F04438" label="Élevée" /><LegendDot color="#F79009" label="Moyenne" /><LegendDot color="#10B981" label="Faible" /></div></div>
      <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-control border border-white/15 bg-obsidian-950/85 px-3 py-2 text-[11px] font-semibold text-white shadow-soft backdrop-blur-sm"><AlertTriangle className="h-3.5 w-3.5 text-danger-500" /> {points.filter((alert) => alert.intensity === 'high').length} foyers prioritaires</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
