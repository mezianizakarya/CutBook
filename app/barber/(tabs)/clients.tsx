import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AppTextInput } from "@/components/AppTextInput";


import { Avatar } from "@/components/ui/Avatar";
import {
  BookingStatusBadge,
  type BookingStatus,
} from "@/components/ui/BookingStatusBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DetailRow, DetailsCard } from "@/components/ui/DetailsCard";
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
import { useUserCountry } from "@/lib/user-country";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

export default function BarberClientsScreen() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [customers, setCustomers] = useState<BookingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inShop, setInShop] = useState(false);
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
    setInShop(memberships.length > 0);
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

  if (!inShop) {
    return (
      <Screen scroll paddingHorizontal={14} paddingTop={spacing.sm}>
        <View style={styles.pageHeader}>
          <AppText style={styles.pageTitle}>{t("tabs.clients")}</AppText>
        </View>
        <EmptyState
          title={t("barber.not_assigned_shop")}
          subtitle={t("barber.not_member_yet")}
        />
      </Screen>
    );
  }

  return (
    <Screen paddingHorizontal={14} style={styles.screenPadding}>
      <View style={styles.header}>
        <AppText style={styles.title}>{t("tabs.clients")}</AppText>
        <AppText style={styles.subtitle}>
          {clients.length === 1
            ? t("barber.client_count", { count: clients.length })
            : t("barber.client_count_plural", { count: clients.length })}
        </AppText>
      </View>

      <View style={styles.searchWrap}>
        <AppTextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t("barber.search_clients")}
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
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {!!error && <AppText style={styles.error}>{error}</AppText>}

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
              title={t("barber.no_clients_yet")}
              subtitle={t("barber.once_book_show")}
            />
          ) : (
            <EmptyState
              title={t("barber.no_matches")}
              subtitle={t("barber.try_different_search")}
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

      {!!selected && (
        <ClientDetailSheet
          client={selected}
          history={historyFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
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
      ? t("barber.visits_with_service", { count: client.booking_count, service: client.favorite_service })
      : client.last_booking
        ? t("barber.visit_count", { count: client.booking_count })
        : t("barber.no_visits_yet");

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
        <AppText style={styles.rowName} numberOfLines={1}>
          {fullName || t("staff.customer")}
        </AppText>
        <AppText style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </AppText>
        {!!client.last_booking && (
          <AppText style={styles.rowDate} numberOfLines={1}>
            {t("staff.last_visit")} {formatDate(client.last_booking)}
          </AppText>
        )}
      </View>
      {client.upcoming_count > 0 && (
        <View style={styles.upcomingBadge}>
          <AppText style={styles.upcomingBadgeText}>
            {t("barber.upcoming_count", { count: client.upcoming_count })}
          </AppText>
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
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ") || t("staff.customer");
  const userCountry = useUserCountry();

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.sheetHeader}>
        <Avatar fullName={fullName} imageUrl={client.avatar_url} size={56} />
        <View style={styles.sheetHeaderInfo}>
          <AppText style={styles.sheetName} numberOfLines={1}>
            {fullName}
          </AppText>
          <AppText style={styles.sheetSubtitle} numberOfLines={1}>
            {[client.phone, client.email].filter(Boolean).join(" · ") || "—"}
          </AppText>
        </View>
      </View>

      <View style={styles.sheetStats}>
        <View style={styles.sheetStat}>
          <AppText style={styles.sheetStatValue}>{client.booking_count}</AppText>
          <AppText style={styles.sheetStatLabel}>{t("staff.bookings")}</AppText>
        </View>
        <View style={styles.sheetStat}>
          <AppText style={styles.sheetStatValue}>{client.completed_count}</AppText>
          <AppText style={styles.sheetStatLabel}>{t("status.completed")}</AppText>
        </View>
        <View style={styles.sheetStat}>
          <AppText style={styles.sheetStatValue}>{client.upcoming_count}</AppText>
          <AppText style={styles.sheetStatLabel}>{t("staff.upcoming")}</AppText>
        </View>
      </View>

      <DetailsCard>
        {!!client.phone && (
          <DetailRow label={t("staff.phone")} value={client.phone} />
        )}
        {!!client.email && (
          <DetailRow label={t("staff.email")} value={client.email} />
        )}
        {!!client.favorite_service && (
          <DetailRow label={t("barber.favorite")} value={client.favorite_service} />
        )}
        {!!client.last_booking && (
          <DetailRow label={t("staff.last_visit")} value={formatDate(client.last_booking)} />
        )}
      </DetailsCard>

      <AppText style={styles.historyTitle}>{t("barber.recent_bookings")}</AppText>
      {history.length === 0 ? (
        <AppText style={styles.historyEmpty}>{t("barber.no_bookings_record")}</AppText>
      ) : (
        history.map((row) => (
          <View key={row.id} style={styles.historyRow}>
            <View style={styles.historyInfo}>
              <AppText style={styles.historyName} numberOfLines={1}>
                {row.service_name || "—"}
              </AppText>
              <AppText style={styles.historyMeta} numberOfLines={1}>
                {formatDateTime(row.starts_at)} · {formatCents(row.service_price_cents, userCountry)}
              </AppText>
            </View>
            <BookingStatusBadge status={row.status as BookingStatus} />
          </View>
        ))
      )}

      <Button
        title={t("common.close")}
        variant="outline"
        onPress={onClose}
        style={styles.sheetClose}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingTop: spacing.sm,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  pageHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
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
    paddingEnd: 44,
  fontSize: 15,
  color: colors.text,
  },
  clear: {
    position: "absolute",
    end: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
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
