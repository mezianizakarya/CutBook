import { useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export type MapMarker = {
    id: string | number;
    latitude: number;
    longitude: number;
    title?: string;
};

type NativeMapProps = {
    latitude: number;
    longitude: number;
    zoom?: number;
    style?: ViewStyle;
    markers?: MapMarker[];
    activeMarkerId?: string | number | null;
    onMarkerPress?: (marker: MapMarker) => void;
    onMapPress?: (latitude: number, longitude: number) => void;
    onRegionChange?: (latitude: number, longitude: number) => void;
};

function buildMapHtml(
    latitude: number,
    longitude: number,
    zoom: number,
    markersJson: string,
    activeIdJson: string,
): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  #map { position: relative; background: #e8eef3; touch-action: none; }
  #tile-layer { position: absolute; left: 0; top: 0; will-change: transform; }
  .tile { position: absolute; image-rendering: pixelated; }
  .marker { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; z-index: 10; }
  .marker-dot { width: 16px; height: 16px; border-radius: 50%; background: #0052AB; border: 2.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
  .marker-dot.active { background: #000; width: 20px; height: 20px; }
  .marker-active-ring { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.12); }
  .marker-label { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); white-space: nowrap; font: 600 11px -apple-system, system-ui, sans-serif; color: #18181b; text-shadow: 1px 1px 2px #fff, -1px -1px 2px #fff, 1px -1px 2px #fff, -1px 1px 2px #fff; padding-bottom: 4px; pointer-events: none; }
</style>
</head>
<body>
<div id="map"><div id="tile-layer"></div></div>
<script>
  var ZOOM = ${zoom};
  var LAT = ${latitude};
  var LNG = ${longitude};
  var map = document.getElementById('map');
  var layer = document.getElementById('tile-layer');
  var TILE = 256;
  var markers = ${markersJson};
  var activeId = ${activeIdJson};
  var dragging = false, startTX, startTY, curTX = 0, curTY = 0;

  function toPixels(lat, lng, z) {
    var s = Math.pow(2, z);
    var x = ((lng + 180) / 360) * s * TILE;
    var r = lat * Math.PI / 180;
    var y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s * TILE;
    return { x: x, y: y };
  }

  function toLatLng(px, py, z) {
    var s = Math.pow(2, z);
    var lng = (px / (s * TILE)) * 360 - 180;
    var t = Math.PI * (1 - 2 * py / (s * TILE));
    var lat = Math.atan(Math.sinh(t)) * 180 / Math.PI;
    return { lat: lat, lng: lng };
  }

  function renderTiles(ox, oy) {
    var w = map.clientWidth, h = map.clientHeight;
    var c = toPixels(LAT, LNG, ZOOM);
    var col = Math.floor(c.x / TILE);
    var row = Math.floor(c.y / TILE);
    var offX = ox !== undefined ? ox : (w / 2) - (c.x - col * TILE);
    var offY = oy !== undefined ? oy : (h / 2) - (c.y - row * TILE);
    var cols = Math.ceil(w / TILE) + 2;
    var rows = Math.ceil(h / TILE) + 2;
    var html = '';
    for (var r = -1; r <= rows; r++) {
      for (var ci = -1; ci <= cols; ci++) {
        var tc = col + ci, tr = row + r;
        if (tr < 0 || tr >= Math.pow(2, ZOOM)) continue;
        var url = 'https://tile.openstreetmap.org/' + ZOOM + '/' + tc + '/' + tr + '.png';
        html += '<img class="tile" draggable="false" src="' + url + '" style="left:' + (offX + ci * TILE) + 'px;top:' + (offY + r * TILE) + 'px;width:' + TILE + 'px;height:' + TILE + 'px"/>';
      }
    }
    layer.innerHTML = html;
    curTX = ox !== undefined ? ox : curTX;
    curTY = oy !== undefined ? oy : curTY;
    renderMarkers(w, h, c.x, c.y);
  }

  function renderMarkers(w, h, pxX, pxY) {
    var html = '';
    markers.forEach(function(m) {
      var mPx = toPixels(m.lat, m.lng, ZOOM);
      var sx = (w / 2) + (mPx.x - pxX);
      var sy = (h / 2) + (mPx.y - pxY);
      var isActive = m.id === activeId;
      var dotClass = 'marker-dot' + (isActive ? ' active' : '');
      html += '<div class="marker" style="left:' + sx + 'px;top:' + sy + 'px;" data-id="' + m.id + '" data-lat="' + m.lat + '" data-lng="' + m.lng + '">';
      if (isActive) html += '<div class="marker-active-ring"></div>';
      html += '<div class="' + dotClass + '"></div>';
      if (m.title) html += '<div class="marker-label">' + m.title + '</div>';
      html += '</div>';
    });
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) {
      var el = tmp.firstChild;
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        var lat = parseFloat(this.getAttribute('data-lat'));
        var lng = parseFloat(this.getAttribute('data-lng'));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: id, lat: lat, lng: lng }));
      });
      layer.appendChild(el);
    }
  }

  function fullRender() { renderTiles(); }

  function startDrag(px, py) {
    dragging = true;
    startTX = px - curTX;
    startTY = py - curTY;
  }

  function moveDrag(px, py) {
    if (!dragging) return;
    curTX = px - startTX;
    curTY = py - startTY;
    layer.style.transform = 'translate(' + curTX + 'px,' + curTY + 'px)';
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    var w = map.clientWidth, h = map.clientHeight;
    var c = toPixels(LAT, LNG, ZOOM);
    var col = Math.floor(c.x / TILE);
    var row = Math.floor(c.y / TILE);
    var centerOffX = (w / 2) - (c.x - col * TILE);
    var centerOffY = (h / 2) - (c.y - row * TILE);
    var dx = curTX - centerOffX;
    var dy = curTY - centerOffY;
    var newPx = c.x - dx;
    var newPy = c.y - dy;
    var ll = toLatLng(newPx, newPy, ZOOM);
    LAT = ll.lat;
    LNG = ll.lng;
    layer.style.transform = '';
    fullRender();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'regionChange', lat: LAT, lng: LNG }));
  }

  layer.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  layer.addEventListener('touchmove', function(e) {
    if (dragging && e.touches.length === 1) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });
  layer.addEventListener('touchend', function() { endDrag(); }, { passive: true });
  layer.addEventListener('touchcancel', function() { endDrag(); }, { passive: true });

  map.addEventListener('mousedown', function(e) { startDrag(e.clientX, e.clientY); });
  document.addEventListener('mousemove', function(e) { if (dragging) moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', function() { endDrag(); });

  map.addEventListener('click', function(e) {
    var rect = map.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var w = map.clientWidth, h = map.clientHeight;
    var c = toPixels(LAT, LNG, ZOOM);
    var clickPxX = c.x + (x - w / 2);
    var clickPxY = c.y + (y - h / 2);
    var ll = toLatLng(clickPxX, clickPxY, ZOOM);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress', lat: ll.lat, lng: ll.lng }));
  });

  window.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { LAT = data.lat; LNG = data.lng; fullRender(); }
    } catch (e) {}
  });
  document.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { LAT = data.lat; LNG = data.lng; fullRender(); }
    } catch (e) {}
  });

  fullRender();
