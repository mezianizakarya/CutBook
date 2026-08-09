import { useUser } from "@clerk/expo";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import {
  createShopInvitation,
  invitationStatus,
  loadShopInvitations,
  revokeShopInvitation,
  type InvitationStatus,
  type ShopInvitation,
} from "@/lib/invitations";
import {
  loadOwnerShops,
  loadShopStaff,
  removeStaffMember,
  type OwnerShop,
  type OwnerStaffRow,
} from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

export default function OwnerStaffScreen() {
  const { user } = useUser();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [staff, setStaff] = useState<OwnerStaffRow[]>([]);
  const [invitations, setInvitations] = useState<ShopInvitation[]>([]);
  const [shopFilter, setShopFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickShop, setPickShop] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ShopInvitation | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OwnerStaffRow | null>(null);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setShops([]);
      setStaff([]);
      setInvitations([]);
      return;
    }
    const owned = await loadOwnerShops(user.id);
    setShops(owned);
    if (owned.length === 0) {
      setStaff([]);
      setInvitations([]);
      return;
    }
    const ids = owned.map((shop) => shop.id);
    const [rows, invites] = await Promise.all([
      loadShopStaff(ids),
      loadShopInvitations(ids),
    ]);
    setStaff(rows);
    setInvitations(invites);
  }, [user?.id]);

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

  const shopName = useCallback(
    (shopId: number) => shops.find((shop) => shop.id === shopId)?.name ?? "Shop",
    [shops]
  );

  const visibleInvitations = useMemo(
    () =>
      invitations.filter(
        (invite) => shopFilter === "all" || invite.shop_id === shopFilter
      ),
    [invitations, shopFilter]
  );

  const visibleStaff = useMemo(
    () => staff.filter((member) => shopFilter === "all" || member.shop_id === shopFilter),
    [staff, shopFilter]
  );

  async function handleGenerate(shop: OwnerShop) {
    setGenerating(true);
    setError(null);
    try {
      const invitation = await createShopInvitation(shop.id);
      setInvitations((prev) => [invitation, ...prev]);
      setGenerated(invitation);
    } catch (e) {
      Alert.alert("Could not create invitation", errorMessageFromUnknown(e));
    } finally {
      setGenerating(false);
    }
  }

  function handleInvitePress() {
    if (shops.length <= 1) {
      void handleGenerate(shops[0]);
    } else {
      setPickShop(true);
    }
  }

  async function handleCopy(code: string) {
    await Clipboard.setStringAsync(code);
    showNotice(`Code ${code} copied`, "success");
  }

  function handleRevoke(invitation: ShopInvitation) {
    Alert.alert(
      "Revoke invitation?",
      `"${invitation.code}" will stop working immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await revokeShopInvitation(invitation.id);
              setInvitations((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
              );
              showNotice("Invitation revoked", "danger");
            } catch (e) {
              Alert.alert("Could not revoke", errorMessageFromUnknown(e));
            }
          },
        },
      ]
    );
  }

  function handleRemove(member: OwnerStaffRow) {
    Alert.alert(
      "Remove from shop?",
      `${member.display_name || "This barber"} will lose access to ${shopName(member.shop_id)} and its schedule.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeStaffMember(member.id);
              setStaff((prev) => prev.filter((row) => row.id !== member.id));
              setSelectedStaff(null);
              showNotice("Barber removed", "danger");
            } catch (e) {
              Alert.alert("Could not remove", errorMessageFromUnknown(e));
            }
          },
        },
      ]
    );
  }

  if (loading && !staff.length) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error && !staff.length) {
    return (
      <Screen centered>
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (shops.length === 0) {
    return (
      <Screen scroll style={styles.screenPadding}>
        <EmptyState
          title="You don't manage a shop yet"
          subtitle="Staff and invitations will appear here once you own or manage a shop."
        />
      </Screen>
    );
  }

  return (
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
          <Text style={styles.title}>Staff</Text>
          <Text style={styles.subtitle}>
            Invite barbers with one-time codes and manage your team.
          </Text>
        </View>

        {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <FilterChip
            label={shops.length > 1 ? "All shops" : shops[0]?.name ?? "Shop"}
            selected={shopFilter === "all"}
            onPress={() => setShopFilter("all")}
          />
          {shops.map((shop) => (
            <FilterChip
              key={shop.id}
              label={shop.name}
              selected={shopFilter === shop.id}
              onPress={() => setShopFilter(shop.id)}
            />
          ))}
        </ScrollView>

        <SectionHeader title="Invitations" />
        {visibleInvitations.length === 0 ? (
          <View style={styles.inviteEmpty}>
            <Text style={styles.inviteEmptyTitle}>No invitations yet</Text>
            <Text style={styles.inviteEmptySubtitle}>
              Generate a code and share it privately with a barber. Each code
              works once and expires in 7 days.
            </Text>
          </View>
        ) : (
          visibleInvitations.map((invite) => {
            const status = invitationStatus(invite);
            return (
              <View key={invite.id} style={styles.inviteRow}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteCode}>{invite.code}</Text>
                  <Text style={styles.inviteMeta}>
                    {shopName(invite.shop_id)} · {inviteStatusLabel(status, invite)}
                  </Text>
                </View>
                {status === "active" ? (
                  <View style={styles.inviteActions}>
                    <Pressable
                      onPress={() => void handleCopy(invite.code)}
                      hitSlop={8}
                      style={styles.iconButton}
                      accessibilityRole="button"
                    >
                      <Text style={styles.iconButtonText}>Copy</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRevoke(invite)}
                      hitSlop={8}
                      style={styles.revokeButton}
                      accessibilityRole="button"
                    >
                      <Text style={styles.revokeButtonText}>Revoke</Text>
                    </Pressable>
                  </View>
                ) : (
                  <StatusBadge status={status} />
                )}
              </View>
            );
          })
        )}

        <Button
          title={generating ? "Creating…" : "Invite barber"}
          onPress={handleInvitePress}
          variant="outline"
          loading={generating}
          disabled={generating}
        />

        <SectionHeader title="Staff" />
        {visibleStaff.length === 0 ? (
          <View style={styles.inviteEmpty}>
            <Text style={styles.inviteEmptyTitle}>No staff yet</Text>
            <Text style={styles.inviteEmptySubtitle}>
              Once a barber redeems an invitation, they&apos;ll appear here.
            </Text>
          </View>
        ) : (
          visibleStaff.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => setSelectedStaff(member)}
              style={({ pressed }) => [styles.staffRow, pressed && styles.staffRowPressed]}
            >
              <Avatar fullName={member.display_name} imageUrl={member.avatar_url} size={44} />
              <View style={styles.staffInfo}>
                <Text style={styles.staffName} numberOfLines={1}>
                  {member.display_name || "Unnamed"}
                </Text>
                <Text style={styles.staffMeta} numberOfLines={1}>
                  {memberRoleLabel(member.member_role)} · {shopName(member.shop_id)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <BottomSheet
        visible={pickShop}
        onClose={() => setPickShop(false)}
      >
        <Text style={styles.sheetTitle}>Invite a barber</Text>
        <Text style={styles.sheetText}>Which shop is the barber joining?</Text>
        {shops.map((shop) => (
          <Pressable
            key={shop.id}
            onPress={() => {
              setPickShop(false);
              void handleGenerate(shop);
            }}
            style={({ pressed }) => [styles.shopOption, pressed && styles.shopOptionPressed]}
          >
            <Text style={styles.shopOptionText}>{shop.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={generated !== null}
        onClose={() => setGenerated(null)}
      >
        <Text style={styles.sheetTitle}>Barber invitation</Text>
        {generated ? (
          <>
            <Text style={styles.sheetText}>
              Share this code privately with the barber. It works once and
              expires on {formatDate(generated.expires_at)}.
            </Text>
            <Pressable
              onPress={() => void handleCopy(generated.code)}
              style={({ pressed }) => [styles.codeBox, pressed && styles.codeBoxPressed]}
            >
              <Text style={styles.codeText}>{generated.code}</Text>
            </Pressable>
            <Button
              title="Copy code"
              onPress={() => void handleCopy(generated.code)}
              variant="outline"
            />
            <Button title="Done" onPress={() => setGenerated(null)} />
          </>
        ) : (
          <ActivityIndicator color={colors.primary} style={styles.generating} />
        )}
      </BottomSheet>

      <BottomSheet
        visible={selectedStaff !== null}
        onClose={() => setSelectedStaff(null)}
      >
        {selectedStaff ? (
          <>
            <View style={styles.staffSheetHeader}>
              <Avatar
                fullName={selectedStaff.display_name}
                imageUrl={selectedStaff.avatar_url}
                size={52}
              />
              <View style={styles.staffSheetInfo}>
                <Text style={styles.staffName} numberOfLines={1}>
                  {selectedStaff.display_name || "Unnamed"}
                </Text>
                <Text style={styles.staffMeta} numberOfLines={1}>
                  {memberRoleLabel(selectedStaff.member_role)} ·{" "}
                  {shopName(selectedStaff.shop_id)}
                </Text>
                {!!selectedStaff.joined_at && (
                  <Text style={styles.staffMeta}>
                    Joined {formatDate(selectedStaff.joined_at)}
                  </Text>
                )}
              </View>
            </View>
            {selectedStaff.member_role === "barber" ? (
              <Button
                title="Remove from shop"
                variant="dangerOutline"
                onPress={() => handleRemove(selectedStaff)}
              />
            ) : (
              <Text style={styles.sheetText}>
                Owners and managers can only be removed by a CutBook admin.
              </Text>
            )}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function inviteStatusLabel(
  status: InvitationStatus,
  invite: ShopInvitation
): string {
  switch (status) {
    case "active":
      return "Active";
    case "used":
      return "Used";
    case "expired":
      return `Expired ${formatDate(invite.expires_at)}`;
    case "revoked":
      return "Revoked";
  }
}

function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <View
      style={[
        styles.badge,
        status === "used"
          ? styles.badgeUsed
          : status === "revoked"
            ? styles.badgeDanger
            : styles.badgeMuted,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          status === "used"
            ? styles.badgeTextUsed
            : status === "revoked"
              ? styles.badgeTextDanger
              : styles.badgeTextMuted,
        ]}
      >
        {status === "used"
          ? "Used"
          : status === "revoked"
            ? "Revoked"
            : "Expired"}
      </Text>
    </View>
  );
}

function memberRoleLabel(role: OwnerStaffRow["member_role"]): string {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "manager") {
    return "Manager";
  }
  return "Barber";
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
  inviteEmpty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inviteEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  inviteEmptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1.5,
  },
  inviteMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  iconButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  revokeButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#fee2e2",
  },
  revokeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeUsed: {
    backgroundColor: "#dcfce7",
  },
  badgeDanger: {
    backgroundColor: "#fee2e2",
  },
  badgeMuted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextUsed: {
    color: colors.success,
  },
  badgeTextDanger: {
    color: colors.danger,
  },
  badgeTextMuted: {
    color: colors.muted,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  staffRowPressed: {
    opacity: 0.8,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  staffMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.muted,
    fontWeight: "400",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sheetText: {
    fontSize: 14,
    color: colors.muted,
  },
  shopOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  shopOptionPressed: {
    opacity: 0.7,
  },
  shopOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  codeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  codeBoxPressed: {
    opacity: 0.8,
  },
  codeText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 3,
  },
  generating: {
    paddingVertical: spacing.lg,
  },
  staffSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  staffSheetInfo: {
    flex: 1,
  },
});
