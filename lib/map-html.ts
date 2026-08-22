type BuildMapHtmlOptions = {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  marker?: boolean;
};

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.72 1 2 7.72 2 16c0 12 15 26 15 26s15-14 15-26C32 7.72 25.28 1 17 1z" fill="#0052AB" stroke="#ffffff" stroke-width="2.5"/><circle cx="17" cy="16" r="6" fill="#ffffff"/></svg>';

export function buildMapHtml({
  latitude,
  longitude,
  zoom = 14,
  interactive = true,
  marker = false,
}: BuildMapHtmlOptions): string {
  const markerSvgVar = marker ? `var PIN_SVG = '${PIN_SVG}';` : "";
  const markerHtml = marker
    ? `
  function addCenterMarker() {
    var existing = document.getElementById('center-pin');
    if (existing) return;
    var el = document.createElement('div');
    el.id = 'center-pin';
    el.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:20;pointer-events:none;';
    el.innerHTML = '<div style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3))">' + PIN_SVG + '</div>';
    map.appendChild(el);
  }
  addCenterMarker();`
    : "";

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
  var dragging = false, startTX, startTY, curTX = 0, curTY = 0;
  ${markerSvgVar}

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
    curTX = offX !== undefined ? offX : curTX;
    curTY = offY !== undefined ? offY : curTY;
    ${markerHtml}
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
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'move', lat: LAT, lng: LNG }));
  }

  layer.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
  layer.addEventListener('touchmove', function(e) {
    if (dragging && e.touches.length === 1) {
      e.preventDefault();
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  layer.addEventListener('touchend', function() { endDrag(); }, { passive: true });
  layer.addEventListener('touchcancel', function() { endDrag(); }, { passive: true });

  map.addEventListener('mousedown', function(e) {
    startDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function(e) {
    if (dragging) moveDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', function() { endDrag(); });

  map.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.deltaY < 0) { ZOOM = Math.min(19, ZOOM + 1); } else { ZOOM = Math.max(1, ZOOM - 1); }
    fullRender();
  }, { passive: false });

  window.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { LAT = data.lat; LNG = data.lng; fullRender(); }
      if (data.type === 'zoomIn') { ZOOM = Math.min(19, ZOOM + 1); fullRender(); }
      if (data.type === 'zoomOut') { ZOOM = Math.max(1, ZOOM - 1); fullRender(); }
    } catch (e) {}
  });
  document.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'setView') { LAT = data.lat; LNG = data.lng; fullRender(); }
      if (data.type === 'zoomIn') { ZOOM = Math.min(19, ZOOM + 1); fullRender(); }
      if (data.type === 'zoomOut') { ZOOM = Math.max(1, ZOOM - 1); fullRender(); }
    } catch (e) {}
  });

  fullRender();
</script>
</body>
</html>`;
}