</script>
</body>
</html>`;
}

export function NativeMap({
    latitude,
    longitude,
    zoom = 14,
    style,
    markers = [],
    activeMarkerId,
    onMarkerPress,
    onMapPress,
    onRegionChange,
}: NativeMapProps) {
    const markersJson = useMemo(
        () =>
            JSON.stringify(
                markers.map((m) => ({
                    id: m.id,
                    lat: m.latitude,
                    lng: m.longitude,
                    title: m.title ?? "",
                }))
            ),
        [markers]
    );
    const activeIdJson = useMemo(
        () => JSON.stringify(activeMarkerId ?? null),
        [activeMarkerId]
    );

    const html = useMemo(
        () => buildMapHtml(latitude, longitude, zoom, markersJson, activeIdJson),
        [latitude, longitude, zoom, markersJson, activeIdJson]
    );

    const handleMessage = useMemo(
        () => (event: WebViewMessageEvent) => {
            try {
                const data = JSON.parse(event.nativeEvent.data) as {
                    type: string;
                    id?: string | number;
                    lat?: number;
                    lng?: number;
                };
                if (data.type === "markerPress" && onMarkerPress && data.id != null) {
                    const found = markers.find((m) => m.id === data.id);
                    if (found) onMarkerPress(found);
                } else if (data.type === "mapPress" && onMapPress && data.lat != null && data.lng != null) {
                    onMapPress(data.lat, data.lng);
                } else if (data.type === "regionChange" && onRegionChange && data.lat != null && data.lng != null) {
                    onRegionChange(data.lat, data.lng);
                }
            } catch {
                // ignore
            }
        },
        [markers, onMarkerPress, onMapPress, onRegionChange]
    );

    return (
        <View style={[styles.container, style]}>
            <WebView
                style={StyleSheet.absoluteFill}
                source={{ html }}
                onMessage={handleMessage}
                javaScriptEnabled
                setSupportMultipleWindows={false}
                originWhitelist={["*"]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
