import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
  const [busyRole, setBusyRole] = useState<Role | null>(null);
  const [removing, setRemoving] = useState(false);

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
    setBusyRole(role);
    try {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", row.id);
      if (error) {
        throw error;
      }
      setSelected(null);
      await load();
    } catch (e) {
      Alert.alert("Couldn't change role", errorMessageFromUnknown(e));
    } finally {
      setBusyRole(null);
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
    Alert.alert(
      "Change role",
      `Set ${fullName(row)}'s role to ${ROLE_LABELS[role]}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Change", style: "destructive", onPress: () => performChangeRole(row, role) },
      ]
    );
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
    Alert.alert(
      "Delete account",
      `${fullName(row)} will be marked as deleted. Their booking and review history is kept. This can be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => performSetDeleted(row, true) },
      ]
    );
  }

  function handleRestore(row: ProfileRow) {
    Alert.alert(
      "Restore account",
      `Reactivate ${fullName(row)}'s account?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => performSetDeleted(row, false) },
      ]
    );
  }

  if (loading && !profiles) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>
          {counts.active} active · {counts.deleted} deleted
        </Text>
      </View>

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

      <View style={styles.chips}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {filter === "all" ? "All" : filter === "active" ? "Active" : "Deleted"} (
                {counts[filter]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chips}>
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
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(row) => row.id}
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
              {item.account_status === "deleted" && (
                <View style={styles.deletedBadge}>
                  <Text style={styles.deletedBadgeText}>Deleted</Text>
                </View>
              )}
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
            busyRole={busyRole}
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
  busyRole: Role | null;
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
  busyRole,
  removing,
  onClose,
  onChangeRole,
  onDelete,
  onRestore,
}: ActionModalProps) {
  const deleted = row.account_status === "deleted";

  return (
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={styles.modalCard} onPress={() => undefined}>
        <View style={styles.modalHeader}>
          <Avatar fullName={fullName(row)} imageUrl={row.avatar_url} size={48} />
          <View style={styles.modalHeaderInfo}>
            <Text style={styles.modalName} numberOfLines={1}>
              {fullName(row)}
            </Text>
            <Text style={styles.modalEmail} numberOfLines={1}>
              {row.email ?? "No email"}
            </Text>
          </View>
        </View>

        <Text style={styles.modalSectionTitle}>Role</Text>
        {isSelf && (
          <Text style={styles.modalHint}>
            You can't change your own role here to avoid locking yourself out.
          </Text>
        )}
        <View style={styles.roleList}>
          {ROLES.map((role) => {
            const isCurrent = row.role === role;
            const disabled = isSelf || busyRole !== null;
            return (
              <Pressable
                key={role}
                disabled={disabled}
                onPress={() => onChangeRole(row, role)}
                style={[styles.roleOption, isCurrent && styles.roleOptionActive]}
              >
                <Text
                  style={[styles.roleOptionLabel, isCurrent && styles.roleOptionLabelActive]}
                >
                  {ROLE_LABELS[role]}
                </Text>
                {busyRole === role ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isCurrent ? (
                  <Text style={styles.roleOptionCurrent}>Current</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {isLastActiveAdmin && !deleted && (
          <Text style={styles.modalHint}>
            This is the only active admin account on the platform.
          </Text>
        )}

        {deleted ? (
          <Button
            title="Restore account"
            onPress={() => onRestore(row)}
            variant="outline"
            loading={removing}
            disabled={removing}
          />
        ) : (
          <Button
            title="Delete account"
            onPress={() => onDelete(row)}
            variant="danger"
            loading={removing}
            disabled={removing || isSelf}
          />
        )}

        <Button title="Cancel" onPress={onClose} variant="ghost" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    paddingBottom: spacing.lg,
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
    backgroundColor: colors.primarySoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  deletedBadge: {
    backgroundColor: "#fee2e2",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  deletedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
  modalName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  modalEmail: {
    fontSize: 13,
    color: colors.muted,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  modalHint: {
    fontSize: 12,
    color: colors.muted,
  },
  roleList: {
    gap: spacing.sm,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  roleOptionLabelActive: {
    color: colors.primary,
  },
  roleOptionCurrent: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
});
