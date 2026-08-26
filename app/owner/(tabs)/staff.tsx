import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { t } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { RTLIcon } from "@/components/ui/RTLIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    (shopId: number) => shops.find((shop) => shop.id === shopId)?.name ?? t("shop.name"),
    [shops]
  );

  const visibleInvitations = useMemo(
    () =>
      invitations.filter(
        (invite) =>
          invitationStatus(invite) === "active" &&
          (shopFilter === "all" || invite.shop_id === shopFilter)
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
      Alert.alert(t("staff.could_not_create_invitation"), errorMessageFromUnknown(e));
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

  function handleRevoke(invitation: ShopInvitation) {
    Alert.alert(
      t("staff.revoke_title"),
      t("staff.revoke_message", { code: invitation.code }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("staff.revoke"),
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await revokeShopInvitation(invitation.id);
              setInvitations((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
              );
              showNotice(t("staff.invitation_revoked"), "danger");
            } catch (e) {
              Alert.alert(t("staff.could_not_revoke"), errorMessageFromUnknown(e));
            }
          },
        },
      ]
    );
  }

  function handleRemove(member: OwnerStaffRow) {
    Alert.alert(
      t("staff.remove_title"),
      t("staff.remove_message", { name: member.display_name || t("roles.barber"), shopName: shopName(member.shop_id) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("staff.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeStaffMember(member.id);
              setStaff((prev) => prev.filter((row) => row.id !== member.id));
              setSelectedStaff(null);
              showNotice(t("staff.barber_removed"), "danger");
            } catch (e) {
              Alert.alert(t("staff.could_not_remove"), errorMessageFromUnknown(e));
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
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      </Screen>
    );
  }

  if (shops.length === 0) {
    return (
      <Screen scroll style={styles.screenPadding}>
        <EmptyState
          title={t("owner.no_shop_title")}
          subtitle={t("staff.shop_empty_description")}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t("tabs.staff")}</AppText>
        <AppText style={styles.subtitle}>
          {t("staff.owner_subtitle")}
        </AppText>
      </View>

      {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

      {!!error && <AppText style={styles.errorText}>{error}</AppText>}

      <FlatList
        style={styles.list}
        data={visibleStaff}
        keyExtractor={(member) => String(member.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {shops.length > 1 && (
                <FilterChip
                  label={t("staff.all_shops")}
                  selected={shopFilter === "all"}
                  onPress={() => setShopFilter("all")}
                />
              )}
              {shops.map((shop) => (
                <FilterChip
                  key={shop.id}
                  label={shop.name}
                  selected={shopFilter === shop.id}
                  onPress={() => setShopFilter(shop.id)}
                />
              ))}
            </ScrollView>

            <SectionHeader title={t("staff.invitations")} />
            {visibleInvitations.length === 0 ? (
              <View style={styles.inviteEmpty}>
                <AppText style={styles.inviteEmptyTitle}>{t("staff.no_invitations")}</AppText>
                <AppText style={styles.inviteEmptySubtitle}>
                  {t("staff.invite_description")}
                </AppText>
              </View>
            ) : (
              visibleInvitations.map((invite) => {
                const status = invitationStatus(invite);
                return (
                  <View key={invite.id} style={styles.inviteRow}>
                    <View style={styles.inviteInfo}>
                      <AppText style={styles.inviteCode}>{invite.code}</AppText>
                      <AppText style={styles.inviteMeta}>
                        {shopName(invite.shop_id)} · {inviteStatusLabel(status, invite)}
                      </AppText>
                    </View>
                    {status === "active" ? (
                      <View style={styles.inviteActions}>
                        <Pressable
                          onPress={() => handleRevoke(invite)}
                          hitSlop={8}
                          style={styles.revokeButton}
                          accessibilityRole="button"
                        >
                          <AppText style={styles.revokeButtonText}>{t("staff.revoke")}</AppText>
                        </Pressable>
                      </View>
                    ) : (
                      <StatusBadge
                        label={inviteStatusLabel(status, invite)}
                        tone={
                          status === "used"
                            ? "success"
                            : status === "revoked"
                              ? "danger"
                              : "warning"
                        }
                      />
                    )}
                  </View>
                );
              })
            )}

            <Button
              title={generating ? t("staff.creating") : t("staff.invite_barber")}
              onPress={handleInvitePress}
              variant="outline"
              loading={generating}
              disabled={generating}
            />

            <SectionHeader title={t("tabs.staff")} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.inviteEmpty}>
            <AppText style={styles.inviteEmptyTitle}>{t("staff.no_staff")}</AppText>
            <AppText style={styles.inviteEmptySubtitle}>
              {t("staff.staff_empty_description")}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedStaff(item)}
            style={({ pressed }) => [styles.staffRow, pressed && styles.staffRowPressed]}
          >
            <Avatar fullName={item.display_name} imageUrl={item.avatar_url} size={44} />
            <View style={styles.staffInfo}>
              <AppText style={styles.staffName} numberOfLines={1}>
                {item.display_name || t("staff.unnamed")}
              </AppText>
              <AppText style={styles.staffMeta} numberOfLines={1}>
                {memberRoleLabel(item.member_role)} · {shopName(item.shop_id)}
              </AppText>
            </View>
            <RTLIcon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
      />

      <BottomSheet
        visible={pickShop}
        onClose={() => setPickShop(false)}
      >
        <AppText style={styles.sheetTitle}>{t("staff.invite_a_barber")}</AppText>
        <AppText style={styles.sheetText}>{t("staff.which_shop")}</AppText>
        {shops.map((shop) => (
          <Pressable
            key={shop.id}
            onPress={() => {
              setPickShop(false);
              void handleGenerate(shop);
            }}
            style={({ pressed }) => [styles.shopOption, pressed && styles.shopOptionPressed]}
          >
            <AppText style={styles.shopOptionText}>{shop.name}</AppText>
            <RTLIcon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={generated !== null}
        onClose={() => setGenerated(null)}
      >
        <AppText style={styles.sheetTitle}>{t("staff.barber_invitation")}</AppText>
        {generated ? (
          <>
            <AppText style={styles.sheetText}>
              {t("staff.share_code_description", { date: formatDate(generated.expires_at) })}
            </AppText>
            <View style={styles.codeBox}>
              <AppText style={styles.codeText}>{generated.code}</AppText>
            </View>
            <View style={styles.sheetActions}>
              <Button title={t("common.done")} onPress={() => setGenerated(null)} />
            </View>
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
                <AppText style={styles.staffName} numberOfLines={1}>
                  {selectedStaff.display_name || t("staff.unnamed")}
                </AppText>
                <AppText style={styles.staffMeta} numberOfLines={1}>
                  {memberRoleLabel(selectedStaff.member_role)} ·{" "}
                  {shopName(selectedStaff.shop_id)}
                </AppText>
                {!!selectedStaff.joined_at && (
                  <AppText style={styles.staffMeta}>
                    {t("staff.joined_date", { date: formatDate(selectedStaff.joined_at) })}
                  </AppText>
                )}
              </View>
            </View>
            {selectedStaff.member_role === "barber" ? (
              <Button
                title={t("staff.remove_from_shop")}
                variant="dangerOutline"
                onPress={() => handleRemove(selectedStaff)}
              />
            ) : (
              <AppText style={styles.sheetText}>
                {t("staff.owners_managers_removal")}
              </AppText>
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
      return t("staff.status_active");
    case "used":
      return t("staff.status_used");
    case "expired":
      return t("staff.status_expired", { date: formatDate(invite.expires_at) });
    case "revoked":
      return t("staff.status_revoked");
  }
}

function memberRoleLabel(role: OwnerStaffRow["member_role"]): string {
  if (role === "owner") {
    return t("owner.owner");
  }
  if (role === "manager") {
    return t("owner.manager");
  }
  return t("roles.barber");
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: 98,
  },
  listHeader: {
    gap: spacing.md,
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
  revokeButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
  },
  revokeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
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
  codeText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 3,
  },
  generating: {
    paddingVertical: spacing.lg,
  },
  sheetActions: {
    gap: spacing.sm,
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
