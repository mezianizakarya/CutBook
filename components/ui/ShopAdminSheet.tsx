import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

const STATUS_TONES: Record<ShopStatus, StatusTone> = {
  approved: "success",
  suspended: "danger",
  pending: "warning",
};

function CopyPill({ copied }: { copied: boolean }) {
  return (
    <Text style={[styles.copyPill, copied ? styles.copyPillCopied : null]}>
      {copied ? "Copied" : "Copy"}
    </Text>
  );
}

export function ShopAdminSheet({
  shop: initial,
  onClose,
  onUpdated,
  onNotice,
}: ShopAdminSheetProps) {
  const [shop, setShop] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const {
    confirming: confirmingSuspend,
    count: confirmCount,
    press: suspendPress,
  } = useConfirmAction(() => {
    void performUpdate({ status: "suspended" }, "Shop suspended");
  });
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, []);

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

  async function copyToClipboard(value: string, field: "email" | "phone") {
    if (!value) {
      return;
    }
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    if (copyTimeout.current) {
      clearTimeout(copyTimeout.current);
    }
    copyTimeout.current = setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.header}>
        <Avatar fullName={shop.name} imageUrl={shop.logo_url} size={48} />
        <View style={styles.headerInfo}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.is_verified && <VerifiedIcon size={16} />}
            <View style={styles.badgeRow}>
              <StatusBadge
                label={STATUS_LABELS[shop.status]}
                tone={STATUS_TONES[shop.status]}
              />
              {!shop.is_active && <StatusBadge label="Closed" tone="danger" />}
            </View>
          </View>
          <Text style={styles.slug} numberOfLines={1}>
            @{shop.slug}
          </Text>
        </View>
      </View>

      <DetailsCard>
        {shop.city ? (
          <DetailRow
            label="Location"
            value={[shop.address_line1, shop.city, shop.state].filter(Boolean).join(", ")}
          />
        ) : null}
        {shop.email ? (
          <DetailRow
            label="Email"
            value={shop.email}
            onPress={() => copyToClipboard(shop.email ?? "", "email")}
            action={<CopyPill copied={copiedField === "email"} />}
          />
        ) : null}
        {shop.phone ? (
          <DetailRow
            label="Phone"
            value={shop.phone}
            onPress={() => copyToClipboard(shop.phone ?? "", "phone")}
            action={<CopyPill copied={copiedField === "phone"} />}
          />
        ) : null}
        <DetailRow
          label="Rating"
          value={formatRating(shop.rating_avg, shop.rating_count, {
            fallback: "No reviews yet",
          })}
        />
        <DetailRow label="Owner" value={ownerName ?? "—"} />
        <DetailRow label="Registered" value={formatDate(shop.created_at)} />
      </DetailsCard>

      {shop.deleted_at ? (
        <Button
          title="Restore shop"
          variant="primary"
          loading={busy}
          disabled={busy}
          onPress={() =>
            void performUpdate(
              { status: "approved", is_active: true, deleted_at: null },
              "Shop restored"
            )
          }
        />
      ) : shop.status === "pending" ? (
        <Button
          title="Approve shop"
          variant="primary"
          loading={busy}
          disabled={busy}
          onPress={() => void performUpdate({ status: "approved" }, "Shop approved")}
        />
      ) : shop.status === "approved" ? (
        <Button
          title={confirmingSuspend ? `Confirm suspend (${confirmCount})` : "Suspend shop"}
          variant={confirmingSuspend ? "danger" : "dangerOutline"}
          loading={busy}
          disabled={busy}
          onPress={suspendPress}
        />
      ) : (
        <Button
          title="Reactivate shop"
          variant="successOutline"
          loading={busy}
          disabled={busy}
          onPress={() =>
            void performUpdate(
              { status: "approved", deleted_at: null },
              "Shop reactivated"
            )
          }
        />
      )}

      <Button
        title={shop.is_verified ? "Remove verified badge" : "Mark as verified"}
        variant={shop.is_verified ? "blueOutline" : "blue"}
        loading={busy}
        disabled={busy}
        onPress={() =>
          void performUpdate(
            { is_verified: !shop.is_verified },
            shop.is_verified ? "Verified badge removed" : "Shop marked as verified"
          )
        }
      />

      <Button
        title={shop.is_active ? "Close temporarily" : "Reopen for business"}
        variant="outline"
        loading={busy}
        disabled={busy}
        onPress={() =>
          void performUpdate(
            { is_active: !shop.is_active },
            shop.is_active ? "Shop closed temporarily" : "Shop reopened"
          )
        }
      />

      <Button title="Cancel" variant="ghost" onPress={onClose} />
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
  copyPill: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  copyPillCopied: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
});
