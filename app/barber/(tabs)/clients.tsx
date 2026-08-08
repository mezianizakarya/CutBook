import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/expo";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import {
  BookingStatusBadge,
  type BookingStatus,
} from "@/components/ui/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { fetchBookingCustomers, type BookingCustomer, type BookingRow } from "@/lib/booking";
import {
  groupClients,
  loadMyBookings,
  loadMyMemberships,
  type BarberClient,
} from "@/lib/barber";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import { useSheetDrag } from "@/lib/useSheetDrag";

export default function BarberClientsScreen() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BarberClient | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setBookings([]);
      setCustomers([]);
      return;
    }
    const memberships = await loadMyMemberships(user.id);
    if (memberships.length === 0) {
      setBookings([]);
      setCustomers([]);
      return;
    }
    const now = new Date();
    const from = new Date(now.getTime() - 90 * 86_400_000);
    const to = new Date(now.getTime() + 14 * 86_400_000);
    const rows = await loadMyBookings(
      memberships.map((member) => member.id),
      from,
      to
    );
    setBookings(rows);
    setCustomers(await fetchBookingCustomers(rows.map((row) => row.id)));
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

  const clients = useMemo(
    () => groupClients(bookings ?? [], customers),
    [bookings, customers]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return clients;
    }
    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (client.email ?? "").toLowerCase().includes(term) ||
        (client.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [clients, query]);

  const bookingCustomerByBooking = useMemo(
    () => new Map(customers.map((customer) => [customer.booking_id, customer.customer_id])),
    [customers]
  );

  const historyFor = useCallback(
    (client: BarberClient) =>
      (bookings ?? [])
        .filter((row) => bookingCustomerByBooking.get(row.id) === client.customer_id)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .slice(0, 10),
    [bookings, bookingCustomerByBooking]
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

  if (loading && !bookings) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.subtitle}>
          {clients.length} client{clients.length === 1 ? "" : "s"}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search clients"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            style={styles.clear}
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(client) => client.customer_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          bookings && bookings.length === 0 ? (
            <EmptyState
              title="No clients yet"
              subtitle="Once customers book with you, they'll show up here."
            />
          ) : (
            <EmptyState
              title="No matches"
              subtitle="Try a different name, email or phone number."
            />
          )
        }
        renderItem={({ item }) => (
          <ClientRow
            client={item}
            onPress={() => setSelected(item)}
          />
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
          <ClientDetailSheet
            client={selected}
            history={historyFor(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </Screen>
  );
}

type ClientRowProps = {
  client: BarberClient;
  onPress: () => void;
};

function ClientRow({ client, onPress }: ClientRowProps) {
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ");
  const subtitle =
    client.favorite_service && client.last_booking
      ? `${client.booking_count} visits · ${client.favorite_service}`
      : client.last_booking
        ? `${client.booking_count} visits`
        : "No visits yet";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar
        fullName={fullName}
        imageUrl={client.avatar_url}
        size={44}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {fullName || "Customer"}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {!!client.last_booking && (
          <Text style={styles.rowDate} numberOfLines={1}>
            Last visit {formatDate(client.last_booking)}
          </Text>
        )}
      </View>
      {client.upcoming_count > 0 && (
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingBadgeText}>
            {client.upcoming_count} up
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type ClientDetailSheetProps = {
  client: BarberClient;
  history: BookingRow[];
  onClose: () => void;
};

function ClientDetailSheet({ client, history, onClose }: ClientDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { translateY, panResponder } = useSheetDrag(onClose);
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ") || "Customer";

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable onPress={() => undefined}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom: spacing.xl + insets.bottom,
            },
          ]}
        >
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.sheetHeader}>
            <Avatar fullName={fullName} imageUrl={client.avatar_url} size={56} />
            <View style={styles.sheetHeaderInfo}>
              <Text style={styles.sheetName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>
                {[client.phone, client.email].filter(Boolean).join(" · ") || "—"}
              </Text>
            </View>
          </View>

          <View style={styles.sheetStats}>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatValue}>{client.booking_count}</Text>
              <Text style={styles.sheetStatLabel}>Bookings</Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatValue}>{client.completed_count}</Text>
              <Text style={styles.sheetStatLabel}>Completed</Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatValue}>{client.upcoming_count}</Text>
              <Text style={styles.sheetStatLabel}>Upcoming</Text>
            </View>
          </View>

          <View style={styles.sheetCard}>
            {!!client.phone && (
              <SheetRow label="Phone" value={client.phone} />
            )}
            {!!client.email && (
              <SheetRow label="Email" value={client.email} />
            )}
            {!!client.favorite_service && (
              <SheetRow label="Favorite" value={client.favorite_service} />
            )}
            {!!client.last_booking && (
              <SheetRow label="Last visit" value={formatDate(client.last_booking)} />
            )}
          </View>

          <Text style={styles.historyTitle}>Recent bookings</Text>
          {history.length === 0 ? (
            <Text style={styles.historyEmpty}>No bookings on record.</Text>
          ) : (
            history.map((row) => (
              <View key={row.id} style={styles.historyRow}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName} numberOfLines={1}>
                    {row.service_name || "—"}
                  </Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {formatDateTime(row.starts_at)} · {formatCents(row.service_price_cents)}
                  </Text>
                </View>
                <BookingStatusBadge status={row.status as BookingStatus} />
              </View>
            ))
          )}

          <Button
            title="Close"
            variant="outline"
            onPress={onClose}
            style={styles.sheetClose}
          />
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sheetRow}>
      <Text style={styles.sheetRowLabel}>{label}</Text>
      <Text style={styles.sheetRowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  searchWrap: {
    position: "relative",
    marginBottom: spacing.md,
  },
  search: {
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    fontSize: 15,
    color: colors.text,
  },
  clear: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  clearText: {
    color: colors.muted,
    fontSize: 16,
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
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  rowDate: {
    fontSize: 12,
    color: colors.muted,
  },
  upcomingBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  upcomingBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  sheet: {
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
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sheetHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  sheetStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sheetStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  sheetStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  sheetStatLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sheetRowLabel: {
    width: 72,
    fontSize: 13,
    color: colors.muted,
  },
  sheetRowValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  historyEmpty: {
    fontSize: 14,
    color: colors.muted,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  historyMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  sheetClose: {
    backgroundColor: colors.surface,
  },
});
