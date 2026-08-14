import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { LocationPickerModal } from "@/components/ui/LocationPickerModal";
import { StaticMapPreview } from "@/components/ui/StaticMapPreview";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  formatLocationSummary,
  getCurrentLocation,
  locationFromCoords,
  reverseGeocode,
  type PickedLocation,
} from "@/lib/location";
import { sanitizeShopName, shopNameError } from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";

const MAX_GALLERY_PHOTOS = 6;

export type ShopFormValues = {
  name: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  address: string;
  phone: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  logoUri: string | null;
  galleryUris: string[];
};

type ShopFormProps = {
  initial?: Partial<ShopFormValues>;
  submitLabel: string;
  onSubmit: (values: ShopFormValues) => Promise<void>;
};

export function ShopForm({ initial, submitLabel, onSubmit }: ShopFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [latitude, setLatitude] = useState<number | null>(initial?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initial?.longitude ?? null);
  const [logoUri, setLogoUri] = useState<string | null>(initial?.logoUri ?? null);
  const [galleryUris, setGalleryUris] = useState<string[]>(initial?.galleryUris ?? []);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapFocusSearch, setMapFocusSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setCity(initial?.city ?? "");
    setState(initial?.state ?? "");
    setPostalCode(initial?.postalCode ?? "");
    setCountry(initial?.country ?? "");
    setAddress(initial?.address ?? "");
    setPhone(initial?.phone ?? "");
    setDescription(initial?.description ?? "");
    setLatitude(initial?.latitude ?? null);
    setLongitude(initial?.longitude ?? null);
    setLogoUri(initial?.logoUri ?? null);
    setGalleryUris(initial?.galleryUris ?? []);
  }, [initial]);

  const pickedLocation = useMemo<PickedLocation | null>(() => {
    if (latitude == null || longitude == null) {
      return null;
    }
    return {
      latitude,
      longitude,
      address_line1: address || null,
      address_line2: null,
      city: city || null,
      state: state || null,
      country: country || null,
      postal_code: postalCode || null,
    };
  }, [latitude, longitude, address, city, state, country, postalCode]);

  const hasLocation = latitude != null && longitude != null;

  function applyLocation(loc: PickedLocation) {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setAddress(loc.address_line1 ?? "");
    setCity(loc.city ?? "");
    setState(loc.state ?? "");
    setPostalCode(loc.postal_code ?? "");
    setCountry(loc.country ?? "");
  }

  function openMap(focusSearch: boolean) {
    setMapFocusSearch(focusSearch);
    setMapOpen(true);
  }

  async function handleUseMyLocation() {
    setError(null);
    setPickingLocation(true);
    try {
      const location = await getCurrentLocation();
      const { latitude: lat, longitude: lng } = location.coords;
      const [geocode] = await reverseGeocode(lat, lng);
      applyLocation(locationFromCoords(lat, lng, geocode));
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setPickingLocation(false);
    }
  }

  async function pickPhoto(options: {
    square: boolean;
    multiple?: boolean;
  }): Promise<string[]> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is required to add photos.");
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: options.square,
      aspect: options.square ? [1, 1] : undefined,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: options.multiple ?? false,
      selectionLimit: options.multiple ? MAX_GALLERY_PHOTOS : 1,
    });
    if (result.canceled) {
      return [];
    }
    const uris = result.assets
      .filter((asset) => !!asset.base64)
      .map(
        (asset) => `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
      );
    if (uris.length === 0 && result.assets.length > 0) {
      setError("Could not read the selected photo. Please try again.");
    }
    return uris;
  }

  async function handleChooseLogo() {
    setError(null);
    const [uri] = await pickPhoto({ square: true });
    if (uri) {
      setLogoUri(uri);
    }
  }

  async function handleAddGalleryPhoto() {
    setError(null);
    const uris = await pickPhoto({ square: false, multiple: true });
    if (uris.length > 0) {
      setGalleryUris((current) => {
        const remaining = MAX_GALLERY_PHOTOS - current.length;
        return remaining > 0 ? [...current, ...uris.slice(0, remaining)] : current;
      });
    }
  }

  async function handleSubmit() {
    setError(null);
    const nameError = shopNameError(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        city,
        state,
        postalCode,
        country,
        address,
        phone,
        description,
        latitude,
        longitude,
        logoUri,
        galleryUris,
      });
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.form}>
        <TextField
          label="Shop name"
          value={name}
          onChangeText={(text) => setName(sanitizeShopName(text))}
          placeholder="e.g. The Fade Room"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Location</Text>
        {hasLocation && pickedLocation ? (
          <View style={styles.locationCard}>
            <StaticMapPreview
              latitude={pickedLocation.latitude}
              longitude={pickedLocation.longitude}
              onPress={() => openMap(false)}
            />
            <View style={styles.locationSummaryRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.locationSummary} numberOfLines={1}>
                {formatLocationSummary(pickedLocation)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => openMap(false)}
            accessibilityRole="button"
            accessibilityLabel="Set your shop location"
            style={({ pressed }) => [
              styles.locationEmpty,
              pressed && styles.locationEmptyPressed,
            ]}
          >
            <Text style={styles.locationEmptyTitle}>Set your shop location</Text>
            <Text style={styles.locationEmptySubtitle}>
              Search for your address, drop a pin on the map, or use your
              current location.
            </Text>
            <View style={styles.locationActions}>
              <Button
                title="Use my location"
                variant="outline"
                loading={pickingLocation}
                onPress={() => void handleUseMyLocation()}
                style={styles.locationActionButton}
              />
              <Button
                title="Enter a location"
                variant="outline"
                onPress={() => openMap(true)}
                style={styles.locationActionButton}
              />
            </View>
          </Pressable>
        )}
        <Text style={styles.hint}>
          {hasLocation
            ? "Your address below was filled in automatically. Edit it if needed."
            : "Set a location and we'll fill in your address automatically."}
        </Text>

        <TextField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Street address (optional)"
          autoCapitalize="words"
        />
        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <TextField
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Austin"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.rowField}>
            <TextField
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="e.g. TX"
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <TextField
              label="Postal code"
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="Optional"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowField}>
            <TextField
              label="Country"
              value={country}
              onChangeText={setCountry}
              placeholder="Optional"
              autoCapitalize="words"
            />
          </View>
        </View>
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Optional"
          keyboardType="phone-pad"
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What makes your shop special?"
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Shop photo</Text>
        <View style={styles.logoRow}>
          <Pressable
            onPress={() => void handleChooseLogo()}
            accessibilityRole="imagebutton"
            accessibilityLabel="Add shop photo"
            style={styles.logoPicker}
          >
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logoPreview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera-outline" size={28} color={colors.muted} />
                <Text style={styles.logoPlaceholderText}>Add photo</Text>
              </View>
            )}
          </Pressable>
          {!!logoUri && (
            <Pressable
              onPress={() => setLogoUri(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove shop photo"
              style={styles.logoRemove}
            >
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
        <Text style={styles.hint}>
          Your shop photo shows on the shop card and page.
        </Text>

        <Text style={styles.label}>Photos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.galleryScroll}
          contentContainerStyle={styles.galleryRow}
        >
          {galleryUris.map((uri, index) => (
            <View key={uri} style={styles.galleryTile}>
              <Image
                source={{ uri }}
                style={styles.galleryImage}
                contentFit="cover"
              />
              <Pressable
                onPress={() =>
                  setGalleryUris((current) =>
                    current.filter((_, i) => i !== index)
                  )
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={styles.galleryRemove}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {galleryUris.length < MAX_GALLERY_PHOTOS && (
            <Pressable
              onPress={() => void handleAddGalleryPhoto()}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              style={styles.galleryAdd}
            >
              <Ionicons name="add" size={26} color={colors.muted} />
            </Pressable>
          )}
        </ScrollView>
        <Text style={styles.hint}>
          Show off your shop interior — you can select several at once. The
          first photo becomes the cover.
        </Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title={submitLabel}
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={submitting}
        />
      </View>

      <LocationPickerModal
        visible={mapOpen}
        initialLocation={pickedLocation}
        focusSearch={mapFocusSearch}
        onClose={() => setMapOpen(false)}
        onConfirm={(location) => {
          applyLocation(location);
          setMapOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: -spacing.sm,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  locationSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationSummary: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  locationEmpty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationEmptyPressed: {
    opacity: 0.85,
  },
  locationEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  locationEmptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  locationActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignSelf: "stretch",
    marginHorizontal: -14,
    marginTop: spacing.sm,
  },
  locationActionButton: {
    flex: 1,
    paddingHorizontal: 14,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -spacing.xs,
  },
  logoRow: {
    position: "relative",
    alignSelf: "flex-start",
  },
  logoPicker: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  logoPreview: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  logoPlaceholderText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  logoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryScroll: {
    flexGrow: 0,
  },
  galleryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  galleryTile: {
    position: "relative",
  },
  galleryImage: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
  },
  galleryRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryAdd: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowFields: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
