import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BookingModal } from "@/components/ui/BookingModal";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  dayName,
  formatCents,
  formatOpenRange,
} from "@/lib/format";
import {
  addFavorite,
  fetchFavoriteShopIds,
  loadShopDetail,
  removeFavorite,
  type ShopDetail,
  type ShopService,
} from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

function serviceDurationLabel(service: ShopService): string {
  return service.duration_minutes >= 60
    ? `${Math.floor(service.duration_minutes / 60)}h ${
        service.duration_minutes % 60 === 0 ? "" : `${service.duration_minutes % 60}m`
      }`.trim()
    : `${service.duration_minutes}m`;
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = Number(id);
  const router = useRouter();
  const { user } = useUser();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(shopId)) {
      setError("Shop not found.");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const detail = await loadShopDetail(shopId);
      setShop(detail);
      if (detail === null) {
        setError("This shop is not available right now.");
      }
      if (user?.id) {
        setFavoriteIds(await fetchFavoriteShopIds(user.id));
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    }
  }, [shopId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load().finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function handleToggleFavorite() {
    if (!user?.id || !shop || togglingFavorite) {
      return;
    }
    setTogglingFavorite(true);
    try {
      if (favoriteIds.has(shop.id)) {
        await removeFavorite(user.id, shop.id);
        setFavoriteIds((previous) => {
          const next = new Set(previous);
          next.delete(shop.id);
          return next;
        });
      } else {
        await addFavorite(user.id, shop.id);
        setFavoriteIds((previous) => new Set(previous).add(shop.id));
      }
    } catch (e) {
      Alert.alert("Couldn't update favorite", errorMessageFromUnknown(e));
    } finally {
      setTogglingFavorite(false);
    }
  }

  if (loading && !shop) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !shop) {
    return (
      <Screen centered>
        <Text style={styles.errorTitle}>{"Couldn't load this shop"}</Text>
        <Text style={styles.errorText}>{error ?? "Something went wrong."}</Text>
        <Button
          title="Go back"
          variant="outline"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </Screen>
    );
  }

  const isFavorite = favoriteIds.has(shop.id);
  const sortedHours = [...shop.working_hours].sort(
    (a, b) => a.day_of_week - b.day_of_week
  );
  const today = new Date().getDay();
  const categories = [...new Set(shop.services.map((service) => service.category))].filter(
    (category): category is string => !!category
  );

  return (
    <Screen style={styles.screenPadding}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backRow}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Image
          source={shop.logo_url ? { uri: shop.logo_url } : undefined}
          contentFit="cover"
          style={styles.heroImage}
        />
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {shop.name || "—"}
            </Text>
            {shop.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primaryDark} />
            )}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.success} />
            <Text style={styles.metaText}>
              {shop.rating_avg != null
                ? `${Number(shop.rating_avg).toFixed(1)} (${shop.rating_count ?? 0} reviews)`
                : "New"}
            </Text>
            {!!shop.city && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="location" size={12} color={colors.muted} />
                <Text style={styles.metaText}>{shop.city}</Text>
              </>
            )}
          </View>
        </View>
        <Pressable
          onPress={handleToggleFavorite}
          disabled={togglingFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
          style={({ pressed }) => [
            styles.favoriteButton,
            pressed && styles.favoriteButtonPressed,
          ]}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? colors.danger : colors.muted}
          />
        </Pressable>
      </View>

      {!!shop.description && <Text style={styles.description}>{shop.description}</Text>}

      <View style={styles.detailsCard}>
        {!!shop.address_line1 && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={styles.detailValue} numberOfLines={1}>
              {[shop.address_line1, shop.address_line2, shop.city, shop.state]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        )}
        {!!shop.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.muted} />
            <Text style={styles.detailValue} numberOfLines={1}>
              {shop.phone}
            </Text>
          </View>
        )}
        {!!shop.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <Text style={styles.detailValue} numberOfLines={1}>
              {shop.email}
            </Text>
          </View>
        )}
        {!!shop.website && (
          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={16} color={colors.muted} />
            <Text style={styles.detailValue} numberOfLines={1}>
              {shop.website}
            </Text>
          </View>
        )}
      </View>

      <SectionHeader title="Hours" />
      <View style={styles.detailsCard}>
        {sortedHours.map((hours) => {
          const isToday = hours.day_of_week === today;
          return (
            <View key={hours.id} style={styles.detailRow}>
              <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                {isToday ? "Today" : dayName(hours.day_of_week)}
              </Text>
              <Text style={[styles.detailValue, isToday && styles.hoursValueToday]}>
                {hours.is_closed ? "Closed" : formatOpenRange(hours.opens_at, hours.closes_at)}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionHeader title="Services" />
      {shop.services.length === 0 ? (
        <Text style={styles.emptyText}>No services listed yet.</Text>
      ) : (
        categories.map((category) => (
          <View key={category} style={styles.servicesGroup}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.detailsCard}>
              {shop.services
                .filter((service) => service.category === category)
                .map((service) => (
                  <View key={service.id} style={styles.serviceRow}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <Text style={styles.serviceMeta} numberOfLines={1}>
                        {serviceDurationLabel(service)}
                        {!!service.description ? ` · ${service.description}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>
                      {formatCents(service.price_cents)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        ))
      )}

      <SectionHeader title="Barbers" />
      {shop.members.length === 0 ? (
        <Text style={styles.emptyText}>No barbers at this shop yet.</Text>
      ) : (
        <View style={styles.detailsCard}>
          {shop.members.map((member) => (
            <View key={member.id} style={styles.barberRow}>
              <Avatar
                fullName={member.display_name}
                imageUrl={member.avatar_url}
                size={40}
              />
              <Text style={styles.barberName} numberOfLines={1}>
                {member.display_name || "—"}
              </Text>
              {member.joined_at ? (
                <Text style={styles.barberSince}>
                  {new Date(member.joined_at).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Button
        title="Book an appointment"
        onPress={() => setBookingVisible(true)}
        style={styles.bookButton}
      />

      <BookingModal
        visible={bookingVisible}
        shopId={shop.id}
        shopName={shop.name}
        services={shop.services}
        members={shop.members}
        onClose={() => setBookingVisible(false)}
        onBooked={() => router.push("/customer/bookings")}
      />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  hero: {
    marginBottom: spacing.md,
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  titleInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
  metaDot: {
    fontSize: 13,
    color: colors.muted,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  hoursDay: {
    width: 92,
    fontSize: 13,
    color: colors.muted,
  },
  hoursDayToday: {
    fontWeight: "700",
    color: colors.text,
  },
  hoursValueToday: {
    fontWeight: "600",
    color: colors.primaryDark,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
  servicesGroup: {
    gap: spacing.xs,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 0,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  barberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  barberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  barberSince: {
    fontSize: 12,
    color: colors.muted,
  },
  bookButton: {
    marginTop: spacing.sm,
  },
});
