import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';

// Same pin the original Mapbox map used (styled by .marker in style.css)
const pin = L.divIcon({
  className: 'marker',
  iconSize: [32, 40],
  iconAnchor: [16, 40]
});

const toLatLng = loc => [loc.coordinates[1], loc.coordinates[0]];
const labelOf = loc => `Day ${loc.day}: ${loc.description}`;
const keyOf = loc => loc._id || loc.coordinates.join();

const PIN_W = 32;
const PIN_H = 40;
const LABEL_H = 42;
const labelWidth = text => text.length * 7.6 + 32;

// Where each label sits relative to its pin, plus the Leaflet tooltip offset for it
const PLACEMENTS = {
  top: { offset: [0, -PIN_H] },
  bottom: { offset: [0, 6] },
  right: { offset: [PIN_W / 2 + 4, -PIN_H / 2] },
  left: { offset: [-PIN_W / 2 - 4, -PIN_H / 2] }
};

// Screen rectangle ({x1,y1,x2,y2}) of a label for a pin tip at point p
function labelRect(p, w, dir) {
  switch (dir) {
    case 'bottom':
      return { x1: p.x - w / 2, y1: p.y + 6, x2: p.x + w / 2, y2: p.y + 6 + LABEL_H };
    case 'right':
      return { x1: p.x + PIN_W / 2 + 4, y1: p.y - PIN_H / 2 - LABEL_H / 2, x2: p.x + PIN_W / 2 + 4 + w, y2: p.y - PIN_H / 2 + LABEL_H / 2 };
    case 'left':
      return { x1: p.x - PIN_W / 2 - 4 - w, y1: p.y - PIN_H / 2 - LABEL_H / 2, x2: p.x - PIN_W / 2 - 4, y2: p.y - PIN_H / 2 + LABEL_H / 2 };
    default: // top
      return { x1: p.x - w / 2, y1: p.y - PIN_H - 6 - LABEL_H, x2: p.x + w / 2, y2: p.y - PIN_H - 6 };
  }
}

const overlaps = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

// Greedy label placement: for every stop pick the first of top/bottom/right/left whose label
// does not hit another label or any pin. Recomputed whenever the map moves or zooms.
function Markers({ locations }) {
  const map = useMap();
  const [dirs, setDirs] = useState({});

  useEffect(() => {
    const compute = () => {
      const pts = locations.map(loc => map.latLngToContainerPoint(toLatLng(loc)));
      const pinRects = pts.map(p => ({ x1: p.x - PIN_W / 2, y1: p.y - PIN_H, x2: p.x + PIN_W / 2, y2: p.y }));
      const placed = [];
      const next = {};
      locations.forEach((loc, i) => {
        const w = labelWidth(labelOf(loc));
        let chosen = 'top';
        for (const dir of Object.keys(PLACEMENTS)) {
          const r = labelRect(pts[i], w, dir);
          const clash =
            placed.some(o => overlaps(r, o)) ||
            pinRects.some((pr, j) => j !== i && overlaps(r, pr));
          if (!clash) {
            chosen = dir;
            break;
          }
        }
        placed.push(labelRect(pts[i], w, chosen));
        next[keyOf(loc)] = chosen;
      });
      setDirs(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    compute();
    map.on('moveend zoomend resize', compute);
    return () => map.off('moveend zoomend resize', compute);
  }, [map, locations]);

  return locations.map(loc => {
    const dir = dirs[keyOf(loc)] || 'top';
    return (
      // key includes the direction so Leaflet re-creates the tooltip when it moves
      <Marker key={`${keyOf(loc)}-${dir}`} position={toLatLng(loc)} icon={pin}>
        <Tooltip
          permanent
          direction={dir}
          offset={PLACEMENTS[dir].offset}
          className="tour-tooltip"
        >
          {labelOf(loc)}
        </Tooltip>
      </Marker>
    );
  });
}

function FitBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (!locations.length) return;
    map.fitBounds(L.latLngBounds(locations.map(toLatLng)), {
      paddingTopLeft: [100, 200],
      paddingBottomRight: [100, 150]
    });
  }, [map, locations]);
  return null;
}

// OpenStreetMap + Leaflet: no API token needed (replaces Mapbox).
export default function TourMap({ locations }) {
  return (
    <div id="map">
      <MapContainer
        center={locations.length ? toLatLng(locations[0]) : [22.5, 79]}
        zoom={5}
        scrollWheelZoom={false}
      >
        <TileLayer
          referrerPolicy="strict-origin-when-cross-origin"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Markers locations={locations} />
        <FitBounds locations={locations} />
      </MapContainer>
    </div>
  );
}
