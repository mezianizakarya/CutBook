import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  adminRemoveVerification,
  adminSetUserDeleted,
  adminSetUserRole,
} from "@/lib/admin";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";
import { stripAtPrefix } from "@/lib/username";
import { useConfirmCountdown } from "@/lib/useConfirmCountdown";
import { useKeyboardHeight } from "@/lib/useKeyboardHeight";
import { useNotice } from "@/lib/useNotice";
import { useSheetDrag } from "@/lib/useSheetDrag";
import {
  fetchLatestVerificationRequest,
  type VerificationRequest,
} from "@/lib/verification";

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: Role | null;
  account_status: "active" | "deleted";
  is_verified: boolean;
  created_at: string | null;
  last_active_at: string | null;
};

type StatusFilter = "all" | "active" | "deleted";

const STATUS_FILTERS: StatusFilter[] = ["all", "active", "deleted"];

type RoleFilter = "all" | Role;

const PAGE_SIZE = 50;

const PROFILE_SELECT =
  "id, email, username, first_name, last_name, avatar_url, phone, role, account_status, is_verified, created_at, last_active_at";

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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const { notice, showNotice } = useNotice();

  const load = useCallback(async () => {
    setError(null);
    const q = query.trim();
    if (q === "") {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (error) {
        setError(errorMessageFromUnknown(error));
        setProfiles((previous) => previous ?? []);
        return;
      }
      const rows = (data ?? []) as unknown as ProfileRow[];
      setProfiles(rows);
      setHasMore(rows.length === PAGE_SIZE);
      return;
    }
    const { data, error } = await supabase.rpc("admin_search_profiles", {
      p_query: q,
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });
    if (error) {
      setError(errorMessageFromUnknown(error));
      setProfiles((previous) => previous ?? []);
      return;
    }
    const rows = (data ?? []) as unknown as ProfileRow[];
    setProfiles(rows);
    setHasMore(rows.length === PAGE_SIZE);
  }, [query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    const start = profiles?.length ?? 0;
    const q = query.trim();
    let rows: ProfileRow[] = [];
    let loadError: unknown = null;
    if (q === "") {
      const result = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .order("created_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
      rows = (result.data ?? []) as unknown as ProfileRow[];
      loadError = result.error;
    } else {
      const result = await supabase.rpc("admin_search_profiles", {
        p_query: q,
        p_limit: PAGE_SIZE,
        p_offset: start,
      });
      rows = (result.data ?? []) as unknown as ProfileRow[];
      loadError = result.error;
    }
    if (loadError) {
      setError(errorMessageFromUnknown(loadError));
    } else {
      const unique = rows.filter(
        (row) => !(profiles ?? []).some((existing) => existing.id === row.id)
      );
      setProfiles((previous) => [...(previous ?? []), ...unique]);
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, profiles, query]);

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

  const roleCounts = useMemo(() => {
    const counts: Record<Role, number> = Object.fromEntries(
      ROLES.map((role) => [role, 0])
    ) as Record<Role, number>;
    for (const row of profiles ?? []) {
      if (row.role) {
        counts[row.role] += 1;
      }
    }
    return counts;
  }, [profiles]);

  const filtered = useMemo(() => {
    const rows = profiles ?? [];
    const q = stripAtPrefix(query).toLowerCase();
    const matched = rows.filter((row) => {
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
        row.username?.toLowerCase().includes(q) ||
        `${row.first_name ?? ""} ${row.last_name ?? ""}`.toLowerCase().includes(q)
      );
    });
    return matched;
  }, [profiles, query, statusFilter, roleFilter]);

  const hasActiveFilters =
    query.trim() !== "" || statusFilter !== "all" || roleFilter !== "all";

  function resetFilters() {
    setStatusFilter("all");
    setRoleFilter("all");
  }

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
      await adminSetUserRole(row.id, role);
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
      await adminSetUserDeleted(row.id, deleted);
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

  function handleRemoveVerification(row: ProfileRow) {
    setSelected((previous) =>
      previous && previous.id === row.id
        ? { ...previous, is_verified: false }
        : previous
    );
    void load();
    showNotice(`Verified badge removed from ${fullName(row)}`, "role");
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
        <NoticeBanner notice={notice} style={styles.noticeSpacing} />
      ) : (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, username, or email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearButton}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
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
        style={[styles.chipsScroll, styles.chipsScrollLast]}
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
                {role === "all"
                  ? "All roles"
                  : `${ROLE_LABELS[role]} (${roleCounts[role]})`}
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
            {hasActiveFilters && (
              <Button
                title="Reset filters"
                variant="outline"
                onPress={resetFilters}
                style={styles.resetButton}
              />
            )}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.listFooter}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button
                  title="Load more"
                  variant="outline"
                  onPress={loadMore}
                  style={styles.loadMoreButton}
                />
              )}
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Avatar fullName={fullName(item)} imageUrl={item.avatar_url} size={44} />
            <View style={styles.rowInfo}>
              <View style={styles.rowNameLine}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {fullName(item)}
                </Text>
                {item.is_verified && <VerifiedIcon size={16} />}
              </View>
              <Text style={styles.rowUsername} numberOfLines={1}>
                {item.username ?? "No username"}
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
        statusBarTranslucent
        navigationBarTranslucent
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
            onRemoveVerification={handleRemoveVerification}
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
  onRemoveVerification: (row: ProfileRow) => void;
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
  onRemoveVerification,
}: ActionModalProps) {
  const deleted = row.account_status === "deleted";
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [showingRoles, setShowingRoles] = useState(false);
  const [showingVerification, setShowingVerification] = useState(false);
  const [removingVerification, setRemovingVerification] = useState(false);
  const [confirmingRole, setConfirmingRole] = useState<Role | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | "username" | null>(null);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (row.role === "barber" || row.role === "owner") {
      fetchLatestVerificationRequest(row.id).then((latest) => {
        if (!cancelled) {
          setRequest(latest);
        }
      });
    } else {
      setRequest(null);
    }
    return () => {
      cancelled = true;
    };
  }, [row.id, row.role]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, []);

  const {
    count: confirmCount,
    start: startCountdown,
    cancel: cancelCountdown,
  } = useConfirmCountdown({
    onExpire: () => {
      setConfirmingDelete(false);
      setConfirmingRestore(false);
    },
  });

  const { translateY, panResponder } = useSheetDrag(handleClose);

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  async function copyToClipboard(value: string, field: "email" | "phone" | "username") {
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
    setShowingVerification(false);
    setShowingRoles(true);
    setConfirmingDelete(false);
    setConfirmingRestore(false);
    cancelCountdown();
  }

  function handleVerificationBadgePress() {
    if (!row.is_verified) {
      return;
    }
    if (showingVerification) {
      setShowingVerification(false);
      return;
    }
    setShowingRoles(false);
    setShowingVerification(true);
    setConfirmingDelete(false);
    setConfirmingRestore(false);
    cancelCountdown();
  }

  async function handleRemoveVerification() {
    if (!row.is_verified) {
      return;
    }
    setRemovingVerification(true);
    try {
      await adminRemoveVerification(row.id);
      setShowingVerification(false);
      onRemoveVerification(row);
    } catch (e) {
      Alert.alert(
        "Couldn't remove verification",
        errorMessageFromUnknown(e)
      );
    } finally {
      setRemovingVerification(false);
    }
  }

  function handleDeletePress() {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      cancelCountdown();
      onDelete(row);
    } else {
      setConfirmingDelete(true);
      startCountdown();
    }
  }

  function handleRestorePress() {
    if (confirmingRestore) {
      setConfirmingRestore(false);
      cancelCountdown();
      onRestore(row);
    } else {
      setConfirmingRestore(true);
      startCountdown();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.modalBackdrop}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      <Pressable onPress={() => undefined}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              transform: [{ translateY }],
              paddingBottom:
                spacing.xl +
                insets.bottom +
                (Platform.OS === "android" ? keyboardHeight : 0),
            },
          ]}
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
                {row.is_verified && (
                  <Pressable
                    onPress={handleVerificationBadgePress}
                    accessibilityRole="button"
                    accessibilityLabel="Manage verification"
                    hitSlop={8}
                  >
                    <VerifiedIcon size={17} />
                  </Pressable>
                )}
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
                {(row.role === "barber" || row.role === "owner") &&
                  (request?.status === "pending" ? (
                    <StatusBadge label="Pending review" tone="warning" />
                  ) : request?.status === "rejected" ? (
                    <StatusBadge label="Rejected" tone="danger" />
                  ) : null)}
              </View>
              <Text style={styles.modalUsername} numberOfLines={1}>
                {row.username ?? "No username"}
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
                  title={confirmingRestore ? `Confirm restore (${confirmCount})` : "Restore account"}
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
                  title={confirmingDelete ? `Confirm delete (${confirmCount})` : "Delete account"}
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
                    cancelCountdown();
                    return;
                  }
                  if (confirmingDelete) {
                    setConfirmingDelete(false);
                    cancelCountdown();
                    return;
                  }
                  if (confirmingRole) {
                    setConfirmingRole(null);
                    return;
                  }
                  handleClose();
                }}
                variant="outline"
                style={styles.cancelButton}
              />
            </>
          ) : showingVerification ? (
            <>
              <Text style={styles.verificationRemoveTitle}>Remove verification</Text>
              <View style={styles.verificationRemoveCard}>
                <Text style={styles.verificationRemoveText}>
                  {fullName(row)} is currently verified. Removing the badge
                  clears their verified status and lets them request
                  verification again.
                </Text>
              </View>
              <Button
                title="Remove verification"
                onPress={handleRemoveVerification}
                variant="dangerOutline"
                loading={removingVerification}
                disabled={removingVerification}
                style={styles.modalActionSpacer}
              />
              <Button
                title="Cancel"
                onPress={() => setShowingVerification(false)}
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

          <View style={styles.detailsCard}>
            {row.username ? (
              <Pressable
                onPress={() => copyToClipboard(row.username ?? "", "username")}
                style={styles.detailRow}
              >
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {row.username}
                </Text>
                {copiedField === "username" ? (
                  <Text style={styles.copiedText}>Copied</Text>
                ) : (
                  <Text style={styles.copyHint}>Copy</Text>
                )}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => copyToClipboard(row.email ?? "", "email")}
              style={styles.detailRow}
            >
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {row.email ?? "No email"}
              </Text>
              {copiedField === "email" ? (
                <Text style={styles.copiedText}>Copied</Text>
              ) : (
                <Text style={styles.copyHint}>Copy</Text>
              )}
            </Pressable>
            {row.phone ? (
              <Pressable
                onPress={() => copyToClipboard(row.phone ?? "", "phone")}
                style={styles.detailRow}
              >
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {row.phone}
                </Text>
                {copiedField === "phone" ? (
                  <Text style={styles.copiedText}>Copied</Text>
                ) : (
                  <Text style={styles.copyHint}>Copy</Text>
                )}
              </Pressable>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member since</Text>
              <Text style={styles.detailValue}>
                {formatDate(row.created_at)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last active</Text>
              <Text style={styles.detailValue}>
                {formatDate(row.last_active_at)}
              </Text>
            </View>
          </View>

          {deleted ? (
            <Button
              title={confirmingRestore ? `Confirm restore (${confirmCount})` : "Restore account"}
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
              title={confirmingDelete ? `Confirm delete (${confirmCount})` : "Delete account"}
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
                cancelCountdown();
                return;
              }
              if (confirmingDelete) {
                setConfirmingDelete(false);
                cancelCountdown();
                return;
              }
              handleClose();
            }}
            variant="outline"
            style={styles.cancelButton}
          />
            </>
          )}
        </Animated.View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
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
  noticeSpacing: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  clearButton: {
    position: "absolute",
    right: spacing.xs,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
    marginLeft: 0,
    marginRight: -14,
  },
  chipsScrollLast: {
    marginBottom: spacing.md,
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
    paddingBottom: 98,
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
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowUsername: {
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
  verificationRemoveTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  verificationRemoveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  verificationRemoveText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  resetButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  listFooter: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loadMoreButton: {
    backgroundColor: colors.surface,
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
  modalUsername: {
    fontSize: 13,
    color: colors.muted,
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
    width: 110,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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
