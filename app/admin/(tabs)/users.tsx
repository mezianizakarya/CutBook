import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { errorMessageFromUnknown } from "@/lib/errors";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: Role | null;
  account_status: "active" | "deleted";
  created_at: string | null;
};

type StatusFilter = "all" | "active" | "deleted";

const STATUS_FILTERS: StatusFilter[] = ["all", "active", "deleted"];

type RoleFilter = "all" | Role;

function fullName(row: ProfileRow): string {
  const name = [row.first_name ?? "", row.last_name ?? ""]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name || "—";
}

function useSheetDrag(onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 80) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return { translateY, panResponder };
}

export default function UsersScreen() {
  const { user } = useUser();
  const currentUserId = user?.id;

  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "danger" | "success" | "role";
  } | null>(null);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(message: string, tone: "danger" | "success" | "role") {
    setNotice({ message, tone });
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }
    noticeTimeout.current = setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, first_name, last_name, avatar_url, role, account_status, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      setError(errorMessageFromUnknown(error));
      setProfiles((previous) => previous ?? []);
      return;
    }
    setProfiles((data ?? []) as unknown as ProfileRow[]);
  }, []);

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

  const counts = useMemo(() => {
    const rows = profiles ?? [];
    return {
      all: rows.length,
      active: rows.filter((row) => row.account_status === "active").length,
      deleted: rows.filter((row) => row.account_status === "deleted").length,
    };
  }, [profiles]);

  const activeAdmins = useMemo(
    () =>
      (profiles ?? []).filter(
        (row) => row.account_status === "active" && row.role === "admin"
      ),
    [profiles]
  );

  const filtered = useMemo(() => {
    const rows = profiles ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.account_status !== statusFilter) {
        return false;
      }
      if (roleFilter !== "all" && row.role !== roleFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.email?.toLowerCase().includes(q) ||
        `${row.first_name ?? ""} ${row.last_name ?? ""}`.toLowerCase().includes(q)
      );
    });
  }, [profiles, query, statusFilter, roleFilter]);

  function isLastActiveAdmin(row: ProfileRow): boolean {
    return (
      row.account_status === "active" &&
      row.role === "admin" &&
      activeAdmins.length <= 1
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function performChangeRole(row: ProfileRow, role: Role) {
    try {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", row.id);
      if (error) {
        throw error;
      }
      setSelected((previous) =>
        previous && previous.id === row.id ? { ...previous, role } : previous
      );
      await load();
      showNotice(`${fullName(row)} is now ${ROLE_LABELS[role]}`, "role");
    } catch (e) {
      Alert.alert("Couldn't change role", errorMessageFromUnknown(e));
    }
  }

  function handleChangeRole(row: ProfileRow, role: Role) {
    if (row.role === role) {
      return;
    }
    if (row.id === currentUserId) {
      Alert.alert(
        "Can't change your own role",
        "Ask another admin to change your role so you don't lock yourself out."
      );
      return;
    }
    if (isLastActiveAdmin(row)) {
      Alert.alert(
        "Last active admin",
        "Promote another user to admin before changing this role."
      );
      return;
    }
    performChangeRole(row, role);
  }

  async function performSetDeleted(row: ProfileRow, deleted: boolean) {
    setRemoving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ deleted_at: deleted ? new Date().toISOString() : null })
        .eq("id", row.id);
      if (error) {
        throw error;
      }
      setSelected(null);
      await load();
      showNotice(
        deleted ? `${fullName(row)} deleted` : `${fullName(row)} restored`,
        deleted ? "danger" : "success"
      );
    } catch (e) {
      Alert.alert(
        deleted ? "Couldn't delete account" : "Couldn't restore account",
        errorMessageFromUnknown(e)
      );
    } finally {
      setRemoving(false);
    }
  }

  function handleDelete(row: ProfileRow) {
    if (row.id === currentUserId) {
      Alert.alert(
        "Can't delete yourself",
        "Use the Delete Account button on your profile screen instead."
      );
      return;
    }
    if (isLastActiveAdmin(row)) {
      Alert.alert(
        "Last active admin",
        "Promote another user to admin before deleting this account."
      );
      return;
    }
    performSetDeleted(row, true);
  }

  function handleRestore(row: ProfileRow) {
    performSetDeleted(row, false);
  }

  if (loading && !profiles) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>
          {counts.active} active · {counts.deleted} deleted
        </Text>
      </View>

      {notice ? (
        <View
          style={[
            styles.notice,
            notice.tone === "danger"
              ? styles.noticeDanger
              : notice.tone === "role"
                ? styles.noticeRole
                : styles.noticeSuccess,
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              notice.tone === "danger"
                ? styles.noticeTextDanger
                : notice.tone === "role"
                  ? styles.noticeTextRole
                  : styles.noticeTextSuccess,
            ]}
          >
            {notice.message}
          </Text>
        </View>
      ) : (
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chipsScroll, styles.chipsScrollFirst]}
        contentContainerStyle={styles.chipsRow}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {filter === "all" ? "All users" : filter === "active" ? "Active" : "Deleted"} (
                {counts[filter]})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {(["all", ...ROLES] as RoleFilter[]).map((role) => {
          const isActive = roleFilter === role;
          return (
            <Pressable
              key={role}
              onPress={() => setRoleFilter(isActive ? "all" : role)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {role === "all" ? "All roles" : ROLE_LABELS[role]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(row) => row.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or filter.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Avatar fullName={fullName(item)} imageUrl={item.avatar_url} size={44} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowName} numberOfLines={1}>
                {fullName(item)}
              </Text>
              <Text style={styles.rowEmail} numberOfLines={1}>
                {item.email ?? "No email"}
              </Text>
            </View>
            <View style={styles.rowBadges}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {item.role ? ROLE_LABELS[item.role] : "—"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.account_status === "deleted"
                    ? styles.statusBadgeDeleted
                    : styles.statusBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.account_status === "deleted"
                      ? styles.statusBadgeTextDeleted
                      : styles.statusBadgeTextActive,
                  ]}
                >
                  {item.account_status === "deleted" ? "Deleted" : "Active"}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {!!selected && (
          <ActionModal
            row={selected}
            isSelf={selected.id === currentUserId}
            isLastActiveAdmin={isLastActiveAdmin(selected)}
            removing={removing}
            onClose={() => setSelected(null)}
            onChangeRole={handleChangeRole}
            onDelete={handleDelete}
            onRestore={handleRestore}
          />
        )}
      </Modal>
    </Screen>
  );
}

type ActionModalProps = {
  row: ProfileRow;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  removing: boolean;
  onClose: () => void;
  onChangeRole: (row: ProfileRow, role: Role) => void;
  onDelete: (row: ProfileRow) => void;
  onRestore: (row: ProfileRow) => void;
};

function ActionModal({
  row,
  isSelf,
  isLastActiveAdmin,
  removing,
  onClose,
  onChangeRole,
  onDelete,
  onRestore,
}: ActionModalProps) {
  const deleted = row.account_status === "deleted";
  const [showingRoles, setShowingRoles] = useState(false);
  const [confirmingRole, setConfirmingRole] = useState<Role | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRestore, setConfirmingRestore] = useState(false);

  const { translateY, panResponder } = useSheetDrag(onClose);

  function handleRoleBadgePress() {
    if (showingRoles) {
      setShowingRoles(false);
      return;
    }
    if (isSelf) {
      Alert.alert(
        "Can't change your own role",
        "Ask another admin to change your role so you don't lock yourself out."
      );
      return;
    }
    setShowingRoles(true);
    setConfirmingDelete(false);
    setConfirmingRestore(false);
  }

  function handleDeletePress() {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      onDelete(row);
    } else {
      setConfirmingDelete(true);
    }
  }

  function handleRestorePress() {
    if (confirmingRestore) {
      setConfirmingRestore(false);
      onRestore(row);
    } else {
      setConfirmingRestore(true);
    }
  }

  return (
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable onPress={() => undefined}>
        <Animated.View
          style={[styles.modalCard, { transform: [{ translateY }] }]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Avatar fullName={fullName(row)} imageUrl={row.avatar_url} size={48} />
            <View style={styles.modalHeaderInfo}>
              <View style={styles.modalNameRow}>
                <Text style={styles.modalName} numberOfLines={1}>
                  {fullName(row)}
                </Text>
                <Pressable
                  onPress={handleRoleBadgePress}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.roleBadge,
                    pressed && styles.roleBadgePressed,
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {row.role ? ROLE_LABELS[row.role] : "—"}
                  </Text>
                </Pressable>
                <View
                  style={[
                    styles.statusBadge,
                    deleted ? styles.statusBadgeDeleted : styles.statusBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      deleted ? styles.statusBadgeTextDeleted : styles.statusBadgeTextActive,
                    ]}
                  >
                    {deleted ? "Deleted" : "Active"}
                  </Text>
                </View>
              </View>
              <Text style={styles.modalEmail} numberOfLines={1}>
                {row.email ?? "No email"}
              </Text>
            </View>
          </View>

          {showingRoles ? (
            <>
              <Text style={styles.rolePickerTitle}>Change role</Text>
              <View style={styles.roleChipsBleed}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.roleChipsScroll}
                contentContainerStyle={styles.chipsRow}
              >
                {[
                  ...(row.role ? [row.role] : []),
                  ...ROLES.filter((role) => role !== row.role),
                ].map((role) => {
                  const isCurrent = row.role === role;
                  const isSelected = confirmingRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => {
                        if (!isCurrent) {
                          setConfirmingRole(role);
                        }
                      }}
                      accessibilityRole="button"
                      style={[
                        styles.chip,
                        isCurrent && styles.chipRoleCurrent,
                        isSelected && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          isCurrent && styles.chipRoleCurrentLabel,
                          isSelected && styles.chipSelectedLabel,
                        ]}
                      >
                        {ROLE_LABELS[role]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              </View>
              {confirmingRole ? (
                <Button
                  title={`Change role to ${ROLE_LABELS[confirmingRole]}`}
                  onPress={() => {
                    onChangeRole(row, confirmingRole);
                    setConfirmingRole(null);
                  }}
                  style={[styles.modalActionSpacer, styles.changeRoleButton]}
                />
              ) : deleted ? (
                <Button
                  title={confirmingRestore ? "Confirm restore" : "Restore account"}
                  onPress={handleRestorePress}
                  variant={confirmingRestore ? "primary" : "successOutline"}
                  loading={removing}
                  disabled={removing}
                  style={[
                    styles.modalActionSpacer,
                    confirmingRestore && styles.confirmRestoreButton,
                  ]}
                />
              ) : (
                <Button
                  title={confirmingDelete ? "Confirm delete" : "Delete account"}
                  onPress={handleDeletePress}
                  variant={confirmingDelete ? "danger" : "dangerOutline"}
                  loading={removing}
                  disabled={removing || isSelf}
                  style={styles.modalActionSpacer}
                />
              )}
              <Button
                title="Cancel"
                onPress={() => {
                  if (confirmingRestore) {
                    setConfirmingRestore(false);
                    return;
                  }
                  if (confirmingDelete) {
                    setConfirmingDelete(false);
                    return;
                  }
                  if (confirmingRole) {
                    setConfirmingRole(null);
                    return;
                  }
                  onClose();
                }}
                variant="outline"
                style={styles.cancelButton}
              />
            </>
          ) : (
            <>
          {isLastActiveAdmin && !deleted && (
            <Text style={styles.modalHint}>
              This is the only active admin account on the platform.
            </Text>
          )}

          {deleted ? (
            <Button
              title={confirmingRestore ? "Confirm restore" : "Restore account"}
              onPress={handleRestorePress}
              variant={confirmingRestore ? "primary" : "successOutline"}
              loading={removing}
              disabled={removing}
              style={[
                styles.modalActionSpacer,
                confirmingRestore && styles.confirmRestoreButton,
              ]}
            />
          ) : (
            <Button
              title={confirmingDelete ? "Confirm delete" : "Delete account"}
              onPress={handleDeletePress}
              variant={confirmingDelete ? "danger" : "dangerOutline"}
              loading={removing}
              disabled={removing || isSelf}
              style={styles.modalActionSpacer}
            />
          )}

          <Button
            title="Cancel"
            onPress={() => {
              if (confirmingRestore) {
                setConfirmingRestore(false);
                return;
              }
              if (confirmingDelete) {
                setConfirmingDelete(false);
                return;
              }
              onClose();
            }}
            variant="outline"
            style={styles.cancelButton}
          />
            </>
          )}
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 0,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  notice: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  noticeSuccess: {
    backgroundColor: "#dcfce7",
    borderColor: colors.success,
  },
  noticeDanger: {
    backgroundColor: "#fee2e2",
    borderColor: colors.danger,
  },
  noticeRole: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDark,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeTextSuccess: {
    color: colors.success,
  },
  noticeTextDanger: {
    color: colors.danger,
  },
  noticeTextRole: {
    color: colors.primaryDark,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
    marginLeft: 0,
    marginRight: -14,
  },
  chipsScrollFirst: {
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: 6,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipLabelActive: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: 90,
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
  rowEmail: {
    fontSize: 13,
    color: colors.muted,
  },
  rowBadges: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  roleBadge: {
    backgroundColor: "#fef3c7",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
  roleBadgePressed: {
    opacity: 0.7,
  },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dragHandleArea: {
    alignSelf: "center",
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  modalHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  modalNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  modalEmail: {
    fontSize: 13,
    color: colors.muted,
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
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeTextActive: {
    color: colors.success,
  },
  statusBadgeDeleted: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeTextDeleted: {
    color: colors.danger,
  },
  modalHint: {
    fontSize: 12,
    color: colors.muted,
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
  changeRoleButton: {
    backgroundColor: colors.primaryDark,
  },
  confirmRestoreButton: {
    backgroundColor: colors.success,
  },
  modalActionSpacer: {
    marginBottom: -spacing.sm,
  },
  rolePickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  roleChipsBleed: {
    marginRight: -14,
  },
  roleChipsScroll: {
    flexGrow: 0,
  },
  chipRoleCurrent: {
    backgroundColor: "#fef3c7",
    borderColor: "#b45309",
  },
  chipRoleCurrentLabel: {
    color: "#b45309",
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDark,
  },
  chipSelectedLabel: {
    color: colors.primaryDark,
  },
});
