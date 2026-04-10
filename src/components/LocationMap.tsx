import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
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
  if (!latitude || !longitude) {
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
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          key={`${latitude}-${longitude}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]}>
            <Popup>
              <strong>{name}</strong>
              <br />
              Ref: {reference}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationMap;
