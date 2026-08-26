import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { BookingModal } from "@/components/ui/BookingModal";
import { Button } from "@/components/ui/Button";
import { NativeMap } from "@/components/ui/NativeMap";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { ReviewSheet } from "@/components/ui/ReviewSheet";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShopLoyaltyCard } from "@/components/ui/ShopLoyaltyCard";
import { StarRating } from "@/components/ui/StarRating";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  dayName,
  formatCents,
  formatDurationMinutes,
  formatOpenRange,
  formatRating,
  localeDateString,
  shopStatusInfo,
} from "@/lib/format";
import { getLocale, t } from "@/lib/i18n";
import { useUserCountry } from "@/lib/user-country";
import {
  loadCompletedBookingId,
  loadMyShopReview,
  loadShopReviews,
  type ReviewRow,
} from "@/lib/reviews";
import {
  addFavorite,
  fetchFavoriteShopIds,
  loadShopDetail,
  removeFavorite,
  type ShopDetail,
} from "@/lib/shop";
import { ShopCountryProvider } from "@/lib/shop-country";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

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
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [completedBookingId, setCompletedBookingId] = useState<number | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const { width: windowWidth } = useWindowDimensions();
  const { notice, showNotice } = useNotice();
  const userCountry = useUserCountry();

  const load = useCallback(async () => {
    if (!Number.isFinite(shopId)) {
      setError(t("shop.could_not_load"));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [detail, publishedReviews, ownReview, completedBooking] = await Promise.all([
        loadShopDetail(shopId),
        loadShopReviews(shopId),
        user?.id ? loadMyShopReview(shopId, user.id) : Promise.resolve(null),
        user?.id ? loadCompletedBookingId(shopId, user.id) : Promise.resolve(null),
      ]);
      setShop(detail);
      setReviews(publishedReviews);
      setMyReview(ownReview);
      setCompletedBookingId(completedBooking);
      if (detail === null) {
        setError(t("shop.not_available"));
      }
      if (user?.id) {
        setFavoriteIds(await fetchFavoriteShopIds(user.id));
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    }
  }, [shopId, user?.id]);

  function handleReviewSaved(review: ReviewRow) {
    setMyReview(review);
    showNotice(
      review.status === "pending"
        ? t("shop.review_submitted_pending")
        : t("shop.review_updated"),
      "success"
    );
    void load().catch(() => undefined);
  }

  function handleReviewDeleted() {
    setMyReview(null);
    showNotice(t("shop.review_removed"), "success");
    void load().catch(() => undefined);
  }

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
      Alert.alert(t("shop.could_not_update_favorite"), errorMessageFromUnknown(e));
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
        <AppText style={styles.errorTitle}>{t("shop.could_not_load")}</AppText>
        <AppText style={styles.errorText}>{error ?? t("common.error")}</AppText>
        <Button
          title={t("shop.go_back")}
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
  const status = shopStatusInfo(shop.working_hours);
  const contentWidth = Math.min(windowWidth, 480) - 28;
  const galleryImages = shop.gallery.filter((uri) => !failedImages.has(uri));
  const heroImages =
    galleryImages.length > 0
      ? galleryImages
      : shop.logo_url && !failedImages.has(shop.logo_url)
        ? [shop.logo_url]
        : [];

  return (
    <ShopCountryProvider value={shop.country}>
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
        <AppText style={styles.title}>{t("shop.page_title")}</AppText>
      </View>

      <View style={styles.hero}>
        {heroImages.length === 0 ? (
          <View style={[styles.heroImage, styles.heroFallback]}>
            <AppText style={styles.heroLetter}>
              {(shop.name || "?").charAt(0).toUpperCase()}
            </AppText>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) =>
                setActiveSlide(
                  Math.round(
                    event.nativeEvent.contentOffset.x / Math.max(contentWidth, 1)
                  )
                )
              }
              style={styles.heroCarousel}
            >
              {heroImages.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  contentFit="cover"
                  style={[styles.heroImage, { width: contentWidth }]}
                  onError={() =>
                    setFailedImages((previous) => new Set(previous).add(uri))
                  }
                />
              ))}
            </ScrollView>
            {heroImages.length > 1 && (
              <>
                <View style={styles.heroDots}>
                  {heroImages.map((uri, index) => (
                    <View
                      key={uri}
                      style={[
                        styles.heroDot,
                        index === activeSlide && styles.heroDotActive,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.heroCount}>
                  <AppText style={styles.heroCountText}>
                    {activeSlide + 1}/{heroImages.length}
                  </AppText>
                </View>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <View style={styles.nameRow}>
            <AppText style={styles.name} numberOfLines={1}>
              {shop.name || "—"}
            </AppText>
            {shop.is_verified && <VerifiedIcon size={18} />}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.success} />
            <AppText style={styles.metaText}>
              {formatRating(shop.rating_avg, shop.rating_count, { suffix: t("shop.reviews_suffix") })}
            </AppText>
            {!!shop.city && (
              <>
                <AppText style={styles.metaDot}>·</AppText>
                <Image
                  source={require("@/assets/images/location.png")}
                  style={styles.metaLocationIcon}
                  contentFit="contain"
                  tintColor={colors.muted}
                />
                <AppText style={styles.metaText}>{shop.city}</AppText>
              </>
            )}
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: status.open ? colors.success : colors.muted },
              ]}
            />
            <AppText
              style={[
                styles.statusText,
                { color: status.open ? colors.success : colors.muted },
              ]}
              numberOfLines={1}
            >
              {status.label}
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={handleToggleFavorite}
          disabled={togglingFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? t("shop.remove_from_favorites") : t("shop.add_to_favorites")}
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

      {!!shop.description && <AppText style={styles.description}>{shop.description}</AppText>}

      <View style={styles.detailsCard}>
        {!!shop.address_line1 && (
          <View style={styles.detailRow}>
            <Image
              source={require("@/assets/images/location.png")}
              style={styles.detailLocationIcon}
              contentFit="contain"
              tintColor={colors.muted}
            />
            <AppText style={styles.detailValue} numberOfLines={1}>
              {[shop.address_line1, shop.address_line2, shop.city, shop.state]
                .filter(Boolean)
                .join(", ")}
            </AppText>
          </View>
        )}
        {!!shop.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.muted} />
            <AppText style={styles.detailValue} numberOfLines={1}>
              {shop.phone}
            </AppText>
          </View>
        )}
        {!!shop.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <AppText style={styles.detailValue} numberOfLines={1}>
              {shop.email}
            </AppText>
          </View>
        )}
        {!!shop.website && (
          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={16} color={colors.muted} />
            <AppText style={styles.detailValue} numberOfLines={1}>
              {shop.website}
            </AppText>
          </View>
        )}
      </View>

      {shop.latitude != null && shop.longitude != null && (
        <View style={styles.mapContainer}>
          <NativeMap
            latitude={shop.latitude}
            longitude={shop.longitude}
            zoom={15}
            markers={[
              {
                id: "shop",
                latitude: shop.latitude,
                longitude: shop.longitude,
                title: shop.name,
              },
            ]}
            style={styles.map}
          />
        </View>
      )}

      <SectionHeader title={t("shop.hours")} />
      <View style={styles.detailsCard}>
        {sortedHours.map((hours) => {
          const isToday = hours.day_of_week === today;
          return (
            <View key={hours.id} style={styles.detailRow}>
              <AppText style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                {isToday ? t("shop.today") : dayName(hours.day_of_week)}
              </AppText>
              <AppText style={[styles.detailValue, isToday && styles.hoursValueToday]}>
                {hours.is_closed ? t("shop.closed") : formatOpenRange(hours.opens_at, hours.closes_at)}
              </AppText>
            </View>
          );
        })}
      </View>

      <SectionHeader title={t("shop.services")} />
      {shop.services.length === 0 ? (
        <AppText style={styles.emptyText}>{t("shop.no_services")}</AppText>
      ) : (
        categories.map((category) => (
          <View key={category} style={styles.servicesGroup}>
            <AppText style={styles.categoryTitle}>{category}</AppText>
            <View style={styles.detailsCard}>
              {shop.services
                .filter((service) => service.category === category)
                .map((service) => (
                  <View key={service.id} style={styles.serviceRow}>
                    <View style={styles.serviceInfo}>
                      <AppText style={styles.serviceName} numberOfLines={1}>
                        {service.name}
                      </AppText>
                      <AppText style={styles.serviceMeta} numberOfLines={1}>
                        {formatDurationMinutes(service.duration_minutes)}
                        {!!service.description ? ` · ${service.description}` : ""}
                      </AppText>
                    </View>
                    <AppText style={styles.servicePrice}>
                      {formatCents(service.price_cents, userCountry)}
                    </AppText>
                  </View>
                ))}
            </View>
          </View>
        ))
      )}

      <SectionHeader title={t("shop.barbers")} />
      {shop.members.length === 0 ? (
        <AppText style={styles.emptyText}>{t("shop.no_barbers")}</AppText>
      ) : (
        <View style={styles.detailsCard}>
          {shop.members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() =>
                router.push({
                  pathname: "/customer/barber/[profileId]",
                  params: {
                    profileId: member.profile_id,
                    shopId: String(shop.id),
                    shopName: shop.name,
                  },
                })
              }
              style={({ pressed }) => [
                styles.barberRow,
                pressed && styles.barberRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("shop.view_barber_profile", { name: member.display_name || t("barber.unavailable") })}
            >
              <Avatar
                fullName={member.display_name}
                imageUrl={member.avatar_url}
                size={40}
              />
              <View style={styles.barberInfo}>
                <AppText style={styles.barberName} numberOfLines={1}>
                  {member.display_name || "—"}
                </AppText>
                <AppText style={styles.barberMeta} numberOfLines={1}>
                  {[
                    member.specialty,
                    member.years_of_experience != null
                      ? `${member.years_of_experience} ${
                          member.years_of_experience === 1 ? "yr" : "yrs"
                        }`
                      : null,
                    member.joined_at
                      ? localeDateString(new Date(member.joined_at), getLocale(), {
                          month: "short",
                          year: "numeric",
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </View>
              <RTLIcon name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {!!user?.id && (
        <ShopLoyaltyCard shopId={shop.id} customerId={user.id} />
      )}

      <SectionHeader title={t("shop.reviews")} />

      {notice ? <NoticeBanner notice={notice} /> : null}

      {!!user?.id && !!completedBookingId && (
        <Button
          title={myReview ? t("shop.edit_review") : t("shop.leave_review")}
          variant={myReview ? "outline" : "primary"}
          onPress={() => setReviewVisible(true)}
          style={styles.reviewCta}
        />
      )}

      {myReview?.status === "pending" && (
        <AppText style={styles.reviewPending}>{t("shop.review_awaiting")}</AppText>
      )}

      {reviews.length === 0 ? (
        <View style={styles.reviewEmptyCard}>
          <AppText style={styles.reviewEmptyTitle}>{t("shop.no_reviews")}</AppText>
          <AppText style={styles.reviewEmptySubtitle}>
            {t("shop.be_first")}
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.reviewSummaryCard}>
            <View style={styles.reviewSummaryMain}>
              <AppText style={styles.reviewSummaryAvg}>
                {Number(shop.rating_avg ?? 0).toFixed(1)}
              </AppText>
              <StarRating value={Math.round(shop.rating_avg ?? 0)} size={16} />
              <AppText style={styles.reviewSummaryCount}>
                {shop.rating_count} {shop.rating_count === 1 ? t("shop.review") : t("shop.reviews_count")}
              </AppText>
            </View>
            <View style={styles.reviewDistribution}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((review) => review.rating === star).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <View key={star} style={styles.distributionRow}>
                    <AppText style={styles.distributionStar}>{star}</AppText>
                    <View style={styles.distributionTrack}>
                      <View style={[styles.distributionFill, { width: `${pct}%` }]} />
                    </View>
                    <AppText style={styles.distributionCount}>{count}</AppText>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.reviewList}>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        </>
      )}

      <Button
        title={t("shop.book_now")}
        onPress={() => setBookingVisible(true)}
        style={styles.bookButton}
      />

      <BookingModal
        visible={bookingVisible}
        shopId={shop.id}
        shopName={shop.name}
        shopCountry={shop.country}
        services={shop.services}
        members={shop.members}
        onClose={() => setBookingVisible(false)}
        onBooked={() => router.push("/customer/bookings")}
      />

      <ReviewSheet
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        shopId={shop.id}
        shopName={shop.name}
        customerId={user?.id ?? ""}
        bookingId={completedBookingId ?? undefined}
        existing={myReview}
        onSaved={handleReviewSaved}
        onDeleted={handleReviewDeleted}
      />
      </ScrollView>
    </Screen>
    </ShopCountryProvider>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingHorizontal: 14,
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
  hero: {
    marginBottom: spacing.md,
  },
  heroCarousel: {
    borderRadius: radius.md,
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroLetter: {
    fontSize: 72,
    fontWeight: "700",
    color: colors.primary,
  },
  heroDots: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  heroDotActive: {
    width: 16,
    backgroundColor: colors.white,
  },
  heroCount: {
    position: "absolute",
    top: spacing.sm,
    end: spacing.sm,
    backgroundColor: "rgba(24, 24, 27, 0.55)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  heroCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.white,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
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
  metaLocationIcon: {
    width: 12,
    height: 12,
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
  mapContainer: {
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  detailLocationIcon: {
    width: 16,
    height: 16,
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
  barberRowPressed: {
    opacity: 0.7,
  },
  barberName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  barberInfo: {
    flex: 1,
    gap: 2,
  },
  barberMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  bookButton: {
    marginTop: spacing.sm,
  },
  reviewCta: {
    marginTop: spacing.sm,
  },
  reviewPending: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: "#fef3c7",
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  reviewEmptyCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reviewEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  reviewEmptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
  },
  reviewSummaryCard: {
    flexDirection: "row",
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reviewSummaryMain: {
    alignItems: "center",
    justifyContent: "center",
    paddingEnd: spacing.lg,
    borderEndWidth: StyleSheet.hairlineWidth,
    borderEndColor: colors.border,
  },
  reviewSummaryAvg: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 38,
  },
  reviewSummaryCount: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.muted,
  },
  reviewDistribution: {
    flex: 1,
    justifyContent: "center",
    paddingStart: spacing.lg,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  distributionStar: {
    width: 12,
    fontSize: 12,
    color: colors.text,
  },
  distributionTrack: {
    flex: 1,
    height: 6,
    marginHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  distributionFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "#b45309",
  },
  distributionCount: {
    width: 16,
    fontSize: 12,
    color: colors.muted,
  },
  reviewList: {
    marginTop: spacing.md,
  },
});
