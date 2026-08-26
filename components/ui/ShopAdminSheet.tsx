import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DetailRow, DetailsCard } from "@/components/ui/DetailsCard";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import {
  type AdminShop,
  type ShopStatus,
  updateShopFields,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate, formatRating } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmAction } from "@/lib/useConfirmAction";
import type { NoticeTone } from "@/lib/useNotice";

type ShopAdminSheetProps = {
  shop: AdminShop;
  onClose: () => void;
  onUpdated: (shop: AdminShop) => void;
  onNotice: (message: string, tone: NoticeTone) => void;
};

const STATUS_LABELS: Record<ShopStatus, string> = {
  pending: t("status.pending"),
  approved: t("status.approved"),
  suspended: t("status.suspended"),
};

const STATUS_TONES: Record<ShopStatus, StatusTone> = {
  approved: "success",
  suspended: "danger",
  pending: "warning",
};

export function ShopAdminSheet({
  shop: initial,
  onClose,
  onUpdated,
  onNotice,
}: ShopAdminSheetProps) {
  const [shop, setShop] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const {
    confirming: confirmingSuspend,
    count: confirmCount,
    press: suspendPress,
  } = useConfirmAction(() => {
    void performUpdate({ status: "suspended" }, t("owner.shop_suspended"));
  });

  useEffect(() => {
    let cancelled = false;
    if (initial.created_by) {
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", initial.created_by)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled || error || !data) {
            return;
          }
          const name = [data.first_name ?? "", data.last_name ?? ""]
            .filter((part) => part.length > 0)
            .join(" ")
            .trim();
          setOwnerName(name || null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [initial.created_by]);

  async function performUpdate(
    patch: Parameters<typeof updateShopFields>[1],
    successMessage: string
  ) {
    setBusy(true);
    try {
      await updateShopFields(shop.id, patch);
      const updated = { ...shop, ...patch };
      setShop(updated);
      onUpdated(updated);
      onNotice(successMessage, "success");
    } catch (e) {
      onNotice(errorMessageFromUnknown(e), "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.header}>
        <Avatar fullName={shop.name} imageUrl={shop.logo_url} size={48} />
        <View style={styles.headerInfo}>
          <View style={styles.nameLine}>
            <AppText style={styles.name} numberOfLines={1}>
              {shop.name}
            </AppText>
            {shop.is_verified && <VerifiedIcon size={16} />}
            <View style={styles.badgeRow}>
              <StatusBadge
                label={STATUS_LABELS[shop.status]}
                tone={STATUS_TONES[shop.status]}
              />
              {!shop.is_active && <StatusBadge label={t("status.closed")} tone="danger" />}
            </View>
          </View>
          <AppText style={styles.slug} numberOfLines={1}>
            @{shop.slug}
          </AppText>
        </View>
      </View>

      <DetailsCard>
        {shop.city ? (
          <DetailRow
            label={t("shop.location")}
            value={[shop.address_line1, shop.city, shop.state].filter(Boolean).join(", ")}
          />
        ) : null}
        {shop.email ? (
          <DetailRow
            label={t("shop.email")}
            value={shop.email}
          />
        ) : null}
        {shop.phone ? (
          <DetailRow
            label={t("shop.phone")}
            value={shop.phone}
          />
        ) : null}
        <DetailRow
          label={t("shop.rating")}
          value={formatRating(shop.rating_avg, shop.rating_count, {
            fallback: t("owner.no_reviews_yet"),
          })}
        />
        <DetailRow label={t("owner.owner_label")} value={ownerName ?? "—"} />
        <DetailRow label={t("owner.registered")} value={formatDate(shop.created_at)} />
      </DetailsCard>

      <View style={styles.actions}>
        {shop.deleted_at ? (
          <Button
            title={t("owner.restore_shop")}
            variant="primary"
            loading={busy}
            disabled={busy}
            onPress={() =>
              void performUpdate(
                { status: "approved", is_active: true, deleted_at: null },
                t("owner.shop_approved")
              )
            }
          />
        ) : shop.status === "pending" ? (
          <Button
            title={t("owner.approve_shop")}
            variant="primary"
            loading={busy}
            disabled={busy}
            onPress={() => void performUpdate({ status: "approved" }, t("owner.shop_approved"))}
          />
        ) : shop.status === "approved" ? (
          <Button
            title={confirmingSuspend ? t("owner.confirm_suspend", { count: confirmCount }) : t("owner.suspend_shop")}
            variant={confirmingSuspend ? "danger" : "dangerOutline"}
            loading={busy}
            disabled={busy}
            onPress={suspendPress}
          />
        ) : (
          <Button
            title={t("owner.reactivate_shop")}
            variant="successOutline"
            loading={busy}
            disabled={busy}
            onPress={() =>
              void performUpdate(
                { status: "approved", deleted_at: null },
                t("owner.shop_reactivated")
              )
            }
          />
        )}

        <Button
          title={shop.is_verified ? t("owner.remove_verified") : t("owner.mark_verified")}
          variant={shop.is_verified ? "blueOutline" : "blue"}
          loading={busy}
          disabled={busy}
          onPress={() =>
            void performUpdate(
              { is_verified: !shop.is_verified },
              shop.is_verified ? t("owner.verified_badge_removed") : t("owner.shop_verified")
            )
          }
        />

        <Button
          title={shop.is_active ? t("owner.close_temporarily") : t("owner.reopen_business")}
          variant="outline"
          loading={busy}
          disabled={busy}
          onPress={() =>
            void performUpdate(
              { is_active: !shop.is_active },
              shop.is_active ? t("owner.shop_closed") : t("owner.shop_reopened")
            )
          }
        />

        <Button title={t("common.cancel")} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  slug: {
    fontSize: 13,
    color: colors.muted,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
