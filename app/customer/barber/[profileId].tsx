import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


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
import { t } from "@/lib/i18n";
import { useUserCountry } from "@/lib/user-country";
import { loadShopDetail, type ShopMember, type ShopService } from "@/lib/shop";
import { colors, radius, spacing } from "@/lib/theme";

function yearsLabel(years: number | null): string | null {
  if (years == null) {
    return null;
  }
  return t("barber.years_experience", { count: years, unit: years === 1 ? t("barber.year") : t("barber.years") });
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
  const userCountry = useUserCountry();
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingShop, setBookingShop] = useState<{
    services: ShopService[];
    members: ShopMember[];
    country?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setError(t("barber.not_found"));
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
          setError(t("barber.unavailable_now"));
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
        Alert.alert(t("barber.could_not_book"), t("barber.shop_not_available"));
        return;
      }
      setBookingShop({ services: detail.services, members: detail.members, country: detail.country });
      setBookingVisible(true);
    } catch (e) {
      Alert.alert(t("barber.could_not_book"), errorMessageFromUnknown(e));
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
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <RTLIcon name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <AppText style={styles.title}>{t("barber.page_title")}</AppText>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !profile ? (
          <View style={styles.errorBox}>
            <AppText style={styles.errorTitle}>{t("barber.could_not_load")}</AppText>
            <AppText style={styles.errorText}>{error ?? t("common.error")}</AppText>
            <Button
              title={t("shop.go_back")}
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
              <AppText style={styles.name} numberOfLines={1}>
                {profile.display_name}
              </AppText>
              {!!profile.city && (
                <View style={styles.cityRow}>
                  <Image
                    source={require("@/assets/images/location.png")}
                    style={styles.cityIcon}
                    contentFit="contain"
                    tintColor={colors.muted}
                  />
                  <AppText style={styles.cityText}>{profile.city}</AppText>
                </View>
              )}
            </View>

            {(!!profile.specialty || !!years) && (
              <View style={styles.chips}>
                {!!profile.specialty && (
                  <View style={styles.chip}>
                    <AppText style={styles.chipText}>{profile.specialty}</AppText>
                  </View>
                )}
                {!!years && (
                  <View style={styles.chip}>
                    <AppText style={styles.chipText}>{years}</AppText>
                  </View>
                )}
              </View>
            )}

            {profile.shop_names.length > 0 && (
              <View style={styles.shopRow}>
                <Ionicons name="storefront-outline" size={16} color={colors.muted} />
                <AppText style={styles.shopText} numberOfLines={2}>
                  {profile.shop_names.join(" · ")}
                </AppText>
              </View>
            )}

            {!!profile.bio && (
              <>
                <SectionHeader title={t("barber.about")} />
                <DetailsCard>
                  <AppText style={styles.bio}>{profile.bio}</AppText>
                </DetailsCard>
              </>
            )}

            {services.length > 0 && (
              <>
                <SectionHeader title={t("shop.services")} />
                {serviceCategories.length > 0
                  ? serviceCategories.map((category) => (
                      <View key={category} style={styles.servicesGroup}>
                        <AppText style={styles.categoryTitle}>{category}</AppText>
                        <DetailsCard>
                          {services
                            .filter((service) => service.category === category)
                            .map((service) => (
                              <View key={service.id} style={styles.serviceRow}>
                                <View style={styles.serviceInfo}>
                                  <AppText style={styles.serviceName} numberOfLines={2}>
                                    {service.name}
                                  </AppText>
                                  <AppText style={styles.serviceMeta} numberOfLines={1}>
                                    {formatDurationMinutes(service.duration_minutes)}
                                    {!!service.description &&
                                      ` · ${service.description}`}
                                  </AppText>
                                </View>
                                <AppText style={styles.servicePrice}>
                                  {formatCents(service.price_cents, userCountry)}
                                </AppText>
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
                            <AppText style={styles.serviceName} numberOfLines={2}>
                              {service.name}
                            </AppText>
                            <AppText style={styles.serviceMeta} numberOfLines={1}>
                              {formatDurationMinutes(service.duration_minutes)}
                              {!!service.description && ` · ${service.description}`}
                            </AppText>
                          </View>
                          <AppText style={styles.servicePrice}>
                            {formatCents(service.price_cents, userCountry)}
                          </AppText>
                        </View>
                      ))}
                    </DetailsCard>
                  )}
              </>
            )}

            {portfolio.length > 0 && (
              <>
                <SectionHeader title={t("barber.portfolio")} />
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
                title={t("barber.book_with", { name: profile.display_name || t("barber.unavailable") })}
                onPress={() => void handleBook()}
                loading={bookingLoading}
                style={styles.bookButton}
              />
            )}

            <BookingModal
              visible={bookingVisible}
              shopId={Number(shopId)}
              shopName={shopName ?? profile.shop_names[0] ?? ""}
              shopCountry={bookingShop?.country}
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
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
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
    paddingEnd: spacing.xs,
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
