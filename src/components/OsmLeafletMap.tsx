import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Marker = Coordinate & {
  label?: string;
};

type SafeZone = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
};

type Props = {
  center: Coordinate;
  zoom?: number;
  marker?: Coordinate | null;
  markers?: Marker[];
  safeZones?: SafeZone[];
  /** When set, the map will fly/pan to these coordinates without re-rendering */
  focusCenter?: Coordinate | null;
  onPress?: (point: Coordinate) => void;
};

const FALLBACK_CENTER: Coordinate = { latitude: 30.0444, longitude: 31.2357 };

function isValidCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== 'object') return false;
  const coordinate = value as Coordinate;
  return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude);
}

function buildHtml({
  center,
  zoom = 13,
  marker,
  markers = [],
  safeZones = [],
}: Omit<Props, 'onPress'>) {
  const safeCenter = isValidCoordinate(center) ? center : FALLBACK_CENTER;
  const safeMarker = isValidCoordinate(marker) ? marker : null;
  const safeMarkers = Array.isArray(markers) ? markers.filter(isValidCoordinate) : [];
  const safeZonesForMap = Array.isArray(safeZones)
    ? safeZones
      .filter(
        (zone) =>
          Number.isFinite(zone.latitude) &&
          Number.isFinite(zone.longitude) &&
          Number.isFinite(zone.radius),
      )
      .map((zone) => ({
        ...zone,
        radius: Number(zone.radius) || 100,
      }))
    : [];

  const safeZonesJson = JSON.stringify(safeZonesForMap);
  const markerJson = safeMarker ? JSON.stringify(safeMarker) : 'null';
  const markersJson = JSON.stringify(safeMarkers);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .zone-label { font-size: 12px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""></script>
    <script>
      const map = L.map('map', { zoomControl: true }).setView([${safeCenter.latitude}, ${safeCenter.longitude}], ${zoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const zones = ${safeZonesJson};
      zones.forEach((zone) => {
        const circle = L.circle([zone.latitude, zone.longitude], {
          color: '#1D4ED8',
          fillColor: '#3B82F6',
          fillOpacity: 0.2,
          radius: Number(zone.radius) || 100
        }).addTo(map);

        const label = (zone.name || 'Safe Zone').toString();
        circle.bindTooltip(label, { permanent: false, direction: 'top', className: 'zone-label' });
      });

      const markerData = ${markerJson};
      const markerList = ${markersJson};
      if (markerData) {
        markerList.unshift(markerData);
      }
      markerList.forEach((m) => {
        if (!m) return;
        const marker_ = L.marker([m.latitude, m.longitude]).addTo(map);
        if (m.label) {
          marker_.bindTooltip(m.label, { permanent: false, direction: 'top' });
        }
      });

      map.on('click', function(e) {
        const payload = {
          type: 'mapPress',
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        };
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      });
    </script>
  </body>
</html>`;
}

export function OsmLeafletMap({ center, zoom, marker, markers, safeZones, focusCenter, onPress }: Props) {
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(
    () =>
      buildHtml({
        center,
        zoom,
        marker,
        markers,
        safeZones,
      }),
    [center, marker, markers, safeZones, zoom]
  );

  // When focusCenter changes, fly to that location without re-rendering the HTML
  useEffect(() => {
    if (
      focusCenter &&
      Number.isFinite(focusCenter.latitude) &&
      Number.isFinite(focusCenter.longitude) &&
      webViewRef.current
    ) {
      const js = `if(typeof map !== 'undefined') { map.flyTo([${focusCenter.latitude}, ${focusCenter.longitude}], 15, { duration: 1.2 }); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [focusCenter]);

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          if (!onPress) return;
          try {
            const parsed = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              latitude?: unknown;
              longitude?: unknown;
            };
            if (parsed?.type !== 'mapPress') return;
            const latitude = Number(parsed.latitude);
            const longitude = Number(parsed.longitude);
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              onPress({ latitude, longitude });
            }
          } catch {
            // Ignore malformed messages from web content.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#E5E7EB' },
});
