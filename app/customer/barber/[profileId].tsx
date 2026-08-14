import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BookingModal } from "@/components/ui/BookingModal";
import { Button } from "@/components/ui/Button";
import { DetailsCard } from "@/components/ui/DetailsCard";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  loadPublicBarberPortfolio,
  loadPublicBarberProfile,
  loadPublicBarberServices,
  type PublicBarberProfile,
  type PublicBarberService,
  type PublicPortfolioImage,
} from "@/lib/barber";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDurationMinutes } from "@/lib/format";
import { loadShopDetail, type ShopMember, type ShopService } from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

function yearsLabel(years: number | null): string | null {
  if (years == null) {
    return null;
  }
  return `${years} ${years === 1 ? "yr" : "yrs"} experience`;
}

export default function BarberProfileScreen() {
  const router = useRouter();
  const { profileId, shopId, shopName } = useLocalSearchParams<{
    profileId?: string;
    shopId?: string;
    shopName?: string;
  }>();

  const [profile, setProfile] = useState<PublicBarberProfile | null>(null);
  const [services, setServices] = useState<PublicBarberService[]>([]);
  const [portfolio, setPortfolio] = useState<PublicPortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingShop, setBookingShop] = useState<{
    services: ShopService[];
    members: ShopMember[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setError("Barber not found.");
      setLoading(false);
      return;
    }
    const shopIdNumber = Number(shopId);
    const validShopId = Number.isFinite(shopIdNumber) ? shopIdNumber : undefined;
    Promise.all([
      loadPublicBarberProfile(profileId),
      loadPublicBarberServices(profileId, validShopId),
      loadPublicBarberPortfolio(profileId, validShopId),
    ])
      .then(([result, servicesResult, portfolioResult]) => {
        if (cancelled) {
          return;
        }
        setProfile(result);
        setServices(servicesResult);
        setPortfolio(portfolioResult);
        if (!result) {
          setError("This barber isn't available right now.");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorMessageFromUnknown(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, shopId]);

  async function handleBook() {
    const id = Number(shopId);
    if (!Number.isFinite(id)) {
      return;
    }
    setBookingLoading(true);
    try {
      const detail = await loadShopDetail(id);
      if (!detail) {
        Alert.alert("Couldn't book", "This shop is not available right now.");
        return;
      }
      setBookingShop({ services: detail.services, members: detail.members });
      setBookingVisible(true);
    } catch (e) {
      Alert.alert("Couldn't book", errorMessageFromUnknown(e));
    } finally {
      setBookingLoading(false);
    }
  }

  const years = yearsLabel(profile?.years_of_experience ?? null);
  const serviceCategories = [
    ...new Set(services.map((service) => service.category)),
  ].filter((category): category is string => !!category);

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

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !profile ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{"Couldn't load this barber"}</Text>
            <Text style={styles.errorText}>{error ?? "Something went wrong."}</Text>
            <Button
              title="Go back"
              variant="outline"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Avatar
                fullName={profile.display_name}
                imageUrl={profile.avatar_url}
                size={120}
              />
              <Text style={styles.name} numberOfLines={1}>
                {profile.display_name}
              </Text>
              {!!profile.city && (
                <View style={styles.cityRow}>
                  <Image
                    source={require("@/assets/images/location.png")}
                    style={styles.cityIcon}
                    contentFit="contain"
                    tintColor={colors.muted}
                  />
                  <Text style={styles.cityText}>{profile.city}</Text>
                </View>
              )}
            </View>

            {(!!profile.specialty || !!years) && (
              <View style={styles.chips}>
                {!!profile.specialty && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{profile.specialty}</Text>
                  </View>
                )}
                {!!years && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{years}</Text>
                  </View>
                )}
              </View>
            )}

            {profile.shop_names.length > 0 && (
              <View style={styles.shopRow}>
                <Ionicons name="storefront-outline" size={16} color={colors.muted} />
                <Text style={styles.shopText} numberOfLines={2}>
                  {profile.shop_names.join(" · ")}
                </Text>
              </View>
            )}

            {!!profile.bio && (
              <>
                <SectionHeader title="About" />
                <DetailsCard>
                  <Text style={styles.bio}>{profile.bio}</Text>
                </DetailsCard>
              </>
            )}

            {services.length > 0 && (
              <>
                <SectionHeader title="Services" />
                {serviceCategories.length > 0
                  ? serviceCategories.map((category) => (
                      <View key={category} style={styles.servicesGroup}>
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <DetailsCard>
                          {services
                            .filter((service) => service.category === category)
                            .map((service) => (
                              <View key={service.id} style={styles.serviceRow}>
                                <View style={styles.serviceInfo}>
                                  <Text style={styles.serviceName} numberOfLines={2}>
                                    {service.name}
                                  </Text>
                                  <Text style={styles.serviceMeta} numberOfLines={1}>
                                    {formatDurationMinutes(service.duration_minutes)}
                                    {!!service.description &&
                                      ` · ${service.description}`}
                                  </Text>
                                </View>
                                <Text style={styles.servicePrice}>
                                  {formatCents(service.price_cents)}
                                </Text>
                              </View>
                            ))}
                        </DetailsCard>
                      </View>
                    ))
                  : (
                    <DetailsCard>
                      {services.map((service) => (
                        <View key={service.id} style={styles.serviceRow}>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceName} numberOfLines={2}>
                              {service.name}
                            </Text>
                            <Text style={styles.serviceMeta} numberOfLines={1}>
                              {formatDurationMinutes(service.duration_minutes)}
                              {!!service.description && ` · ${service.description}`}
                            </Text>
                          </View>
                          <Text style={styles.servicePrice}>
                            {formatCents(service.price_cents)}
                          </Text>
                        </View>
                      ))}
                    </DetailsCard>
                  )}
              </>
            )}

            {portfolio.length > 0 && (
              <>
                <SectionHeader title="Portfolio" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.portfolioRow}
                >
                  {portfolio.map((image) => (
                    <Image
                      key={image.id}
                      source={{ uri: image.object_path }}
                      contentFit="cover"
                      style={styles.portfolioImage}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {shopId && (
              <Button
                title={`Book with ${profile.display_name || "this barber"}`}
                onPress={() => void handleBook()}
                loading={bookingLoading}
                style={styles.bookButton}
              />
            )}

            <BookingModal
              visible={bookingVisible}
              shopId={Number(shopId)}
              shopName={shopName ?? profile.shop_names[0] ?? ""}
              services={bookingShop?.services ?? []}
              members={bookingShop?.members ?? []}
              onClose={() => setBookingVisible(false)}
              onBooked={() => router.push("/customer/bookings")}
            />
          </>
        )}
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  errorBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cityIcon: {
    width: 13,
    height: 13,
  },
  cityText: {
    fontSize: 14,
    color: colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  shopText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  servicesGroup: {
    gap: spacing.sm,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  portfolioRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  portfolioImage: {
    width: 200,
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  bookButton: {
    marginTop: spacing.sm,
  },
});
