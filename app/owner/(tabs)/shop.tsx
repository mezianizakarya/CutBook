import { Ionicons } from "@expo/vector-icons";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { OwnerLoyaltySection } from "@/components/ui/OwnerLoyaltySection";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShopForm, type ShopFormValues } from "@/components/ui/ShopForm";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import {
  dayName,
  formatCents,
  formatOpenRange,
} from "@/lib/format";
import { useUserCountry } from "@/lib/user-country";
import {
  deleteShop,
  loadOwnerShops,
  loadShopGallery,
  loadShopServices,
  loadWorkingHours,
  saveShopLogo,
  setServiceActive,
  updateShop,
  uploadShopGallery,
  type OwnerService,
  type OwnerShop,
  type WorkingHoursRow,
} from "@/lib/owner";
import { ShopCountryProvider } from "@/lib/shop-country";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmAction } from "@/lib/useConfirmAction";
import { useNotice } from "@/lib/useNotice";

const todayDayOfWeek = new Date().getDay();

export default function OwnerShopScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [services, setServices] = useState<OwnerService[]>([]);
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const userCountry = useUserCountry();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notice, showNotice } = useNotice();
  const [deleting, setDeleting] = useState(false);
  const [gallery, setGallery] = useState<string[]>([]);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? shops[0] ?? null,
    [shops, selectedShopId]
  );

  const detailsInitial = useMemo(
    () => ({
      name: selectedShop?.name ?? "",
      description: selectedShop?.description ?? "",
      city: selectedShop?.city ?? "",
      state: selectedShop?.state ?? "",
      country: selectedShop?.country ?? "",
      postalCode: selectedShop?.postal_code ?? "",
      address: selectedShop?.address_line1 ?? "",
      phone: selectedShop?.phone ?? "",
      latitude: selectedShop?.latitude ?? null,
      longitude: selectedShop?.longitude ?? null,
      logoUri: selectedShop?.logo_url ?? null,
      galleryUris: gallery,
    }),
    [selectedShop, gallery]
  );

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setShops([]);
      setServices([]);
      setHours([]);
      return;
    }
    const owned = await loadOwnerShops(user.id);
    setShops(owned);
    const target = owned.find((shop) => shop.id === selectedShopId) ?? owned[0] ?? null;
    if (!target) {
      setSelectedShopId(null);
      setServices([]);
      setHours([]);
      setGallery([]);
      return;
    }
    setSelectedShopId(target.id);
    const [rows, hrs, galleryRows] = await Promise.all([
      loadShopServices(target.id),
      loadWorkingHours(target.id),
      loadShopGallery(target.id),
    ]);
    setServices(rows);
    setHours(
      hrs.length === 7
        ? hrs
        : Array.from({ length: 7 }, (_, index) => ({
            day_of_week: index,
            opens_at: "09:00:00",
            closes_at: "18:00:00",
            is_closed: false,
          }))
    );
    setGallery(galleryRows);
  }, [user?.id, selectedShopId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
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
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setRefreshing(false);
    }
  }

  function selectShop(shopId: number) {
    if (shopId !== selectedShopId) {
      setSelectedShopId(shopId);
    }
  }

  const canEdit = selectedShop?.myRole === "owner";

  async function handleSaveDetails(values: ShopFormValues) {
    if (!selectedShop) {
      return;
    }
    const patch = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      address_line1: values.address.trim() || null,
      city: values.city.trim() || null,
      state: values.state.trim() || null,
      country: values.country.trim() || null,
      postal_code: values.postalCode.trim() || null,
      phone: values.phone.trim() || null,
      latitude: values.latitude,
      longitude: values.longitude,
    };
    await updateShop(selectedShop.id, patch);
    await saveShopLogo(selectedShop.id, values.logoUri);
    const galleryChanged =
      JSON.stringify(values.galleryUris) !== JSON.stringify(gallery);
    if (galleryChanged) {
      await uploadShopGallery(selectedShop.id, values.galleryUris);
      setGallery(values.galleryUris);
    }
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === selectedShop.id
          ? { ...shop, ...patch, logo_url: values.logoUri ?? null }
          : shop
      )
    );
    showNotice(t("shop.details_saved"), "success");
  }

  const { confirming, count, press: confirmDelete, reset: resetDelete } =
    useConfirmAction(async () => {
      if (!selectedShop) {
        return;
      }
      setDeleting(true);
      setError(null);
      try {
        await deleteShop(selectedShop.id);
        resetDelete();
        const remaining = shops.filter((shop) => shop.id !== selectedShop.id);
        setShops(remaining);
        setSelectedShopId(remaining[0]?.id ?? null);
        if (remaining.length === 0) {
          setServices([]);
          setHours([]);
        }
        showNotice(t("shop.shop_deleted"), "success");
      } catch (e) {
        Alert.alert(t("shop.could_not_delete"), errorMessageFromUnknown(e));
      } finally {
        setDeleting(false);
      }
    });

  function toggleService(service: OwnerService) {
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
    );
    setServiceActive(service.id, !service.is_active).catch((e) => {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: service.is_active } : s))
      );
      Alert.alert(t("shop.could_not_update_service"), errorMessageFromUnknown(e));
    });
  }

  if (loading && !shops.length) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error && !shops.length) {
    return (
      <Screen centered>
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (!selectedShop) {
    return (
      <Screen scroll style={styles.screenPadding}>
        <EmptyState
          title={t("owner.no_shop_title")}
          subtitle={t("shop.shop_empty_description")}
        />
      </Screen>
    );
  }

  return (
    <ShopCountryProvider value={selectedShop.country}>
    <Screen style={styles.screenPadding}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("tabs.shop")}</Text>
          <Text style={styles.subtitle}>
            {selectedShop.status === "pending"
              ? t("shop.shop_subtitle_pending")
              : t("shop.shop_subtitle_active")}
          </Text>
        </View>

        {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipRow}
        >
          {shops.map((shop) => (
            <FilterChip
              key={shop.id}
              label={shop.name}
              selected={selectedShop.id === shop.id}
              onPress={() => selectShop(shop.id)}
            />
          ))}
          <Pressable
            onPress={() => router.push("/onboarding/owner-shop")}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("shop.add_shop")}
            style={({ pressed }) => [
              styles.addShopChip,
              pressed && styles.addShopChipPressed,
            ]}
          >
            <Ionicons name="add" size={18} color={colors.muted} />
          </Pressable>
        </ScrollView>

        {/* Details */}
        <SectionHeader title={t("shop.details")} />
        {canEdit ? (
          <ShopForm
            key={selectedShop.id}
            initial={detailsInitial}
            submitLabel={t("shop.save_details")}
            onSubmit={handleSaveDetails}
          />
        ) : (
          <View style={styles.card}>
            <InfoRow label={t("shop.name")} value={selectedShop.name} />
            <InfoRow label={t("shop.description")} value={selectedShop.description} />
            <InfoRow label={t("shop.address")} value={selectedShop.address_line1} />
            <InfoRow
              label={t("shop.city")}
              value={[selectedShop.city, selectedShop.state, selectedShop.country]
                .filter(Boolean)
                .join(", ")}
            />
            <InfoRow label={t("shop.postal_code")} value={selectedShop.postal_code} />
            <InfoRow label={t("shop.phone")} value={selectedShop.phone} />
            <Text style={styles.managerHint}>
              {t("shop.manager_hint")}
            </Text>
          </View>
        )}

        {/* Services */}
        <SectionHeader
          title={t("shop.services")}
          actionLabel={canEdit ? t("common.edit") : undefined}
          onAction={
            canEdit
              ? () =>
                  router.push({
                    pathname: "/owner/shop-services",
                    params: {
                      shopId: String(selectedShop.id),
                      name: selectedShop.name,
                    },
                  })
              : undefined
          }
        />
        {services.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyTitle}>{t("shop.no_services_yet")}</Text>
            <Text style={styles.inlineEmptySubtitle}>
              {t("shop.add_services_hint")}
            </Text>
          </View>
        ) : (
          <View style={styles.groupCard}>
            {services.map((service, index) => (
              <View
                key={service.id}
                style={[styles.serviceRow, index > 0 && styles.groupDivider]}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceMeta} numberOfLines={1}>
                    <Text style={styles.servicePrice}>
                      {formatCents(service.price_cents, userCountry)}
                    </Text>
                    {`  ·  ${service.duration_minutes} ${t("common.min")}`}
                  </Text>
                </View>
                {canEdit ? (
                  <Switch
                    value={service.is_active}
                    onValueChange={() => toggleService(service)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.white}
                  />
                ) : (
                  <View
                    style={[
                      styles.statusPill,
                      service.is_active
                        ? styles.statusPillActive
                        : styles.statusPillHidden,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        service.is_active
                          ? styles.statusPillTextActive
                          : styles.statusPillTextHidden,
                      ]}
                    >
                      {service.is_active ? t("shop.active_label") : t("shop.hidden_label")}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Working hours */}
        <SectionHeader
          title={t("shop.shop_hours")}
          actionLabel={t("common.edit")}
          onAction={() =>
            router.push({
              pathname: "/owner/shop-hours",
              params: { shopId: String(selectedShop.id), name: selectedShop.name },
            })
          }
        />
        <Text style={styles.hoursHint}>
          {t("shop.hours_hint")}
        </Text>
        <View style={styles.groupCard}>
          {hours.map((day, index) => {
            const isToday = day.day_of_week === todayDayOfWeek;
            return (
              <View
                key={day.day_of_week}
                style={[styles.hoursRow, index > 0 && styles.groupDivider]}
              >
                <Text
                  style={[styles.hoursDay, isToday && styles.hoursDayToday]}
                >
                  {dayName(day.day_of_week)}
                </Text>
                <Text
                  style={[
                    styles.hoursValue,
                    isToday && styles.hoursDayToday,
                  ]}
                >
                  {day.is_closed
                    ? t("shop.closed")
                    : formatOpenRange(day.opens_at, day.closes_at)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Loyalty program */}
        <OwnerLoyaltySection
          shopId={selectedShop.id}
          onNotice={showNotice}
        />

        {/* Verification */}
        <SectionHeader title={t("shop.shop_verification")} />
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/owner/shop-verification",
              params: { shopId: String(selectedShop.id), name: selectedShop.name },
            })
          }
          style={({ pressed }) => [
            styles.groupCard,
            styles.groupRow,
            pressed && styles.groupRowPressed,
          ]}
        >
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {selectedShop.is_verified
                ? t("shop.verified_badge")
                : t("shop.request_verification")}
            </Text>
            <Text style={styles.serviceMeta} numberOfLines={1}>
              {selectedShop.is_verified
                ? t("shop.verified_badge_desc")
                : t("shop.request_verification_desc")}
            </Text>
          </View>
          <RTLIcon name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {canEdit ? (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerHint}>
              {t("shop.delete_description")}
            </Text>
            <Button
              title={confirming ? t("shop.confirm_delete", { count }) : t("shop.delete_shop")}
              variant="danger"
              loading={deleting}
              disabled={deleting}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
    </ShopCountryProvider>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
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
    paddingBottom: 98,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: 14,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipsScroll: {
    flexGrow: 0,
    marginEnd: -14,
  },
  addShopChip: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addShopChipPressed: {
    opacity: 0.8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    color: colors.muted,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  managerHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  dangerZone: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  dangerHint: {
    fontSize: 12,
    color: colors.muted,
  },
  inlineEmpty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inlineEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  inlineEmptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  groupRowPressed: {
    opacity: 0.8,
  },
  groupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  servicePrice: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillActive: {
    backgroundColor: "#dcfce7",
  },
  statusPillHidden: {
    backgroundColor: colors.border,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillTextActive: {
    color: colors.success,
  },
  statusPillTextHidden: {
    color: colors.muted,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  hoursDayToday: {
    color: colors.primaryDark,
  },
  hoursValue: {
    fontSize: 14,
    color: colors.muted,
  },
  hoursHint: {
    fontSize: 13,
    color: colors.muted,
  },
});
