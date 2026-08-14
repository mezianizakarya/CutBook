import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LocationPickerModal } from "@/components/ui/LocationPickerModal";
import { LocationSheet } from "@/components/ui/LocationSheet";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { avatarColor } from "@/lib/avatar";
import { loadBookAgain, type BookAgainRow } from "@/lib/booking";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDistanceKm, formatRating, greetingFor } from "@/lib/format";
import {
  formatGeocodeLabel,
  formatLocationSummary,
  formatPickedLocationLabel,
  getCurrentLocation,
  reverseGeocode,
  type PickedLocation,
} from "@/lib/location";
import { fetchOwnProfile } from "@/lib/profile";
import {
  loadHomeShops,
  loadNearbyShops,
  loadShopsOpenToday,
  type NearbyShop,
  type ShopOpenToday,
} from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

type ActiveLocation = {
  latitude: number;
  longitude: number;
  label: string | null;
};

const SECTION_COUNT = 10;
const NEARBY_CARD_WIDTH = 230;
const NEARBY_IMAGE_HEIGHT = 130;

type ServiceCategory = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

const SERVICE_CATEGORIES: ServiceCategory[] = [
  { key: "haircut", label: "Haircut", icon: "cut-outline" },
  { key: "beard", label: "Beard", icon: "man-outline" },
  { key: "fade", label: "Fade", icon: "flash-outline" },
  { key: "styling", label: "Styling", icon: "sparkles-outline" },
  { key: "kids", label: "Kids", icon: "happy-outline" },
  { key: "more", label: "More", icon: "grid-outline" },
];

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const firstName = user?.firstName;

  const [nearby, setNearby] = useState<NearbyShop[] | null>(null);
  const [openToday, setOpenToday] = useState<ShopOpenToday[] | null>(null);
  const [bookAgain, setBookAgain] = useState<BookAgainRow[] | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<ActiveLocation | null>(null);
  const [manualLocation, setManualLocation] = useState<ActiveLocation | null>(null);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pickerOpenTimer.current) {
        clearTimeout(pickerOpenTimer.current);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const target = manualLocation;
    let coords: { latitude: number; longitude: number } | null = null;
    let label: string | null = null;
    if (target) {
      coords = { latitude: target.latitude, longitude: target.longitude };
      label = target.label;
    } else {
      try {
        const location = await getCurrentLocation();
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        let detected: string | null = null;
        try {
          const [geocode] = await reverseGeocode(coords.latitude, coords.longitude);
          detected = formatGeocodeLabel(geocode ?? null) || null;
        } catch {
          detected = null;
        }
        label =
          detected ??
          `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
        setCurrentLocation({ ...coords, label });
      } catch {
        coords = null;
        label = null;
        setCurrentLocation(null);
      }
    }
    try {
      const [shopRows, openTodayRows, history, profile] = await Promise.all([
        coords
          ? loadNearbyShops(coords.latitude, coords.longitude)
          : loadHomeShops({ order: "top", start: 0, count: SECTION_COUNT }),
        loadShopsOpenToday(),
        user?.id ? loadBookAgain(user.id) : Promise.resolve([]),
        user?.id ? fetchOwnProfile(user.id) : Promise.resolve(null),
      ]);
      setNearby(shopRows);
      setOpenToday(openTodayRows);
      setBookAgain(history);
      setLocationLabel(label ?? profile?.city ?? null);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
      setNearby((previous) => previous ?? []);
      setOpenToday((previous) => previous ?? []);
      setBookAgain((previous) => previous ?? []);
    }
  }, [user?.id, manualLocation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openShop(shop: { id: number }) {
    router.push({ pathname: "/customer/shop/[id]", params: { id: shop.id } });
  }

  function handleLocationPress() {
    setLocationSheetVisible(true);
  }

  function handleSelectCurrent() {
    setLocationSheetVisible(false);
    setManualLocation(null);
  }

  function handleSelectAnother() {
    setLocationSheetVisible(false);
    if (pickerOpenTimer.current) {
      clearTimeout(pickerOpenTimer.current);
    }
    pickerOpenTimer.current = setTimeout(() => setPickerVisible(true), 300);
  }

  function handleConfirmLocation(picked: PickedLocation) {
    setPickerVisible(false);
    setManualLocation({
      latitude: picked.latitude,
      longitude: picked.longitude,
      label: formatPickedLocationLabel(picked) || formatLocationSummary(picked),
    });
  }

  const greeting = `${greetingFor(new Date())}${firstName ? `, ${firstName}` : ""} 👋`;

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Pressable
            onPress={handleLocationPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.locationText,
                !locationLabel && styles.locationPlaceholder,
              ]}
              numberOfLines={1}
            >
              {locationLabel ?? "Set your location"}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.muted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push("/customer/profile")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Avatar
            fullName={user?.fullName}
            imageUrl={user?.hasImage ? user?.imageUrl : null}
            size={40}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/customer/discover")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}
      >
        <Ionicons name="search" size={18} color={colors.muted} />
        <Text style={styles.searchText} numberOfLines={1}>
          Search barbers, shops, or services
        </Text>
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionHeading}>Browse by service</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railScroll}
          contentContainerStyle={styles.servicesRow}
        >
          {SERVICE_CATEGORIES.map((category) => (
            <Pressable
              key={category.key}
              onPress={() => router.push("/customer/discover")}
              accessibilityRole="button"
              style={({ pressed }) => [styles.serviceItem, pressed && styles.pressed]}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={category.icon} size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.serviceLabel}>{category.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader
          title="Nearby barbers"
          actionLabel="See all"
          onAction={() => router.push("/customer/discover")}
        />
        {nearby === null ? (
          <SkeletonRail />
        ) : nearby.length === 0 ? (
          <EmptyNearby onExplore={() => router.push("/customer/discover")} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.railScroll}
            contentContainerStyle={styles.rail}
          >
            {nearby.map((shop) => (
              <NearbyCard key={shop.id} shop={shop} onPress={() => openShop(shop)} />
            ))}
          </ScrollView>
        )}

        {openToday === null ? (
          <SkeletonOpenToday />
        ) : (
          openToday.length > 0 && (
            <>
              <SectionHeader
                title="Available today"
                actionLabel="See all"
                onAction={() => router.push("/customer/discover")}
              />
              <View style={styles.openTodayList}>
                {openToday.map((shop) => (
                  <OpenTodayCard key={shop.id} shop={shop} onPress={() => openShop(shop)} />
                ))}
              </View>
            </>
          )
        )}

        {bookAgain !== null &&
          bookAgain.length > 0 && (
            <>
              <SectionHeader
                title="Book again"
                actionLabel="See all"
                onAction={() => router.push("/customer/bookings")}
              />
              <View style={styles.bookAgainList}>
                {bookAgain.map((row) => (
                  <BookAgainRowCard
                    key={row.id}
                    row={row}
                    onPress={() => {
                      if (row.shop) {
                        openShop(row.shop);
                      }
                    }}
                  />
                ))}
              </View>
            </>
          )}
      </ScrollView>

      <LocationSheet
        visible={locationSheetVisible}
        currentLabel={currentLocation?.label ?? null}
        currentSelected={manualLocation === null}
        onSelectCurrent={handleSelectCurrent}
        onSelectAnother={handleSelectAnother}
        onClose={() => setLocationSheetVisible(false)}
      />
      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handleConfirmLocation}
      />
    </Screen>
  );
}

function Skeleton({
  width,
  height,
  borderRadius = radius.md,
}: {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.skeleton, { width, height, borderRadius, opacity }]}
    />
  );
}

function SkeletonRail() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={styles.rail}
    >
      <View style={styles.skeletonCard}>
        <Skeleton width="100%" height={NEARBY_IMAGE_HEIGHT} borderRadius={0} />
        <View style={styles.skeletonCardBody}>
          <Skeleton width={140} height={14} />
          <Skeleton width={90} height={12} />
          <Skeleton width={120} height={12} />
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <Skeleton width="100%" height={NEARBY_IMAGE_HEIGHT} borderRadius={0} />
        <View style={styles.skeletonCardBody}>
          <Skeleton width={140} height={14} />
          <Skeleton width={90} height={12} />
          <Skeleton width={120} height={12} />
        </View>
      </View>
    </ScrollView>
  );
}

function SkeletonOpenToday() {
  return (
    <View style={styles.openTodayList}>
      <Skeleton width="100%" height={84} />
      <Skeleton width="100%" height={84} />
    </View>
  );
}

function EmptyNearby({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No barbers nearby</Text>
      <Text style={styles.emptySubtitle}>
        Try changing your location or exploring all barbers.
      </Text>
      <Button title="Explore all barbers" variant="outline" onPress={onExplore} style={styles.emptyButton} />
    </View>
  );
}

function NearbyCard({ shop, onPress }: { shop: NearbyShop; onPress: () => void }) {
  const categories = [
    ...new Set(
      shop.services.map((service) => service.category).filter((category): category is string => !!category)
    ),
  ];
  const servicesLabel = categories.slice(0, 2).join(" · ");
  const minPrice = shop.services[0]?.price_cents;
  const distanceLabel = formatDistanceKm(shop.distance_km);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.nearbyCard, pressed && styles.pressed]}
    >
      <View style={styles.nearbyImage}>
        {shop.logo_url ? (
          <Image
            source={{ uri: shop.logo_url }}
            contentFit="cover"
            style={styles.nearbyImageFill}
          />
        ) : (
          <View
            style={[
              styles.nearbyImageFill,
              styles.nearbyImageFallback,
              { backgroundColor: avatarColor(shop.name) },
            ]}
          >
            <Text style={styles.nearbyImageLetter}>
              {shop.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.nearbyInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.nearbyName} numberOfLines={1}>
            {shop.name || "—"}
          </Text>
          {shop.is_verified && <VerifiedIcon size={16} />}
        </View>
        {!!servicesLabel && (
          <Text style={styles.nearbyServices} numberOfLines={1}>
            {servicesLabel}
          </Text>
        )}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={colors.success} />
          <Text style={styles.ratingText}>
            {formatRating(shop.rating_avg, shop.rating_count, {
              showCount: false,
              fallback: "New",
            })}
          </Text>
          {shop.rating_count != null && shop.rating_count > 0 && (
            <Text style={styles.ratingCount} numberOfLines={1}>
              {`· ${shop.rating_count} ${shop.rating_count === 1 ? "review" : "reviews"}`}
            </Text>
          )}
        </View>
        {(!!shop.city || !!distanceLabel || minPrice != null) && (
          <View style={styles.nearbyMetaRow}>
            {!!shop.city && (
              <>
                <Image
                  source={require("@/assets/images/location.png")}
                  style={styles.nearbyMetaIcon}
                  contentFit="contain"
                  tintColor={colors.muted}
                />
                <Text style={styles.nearbyMeta} numberOfLines={1}>
                  {shop.city}
                </Text>
                <Text style={styles.nearbyMetaDot}>·</Text>
              </>
            )}
            {!!distanceLabel && (
              <>
                <Text style={styles.nearbyMeta} numberOfLines={1}>
                  {distanceLabel}
                </Text>
                {minPrice != null && <Text style={styles.nearbyMetaDot}>·</Text>}
              </>
            )}
            {minPrice != null && (
              <Text style={styles.nearbyPrice}>{`From ${formatCents(minPrice)}`}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function OpenTodayCard({ shop, onPress }: { shop: ShopOpenToday; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.openTodayCard, pressed && styles.pressed]}
    >
      <View style={styles.openTodayHeader}>
        <Avatar fullName={shop.name} imageUrl={shop.logo_url} size={48} />
        <View style={styles.openTodayInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.openTodayName} numberOfLines={1}>
              {shop.name || "—"}
            </Text>
            {shop.is_verified && <VerifiedIcon size={15} />}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.success} />
            <Text style={styles.ratingText}>
              {formatRating(shop.rating_avg, shop.rating_count, {
                showCount: false,
                fallback: "New",
              })}
            </Text>
            {!!shop.city && (
              <Text style={styles.ratingCount} numberOfLines={1}>
                {`· ${shop.city}`}
              </Text>
            )}
          </View>
        </View>
      </View>
      {shop.slots.length > 0 && (
        <View style={styles.slotsRow}>
          {shop.slots.map((slot) => (
            <View key={slot.starts_at} style={styles.slotChip}>
              <Text style={styles.slotText}>{slot.label}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function BookAgainRowCard({ row, onPress }: { row: BookAgainRow; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bookAgainRow, pressed && styles.pressed]}
    >
      <Avatar fullName={row.shop?.name} imageUrl={row.shop?.logo_url} size={44} />
      <View style={styles.bookAgainInfo}>
        <Text style={styles.bookAgainName} numberOfLines={1}>
          {row.shop?.name ?? "—"}
        </Text>
        <Text style={styles.bookAgainService} numberOfLines={1}>
          {row.service_name || "—"}
        </Text>
      </View>
      <View style={styles.bookAgainChip}>
        <Text style={styles.bookAgainChipText}>Book again</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  locationPlaceholder: {
    color: colors.muted,
  },
  search: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 98,
    gap: spacing.md,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  railScroll: {
    marginRight: -14,
  },
  servicesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingRight: 4,
  },
  serviceItem: {
    width: 64,
    alignItems: "center",
    gap: spacing.xs,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  rail: {
    gap: spacing.md,
    paddingRight: 4,
  },
  nearbyCard: {
    width: NEARBY_CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  nearbyImage: {
    width: "100%",
    height: NEARBY_IMAGE_HEIGHT,
    backgroundColor: colors.primarySoft,
  },
  nearbyImageFill: {
    width: "100%",
    height: "100%",
  },
  nearbyImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyImageLetter: {
    fontSize: 44,
    fontWeight: "700",
    color: colors.primary,
  },
  nearbyInfo: {
    padding: spacing.md,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nearbyName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  nearbyServices: {
    fontSize: 13,
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
  ratingCount: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.muted,
  },
  nearbyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  nearbyMetaIcon: {
    width: 12,
    height: 12,
  },
  nearbyMeta: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.muted,
  },
  nearbyMetaDot: {
    fontSize: 12,
    color: colors.muted,
  },
  nearbyPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  skeleton: {
    backgroundColor: colors.border,
  },
  skeletonCard: {
    width: NEARBY_CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  skeletonCardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  openTodayList: {
    gap: spacing.sm,
  },
  openTodayCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  openTodayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  openTodayInfo: {
    flex: 1,
    gap: 2,
  },
  openTodayName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  slotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slotChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  slotText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  bookAgainList: {
    gap: spacing.sm,
  },
  bookAgainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookAgainInfo: {
    flex: 1,
    gap: 2,
  },
  bookAgainName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  bookAgainService: {
    fontSize: 13,
    color: colors.muted,
  },
  bookAgainChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  bookAgainChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
});
