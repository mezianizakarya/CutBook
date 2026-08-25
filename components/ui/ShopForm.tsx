import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
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
import { t } from "@/lib/i18n";
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
          setError(t("shop.photo_library_required"));
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
      setError(t("shop.could_not_read_photo"));
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
          label={t("shop.shop_name")}
          value={name}
          onChangeText={(text) => setName(sanitizeShopName(text))}
          placeholder={t("shop.e_g_fade_room")}
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t("shop.location")}</Text>
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
              <RTLIcon name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => openMap(false)}
            accessibilityRole="button"
            accessibilityLabel={t("shop.set_location")}
            style={({ pressed }) => [
              styles.locationEmpty,
              pressed && styles.locationEmptyPressed,
            ]}
          >
            <Text style={styles.locationEmptyTitle}>{t("shop.set_location")}</Text>
            <Text style={styles.locationEmptySubtitle}>
              {t("shop.search_address")}
            </Text>
            <View style={styles.locationActions}>
              <Button
                title={t("shop.use_my_location")}
                variant="outline"
                loading={pickingLocation}
                onPress={() => void handleUseMyLocation()}
                style={styles.locationActionButton}
              />
              <Button
                title={t("shop.enter_location")}
                variant="outline"
                onPress={() => openMap(true)}
                style={styles.locationActionButton}
              />
            </View>
          </Pressable>
        )}
        <Text style={styles.hint}>
          {hasLocation
            ? t("shop.address_filled_automatically")
            : t("shop.set_location_fill")}
        </Text>

        <TextField
          label={t("shop.address")}
          value={address}
          onChangeText={setAddress}
          placeholder={t("shop.street_address_optional")}
          autoCapitalize="words"
        />
        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <TextField
              label={t("shop.city")}
              value={city}
              onChangeText={setCity}
              placeholder={t("shop.e_g_austin")}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.rowField}>
            <TextField
              label={t("shop.state")}
              value={state}
              onChangeText={setState}
              placeholder={t("shop.e_g_tx")}
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <TextField
              label={t("shop.postal_code")}
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder={t("common.optional")}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowField}>
            <TextField
              label={t("shop.country")}
              value={country}
              onChangeText={setCountry}
              placeholder={t("common.optional")}
              autoCapitalize="words"
            />
          </View>
        </View>
        <TextField
          label={t("shop.phone")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("common.optional")}
          keyboardType="phone-pad"
        />
        <TextField
          label={t("shop.description")}
          value={description}
          onChangeText={setDescription}
          placeholder={t("shop.what_makes_special")}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>{t("shop.photos")}</Text>
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
                <Text style={styles.logoPlaceholderText}>{t("shop.add_photo")}</Text>
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
          {t("shop.shop_photo_shows")}
        </Text>

        <Text style={styles.label}>{t("shop.photos")}</Text>
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
          {t("shop.show_off_interior")}
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
    end: -6,
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
    end: 4,
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
