import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { avatarColor } from "@/lib/avatar";
import { loadOwnerShops, type OwnerShop } from "@/lib/owner";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useFocusLoad } from "@/lib/useFocusLoad";

const STATUS_LABELS: Record<OwnerShop["status"], string> = {
  pending: t("owner.pending"),
  approved: t("owner.approved"),
  suspended: t("owner.suspended"),
};

const STATUS_TONES: Record<OwnerShop["status"], StatusTone> = {
  approved: "success",
  suspended: "danger",
  pending: "warning",
};

export function OwnerProfileSection() {
  const { user } = useUser();
  const router = useRouter();

  const { data: shops, loading, error } = useFocusLoad<OwnerShop[]>(
    async () => {
      if (!user?.id) {
        return [];
      }
      return loadOwnerShops(user.id);
    },
    [user?.id]
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t("owner.my_shops")}
        actionLabel={shops && shops.length > 0 ? t("owner.add") : undefined}
        onAction={() => router.push("/onboarding/owner-shop")}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : shops && shops.length === 0 ? (
        <View style={styles.card}>
          <AppText style={styles.emptyText}>
            {t("owner.no_shop_yet")}
          </AppText>
        </View>
      ) : (
        (shops ?? []).map((shop) => (
          <View key={shop.id} style={styles.shopRow}>
            {shop.logo_url ? (
              <Image
                source={{ uri: shop.logo_url }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.thumb,
                  styles.thumbFallback,
                  { backgroundColor: avatarColor(shop.name) },
                ]}
              >
                <AppText style={styles.thumbLetter}>
                  {shop.name.charAt(0).toUpperCase()}
                </AppText>
              </View>
            )}
            <View style={styles.shopInfo}>
              <AppText style={styles.shopName} numberOfLines={1}>
                {shop.name}
              </AppText>
              <AppText style={styles.shopMeta}>
                {shop.city ?? t("owner.no_city")} ·{" "}
                {shop.myRole === "owner" ? t("owner.owner") : t("owner.manager")}
              </AppText>
            </View>
            <StatusBadge
              label={STATUS_LABELS[shop.status]}
              tone={STATUS_TONES[shop.status]}
            />
          </View>
        ))
      )}
      {!!error && <AppText style={styles.error}>{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  loading: {
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  shopMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
