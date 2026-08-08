import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import type { AdminShop, ShopStatus } from "@/lib/admin";
import { updateShopFields } from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";

type Tone = "danger" | "success" | "role";

type ShopAdminSheetProps = {
  shop: AdminShop;
  onClose: () => void;
  onUpdated: (shop: AdminShop) => void;
  onNotice: (message: string, tone: Tone) => void;
};

const STATUS_LABELS: Record<ShopStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

function formatRating(shop: AdminShop): string {
  if (shop.rating_count == null || shop.rating_count === 0) {
    return "No reviews yet";
  }
  return `${Number(shop.rating_avg ?? 0).toFixed(1)} (${shop.rating_count})`;
}

export function ShopAdminSheet({
  shop: initial,
  onClose,
  onUpdated,
  onNotice,
}: ShopAdminSheetProps) {
  const [shop, setShop] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [confirmCount, setConfirmCount] = useState(5);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(5);
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
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, []);

  function cancelCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function startCountdown() {
    countRef.current = 5;
    setConfirmCount(5);
    cancelCountdown();
    countdownRef.current = setInterval(() => {
      countRef.current -= 1;
      setConfirmCount(countRef.current);
      if (countRef.current <= 0) {
        cancelCountdown();
        setConfirmingSuspend(false);
      }
    }, 1000);
  }

  function handleSuspendPress() {
    if (confirmingSuspend) {
      setConfirmingSuspend(false);
      cancelCountdown();
      void performUpdate({ status: "suspended" }, "Shop suspended");
    } else {
      setConfirmingSuspend(true);
      startCountdown();
    }
  }

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
          <Text style={styles.name} numberOfLines={1}>
            {shop.name}
          </Text>
          <Text style={styles.slug} numberOfLines={1}>
            @{shop.slug}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                shop.status === "approved"
                  ? styles.statusApproved
                  : shop.status === "suspended"
                    ? styles.statusSuspended
                    : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  shop.status === "approved"
                    ? styles.statusTextApproved
                    : shop.status === "suspended"
                      ? styles.statusTextSuspended
                      : styles.statusTextPending,
                ]}
              >
                {STATUS_LABELS[shop.status]}
              </Text>
            </View>
            {shop.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primaryDark} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
            {!shop.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Closed</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.detailsCard}>
        {shop.city ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {[shop.address_line1, shop.city, shop.state].filter(Boolean).join(", ")}
            </Text>
          </View>
        ) : null}
        {shop.email ? (
          <Pressable
            onPress={() => copyToClipboard(shop.email ?? "", "email")}
            style={styles.detailRow}
          >
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {shop.email}
            </Text>
            {copiedField === "email" ? (
              <Text style={styles.copiedText}>Copied</Text>
            ) : (
              <Text style={styles.copyHint}>Copy</Text>
            )}
          </Pressable>
        ) : null}
        {shop.phone ? (
          <Pressable
            onPress={() => copyToClipboard(shop.phone ?? "", "phone")}
            style={styles.detailRow}
          >
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {shop.phone}
            </Text>
            {copiedField === "phone" ? (
              <Text style={styles.copiedText}>Copied</Text>
            ) : (
              <Text style={styles.copyHint}>Copy</Text>
            )}
          </Pressable>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rating</Text>
          <Text style={styles.detailValue}>{formatRating(shop)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Owner</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {ownerName ?? "—"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Registered</Text>
          <Text style={styles.detailValue}>{formatDate(shop.created_at)}</Text>
        </View>
      </View>

      {shop.status === "pending" ? (
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
          onPress={handleSuspendPress}
        />
      ) : (
        <Button
          title="Reactivate shop"
          variant="successOutline"
          loading={busy}
          disabled={busy}
          onPress={() => void performUpdate({ status: "approved" }, "Shop reactivated")}
        />
      )}

      <Button
        title={shop.is_verified ? "Remove verified badge" : "Mark as verified"}
        variant="outline"
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
  },
  slug: {
    fontSize: 13,
    color: colors.muted,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusApproved: {
    backgroundColor: "#dcfce7",
  },
  statusTextApproved: {
    color: colors.success,
  },
  statusSuspended: {
    backgroundColor: "#fee2e2",
  },
  statusTextSuspended: {
    color: colors.danger,
  },
  statusPending: {
    backgroundColor: "#fef3c7",
  },
  statusTextPending: {
    color: "#b45309",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  inactiveBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "#fee2e2",
  },
  inactiveBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
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
  detailLabel: {
    width: 90,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  copiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  copyHint: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    overflow: "hidden",
  },
});
