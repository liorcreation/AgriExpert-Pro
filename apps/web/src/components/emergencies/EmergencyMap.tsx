import { useEffect } from 'react';
import L, { type LatLngExpression } from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Crosshair, MapPin, Navigation, Radio } from 'lucide-react';

export type MapPoint = { lat: number; lng: number };

type EmergencyMapProps = {
  userLocation: MapPoint | null;
  onLocate: () => void;
  locating: boolean;
};

const defaultCenter: LatLngExpression = [12.3714, -1.5197];
const experts = [
  { id: 'expert-1', name: 'Dr. Adama Traoré', specialty: 'Vétérinaire · Élevage', position: [12.386, -1.527] as LatLngExpression, distance: '2,4 km' },
  { id: 'expert-2', name: 'Ing. Awa Kaboré', specialty: 'Agronomie · Cultures', position: [12.352, -1.496] as LatLngExpression, distance: '4,8 km' },
  { id: 'expert-3', name: 'Lab. FasoBio', specialty: 'Laboratoire phytosanitaire', position: [12.402, -1.482] as LatLngExpression, distance: '7,1 km' },
];

const userIcon = L.divIcon({ className: 'ag-map-user-marker', html: '<span></span>', iconSize: [36, 36], iconAnchor: [18, 18] });
const expertIcon = L.divIcon({ className: 'ag-map-expert-marker', html: '<span>+</span>', iconSize: [32, 32], iconAnchor: [16, 16] });

export function EmergencyMap({ userLocation, onLocate, locating }: EmergencyMapProps) {
  const center = userLocation ? ([userLocation.lat, userLocation.lng] as LatLngExpression) : defaultCenter;

  return (
    <div className="relative overflow-hidden rounded-card border border-cream-300 bg-obsidian-800 shadow-soft dark:border-obsidian-700">
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[390px] w-full sm:h-[470px]">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewport location={userLocation} />
        {userLocation && <><Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>Votre position signalée</Popup></Marker><Circle center={[userLocation.lat, userLocation.lng]} radius={2500} pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.08, weight: 1 }} /></>}
        {experts.map((expert) => <Marker key={expert.id} position={expert.position} icon={expertIcon}><Popup><strong>{expert.name}</strong><br />{expert.specialty}<br />Disponible · {expert.distance}</Popup></Marker>)}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-full border border-white/20 bg-obsidian-950/80 px-3 py-2 text-xs font-semibold text-white shadow-soft backdrop-blur-sm"><Radio className="h-3.5 w-3.5 text-territory-300" /> Réseau d’experts en direct</div>
      <button type="button" onClick={onLocate} disabled={locating} className="ag-button-secondary absolute bottom-4 right-4 z-[1000] min-h-11 border-white/20 bg-obsidian-950/85 text-white hover:bg-obsidian-950 disabled:opacity-80" aria-label="Utiliser ma position actuelle"><Crosshair className={['h-4 w-4', locating ? 'animate-spin' : ''].join(' ')} />{locating ? 'Localisation…' : 'Ma position'}</button>
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex flex-col gap-2 rounded-control border border-white/15 bg-obsidian-950/80 px-3 py-2 text-[11px] text-white backdrop-blur-sm"><span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-territory-300" /> Votre signalement</span><span className="flex items-center gap-2"><Navigation className="h-3.5 w-3.5 text-gold-300" /> Expert disponible</span></div>
    </div>
  );
}

function MapViewport({ location }: { location: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], 13, { duration: 1.1 });
  }, [location, map]);
  return null;
}
