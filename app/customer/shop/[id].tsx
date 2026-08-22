import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

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
  shopStatusInfo,
} from "@/lib/format";
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
      setError("Shop not found.");
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
        setError("This shop is not available right now.");
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
        ? "Review submitted — pending approval"
        : "Review updated",
      "success"
    );
    void load().catch(() => undefined);
  }

  function handleReviewDeleted() {
    setMyReview(null);
    showNotice("Review removed", "success");
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
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Shop</Text>
      </View>

      <View style={styles.hero}>
        {heroImages.length === 0 ? (
          <View style={[styles.heroImage, styles.heroFallback]}>
            <Text style={styles.heroLetter}>
              {(shop.name || "?").charAt(0).toUpperCase()}
            </Text>
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
                  <Text style={styles.heroCountText}>
                    {activeSlide + 1}/{heroImages.length}
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {shop.name || "—"}
            </Text>
            {shop.is_verified && <VerifiedIcon size={18} />}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.success} />
            <Text style={styles.metaText}>
              {formatRating(shop.rating_avg, shop.rating_count, { suffix: "reviews" })}
            </Text>
            {!!shop.city && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Image
                  source={require("@/assets/images/location.png")}
                  style={styles.metaLocationIcon}
                  contentFit="contain"
                  tintColor={colors.muted}
                />
                <Text style={styles.metaText}>{shop.city}</Text>
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
            <Text
              style={[
                styles.statusText,
                { color: status.open ? colors.success : colors.muted },
              ]}
              numberOfLines={1}
            >
              {status.label}
            </Text>
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
            <Image
              source={require("@/assets/images/location.png")}
              style={styles.detailLocationIcon}
              contentFit="contain"
              tintColor={colors.muted}
            />
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
                        {formatDurationMinutes(service.duration_minutes)}
                        {!!service.description ? ` · ${service.description}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>
                      {formatCents(service.price_cents, userCountry)}
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
              accessibilityLabel={`View ${member.display_name || "barber"} profile`}
            >
              <Avatar
                fullName={member.display_name}
                imageUrl={member.avatar_url}
                size={40}
              />
              <View style={styles.barberInfo}>
                <Text style={styles.barberName} numberOfLines={1}>
                  {member.display_name || "—"}
                </Text>
                <Text style={styles.barberMeta} numberOfLines={1}>
                  {[
                    member.specialty,
                    member.years_of_experience != null
                      ? `${member.years_of_experience} ${
                          member.years_of_experience === 1 ? "yr" : "yrs"
                        }`
                      : null,
                    member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {!!user?.id && (
        <ShopLoyaltyCard shopId={shop.id} customerId={user.id} />
      )}

      <SectionHeader title="Reviews" />

      {notice ? <NoticeBanner notice={notice} /> : null}

      {!!user?.id && !!completedBookingId && (
        <Button
          title={myReview ? "Edit your review" : "Leave a review"}
          variant={myReview ? "outline" : "primary"}
          onPress={() => setReviewVisible(true)}
          style={styles.reviewCta}
        />
      )}

      {myReview?.status === "pending" && (
        <Text style={styles.reviewPending}>Your review is awaiting approval.</Text>
      )}

      {reviews.length === 0 ? (
        <View style={styles.reviewEmptyCard}>
          <Text style={styles.reviewEmptyTitle}>No reviews yet</Text>
          <Text style={styles.reviewEmptySubtitle}>
            Be the first to share your experience after your visit.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.reviewSummaryCard}>
            <View style={styles.reviewSummaryMain}>
              <Text style={styles.reviewSummaryAvg}>
                {Number(shop.rating_avg ?? 0).toFixed(1)}
              </Text>
              <StarRating value={Math.round(shop.rating_avg ?? 0)} size={16} />
              <Text style={styles.reviewSummaryCount}>
                {shop.rating_count} {shop.rating_count === 1 ? "review" : "reviews"}
              </Text>
            </View>
            <View style={styles.reviewDistribution}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((review) => review.rating === star).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <View key={star} style={styles.distributionRow}>
                    <Text style={styles.distributionStar}>{star}</Text>
                    <View style={styles.distributionTrack}>
                      <View style={[styles.distributionFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.distributionCount}>{count}</Text>
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
        title="Book Now"
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
    right: spacing.sm,
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
    paddingRight: spacing.lg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
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
    paddingLeft: spacing.lg,
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
