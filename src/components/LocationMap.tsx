import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
  reference: string;
}

const LocationMap = ({ latitude, longitude, name, reference }: LocationMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapElementRef.current, {
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstanceRef.current);
    }

    const position: L.LatLngExpression = [latitude, longitude];
    mapInstanceRef.current.setView(position, 15);

    if (!markerRef.current) {
      markerRef.current = L.marker(position).addTo(mapInstanceRef.current);
    } else {
      markerRef.current.setLatLng(position);
    }

    const popupContent = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = name || "Reference";
    popupContent.appendChild(title);
    popupContent.appendChild(document.createElement("br"));
    popupContent.appendChild(document.createTextNode(`Ref: ${reference}`));
    markerRef.current.bindPopup(popupContent);

    requestAnimationFrame(() => {
      mapInstanceRef.current?.invalidateSize();
    });
  }, [latitude, longitude, name, reference]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      mapInstanceRef.current?.remove();
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
        No location data available for this reference.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Location</h3>
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 350 }}>
        <div ref={mapElementRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default LocationMap;
