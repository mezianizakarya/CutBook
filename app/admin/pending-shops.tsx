import { RTLIcon } from "@/components/ui/RTLIcon";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShopAdminSheet } from "@/components/ui/ShopAdminSheet";
import {
  loadAdminShops,
  updateShopFields,
  type AdminShop,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

export default function PendingShopsScreen() {
  const router = useRouter();
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminShop | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const rows = await loadAdminShops("pending");
    setShops(rows);
  }, []);

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

  async function quickApprove(shop: AdminShop) {
    setApprovingId(shop.id);
    try {
      await updateShopFields(shop.id, { status: "approved" });
      setShops((previous) => previous.filter((row) => row.id !== shop.id));
      setSelected((previous) =>
        previous && previous.id === shop.id
          ? { ...previous, status: "approved" }
          : previous
      );
      showNotice(t("admin.shop_approved_named", { name: shop.name }), "success");
    } catch (e) {
      showNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setApprovingId(null);
    }
  }

  function handleUpdated(updated: AdminShop) {
    setSelected(updated);
    if (updated.status !== "pending") {
      setShops((previous) => previous.filter((row) => row.id !== updated.id));
    }
  }

  if (loading && shops.length === 0) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={14}>
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
          >
            <RTLIcon name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("admin.pending_approvals")}</Text>
        </View>
        <Text style={styles.subtitle}>
          {t("admin.shops_waiting_approval")}
        </Text>

        {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <SectionHeader
          title={t("admin.shops_title")}
          actionLabel={shops.length > 0 ? t("admin.waiting_count", { count: shops.length }) : undefined}
        />
        {shops.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t("admin.nothing_to_review")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("admin.no_shops_waiting")}
            </Text>
          </View>
        ) : (
          shops.map((shop) => (
            <Pressable
              key={shop.id}
              onPress={() => setSelected(shop)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Avatar fullName={shop.name} imageUrl={shop.logo_url} size={44} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {shop.city ?? t("owner.no_city")} · {formatDate(shop.created_at)}
                </Text>
              </View>
              <Button
                title={t("admin.approve")}
                variant="successOutline"
                loading={approvingId === shop.id}
                disabled={approvingId !== null}
                onPress={() => void quickApprove(shop)}
                style={styles.approveButton}
              />
            </Pressable>
          ))
        )}
      </ScrollView>

      {!!selected && (
        <ShopAdminSheet
          key={selected.id}
          shop={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onNotice={showNotice}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 32,
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
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  notice: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  approveButton: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
});
