type BuildMapHtmlOptions = {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  marker?: boolean;
};

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.72 1 2 7.72 2 16c0 12 15 26 15 26s15-14 15-26C32 7.72 25.28 1 17 1z" fill="#0052AB" stroke="#ffffff" stroke-width="2.5"/><circle cx="17" cy="16" r="6" fill="#ffffff"/></svg>';

/**
 * Inline Leaflet map used by both the interactive location picker and the
 * static shop preview. CARTO Voyager tiles (free, no API key) give a modern
 * look versus stock OSM mapnik. The `{r}` placeholder resolves to `@2x` on
 * retina automatically.
 */
export function buildMapHtml({
  latitude,
  longitude,
  zoom = 14,
  interactive = true,
  marker = false,
}: BuildMapHtmlOptions): string {
  const interactionJs = interactive
    ? `
  map.on('moveend', function () {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'move', lat: c.lat, lng: c.lng }));
  });
  window.addEventListener('message', function (event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { map.setView([data.lat, data.lng], map.getZoom()); }
      if (data.type === 'zoomIn') { map.zoomIn(); }
      if (data.type === 'zoomOut') { map.zoomOut(); }
    } catch (e) {}
  });
  document.addEventListener('message', function (event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { map.setView([data.lat, data.lng], map.getZoom()); }
      if (data.type === 'zoomIn') { map.zoomIn(); }
      if (data.type === 'zoomOut') { map.zoomOut(); }
    } catch (e) {}
  });`
    : "";
  const markerJs = marker
    ? `
  L.marker([${latitude}, ${longitude}], {
    icon: L.divIcon({
      className: 'map-pin-wrap',
      html: PIN_SVG,
      iconSize: [34, 44],
      iconAnchor: [17, 42]
    })
  }).addTo(map);`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; }
  body { background: #e8eef3; }
  .leaflet-container { background: #e8eef3; font-family: -apple-system, system-ui, sans-serif; }
  .map-pin-wrap { background: transparent; border: none; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3)); }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var PIN_SVG = '${PIN_SVG}';
  var map = L.map('map', { zoomControl: false, scrollWheelZoom: ${interactive}, attributionControl: true });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
  map.setView([${latitude}, ${longitude}], ${zoom});
  ${markerJs}${interactionJs}
</script>
</body>
</html>`;
}
