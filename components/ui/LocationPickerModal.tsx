import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  formatLocationSummary,
  geocodeSearch,
  getCurrentLocation,
  locationFromCoords,
  reverseGeocode,
  type PickedLocation,
} from "@/lib/location";
import { buildMapHtml } from "@/lib/map-html";
import { colors, radius, spacing } from "@/lib/theme";

const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.006;

type LocationPickerModalProps = {
  visible: boolean;
  initialLocation?: PickedLocation | null;
  focusSearch?: boolean;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
};

export function LocationPickerModal({
  visible,
  initialLocation,
  focusSearch = false,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTop = insets.top + spacing.sm + 48;
  const [mapHtml, setMapHtml] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [preview, setPreview] = useState<PickedLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setError(null);
    setPreview(null);
    setCoords(null);
    setQuery("");
    setResolving(true);
    let cancelled = false;
    async function init() {
      let latitude = initialLocation?.latitude ?? DEFAULT_LAT;
      let longitude = initialLocation?.longitude ?? DEFAULT_LNG;
      if (!initialLocation) {
        const last = await Location.getLastKnownPositionAsync({
          requiredAccuracy: 3000,
        });
        if (last && !cancelled) {
          latitude = last.coords.latitude;
          longitude = last.coords.longitude;
        }
      }
      if (cancelled) {
        return;
      }
      setCoords({ latitude, longitude });
      setMapHtml(buildMapHtml({ latitude, longitude, zoom: 14, interactive: true }));
      const [geocode] = await reverseGeocode(latitude, longitude);
      if (!cancelled) {
        setPreview(locationFromCoords(latitude, longitude, geocode));
      }
      setResolving(false);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [visible, initialLocation]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (focusSearch) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [visible, focusSearch]);

  useEffect(() => {
    return () => {
      if (geocodeTimer.current) {
        clearTimeout(geocodeTimer.current);
      }
    };
  }, []);

  function moveMap(latitude: number, longitude: number) {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "setView", lat: latitude, lng: longitude })
    );
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        lat: number;
        lng: number;
      };
      if (data.type !== "move" || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
        return;
      }
      const { lat, lng } = data;
      setCoords({ latitude: lat, longitude: lng });
      if (geocodeTimer.current) {
        clearTimeout(geocodeTimer.current);
      }
      setResolving(true);
      geocodeTimer.current = setTimeout(async () => {
        try {
          const [geocode] = await reverseGeocode(lat, lng);
          setPreview(locationFromCoords(lat, lng, geocode));
        } catch {
          // keep the last known preview
        } finally {
          setResolving(false);
        }
      }, 400);
    } catch {
      // ignore malformed messages
    }
  }

  async function handleLocateMe() {
    setLocating(true);
    setError(null);
    try {
      const location = await getCurrentLocation();
      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });
      moveMap(latitude, longitude);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setLocating(false);
    }
  }

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    try {
      const location = await geocodeSearch(trimmed);
      if (location) {
        setCoords({ latitude: location.latitude, longitude: location.longitude });
        setPreview(location);
        moveMap(location.latitude, location.longitude);
        Keyboard.dismiss();
      } else {
        setError(
          `Couldn't find "${trimmed}". Try a full address, a Plus Code, or a Google Maps link.`
        );
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    }
  }

  async function handleConfirm() {
    if (!coords) {
      return;
    }
    setResolving(true);
    setError(null);
    try {
      const [geocode] = await reverseGeocode(coords.latitude, coords.longitude);
      onConfirm(locationFromCoords(coords.latitude, coords.longitude, geocode));
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setResolving(false);
    }
  }

  const summary = preview ? formatLocationSummary(preview) : "Drag the map to set your location";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {mapHtml ? (
          <WebView
            ref={webViewRef}
            style={StyleSheet.absoluteFill}
            source={{ html: mapHtml }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            originWhitelist={["*"]}
          />
        ) : (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.pin}>
            <Image
              source={require("@/assets/images/location.png")}
              style={styles.pinImage}
              contentFit="contain"
              tintColor={colors.primaryDark}
            />
          </View>
        </View>

        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backRow, { top: insets.top + spacing.md }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={[styles.searchContainer, { top: searchTop }]}>
          <TextInput
            ref={searchInputRef}
            style={styles.search}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Search address or paste a Maps link"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearButton}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <View style={[styles.zoomControls, { bottom: 160 + insets.bottom }]}>
          <Pressable
            onPress={() =>
              webViewRef.current?.postMessage(JSON.stringify({ type: "zoomIn" }))
            }
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            style={({ pressed }) => [
              styles.zoomButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() =>
              webViewRef.current?.postMessage(JSON.stringify({ type: "zoomOut" }))
            }
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            style={({ pressed }) => [
              styles.zoomButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.bottomCard,
            { paddingBottom: spacing.md + insets.bottom },
          ]}
        >
          <Text style={styles.previewTitle} numberOfLines={2}>
            {resolving ? "Looking up address…" : summary}
          </Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.actions}>
            <Button
              title="Use my location"
              variant="outline"
              loading={locating}
              onPress={() => void handleLocateMe()}
              style={styles.actionButton}
            />
            <Button
              title="Confirm location"
              loading={resolving}
              disabled={!coords || resolving}
              onPress={() => void handleConfirm()}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -23,
    marginTop: -38,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pinImage: {
    width: 46,
    height: 46,
  },
  backRow: {
    position: "absolute",
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  searchContainer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  clearButton: {
    position: "absolute",
    right: spacing.xs,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomControls: {
    position: "absolute",
    right: spacing.md,
    gap: spacing.sm,
  },
  zoomButton: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
