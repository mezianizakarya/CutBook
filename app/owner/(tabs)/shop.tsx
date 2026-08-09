import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import {
  dayName,
  formatCents,
  formatTimeOfDay,
  parseTimeToMinutes,
} from "@/lib/format";
import {
  createService,
  loadOwnerShops,
  loadShopServices,
  loadWorkingHours,
  saveWorkingHours,
  setServiceActive,
  updateService,
  updateShop,
  type OwnerService,
  type OwnerShop,
  type ServiceInput,
  type WorkingHoursRow,
} from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

const STEP_MINUTES = 15;

function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export default function OwnerShopScreen() {
  const { user } = useUser();
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [services, setServices] = useState<OwnerService[]>([]);
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notice, showNotice } = useNotice();
  const [saving, setSaving] = useState(false);
  const [serviceSheet, setServiceSheet] = useState<{
    mode: "create" | "edit";
    service?: OwnerService;
  } | null>(null);
  const [details, setDetails] = useState({
    description: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
  });

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) ?? shops[0] ?? null,
    [shops, selectedShopId]
  );

  const load = useCallback(async () => {
    setError(null);
    if (!user?.id) {
      setShops([]);
      setServices([]);
      setHours([]);
      return;
    }
    const owned = await loadOwnerShops(user.id);
    setShops(owned);
    const target = owned.find((shop) => shop.id === selectedShopId) ?? owned[0] ?? null;
    if (!target) {
      setSelectedShopId(null);
      setServices([]);
      setHours([]);
      return;
    }
    setSelectedShopId(target.id);
    setDetails({
      description: target.description ?? "",
      address_line1: target.address_line1 ?? "",
      city: target.city ?? "",
      state: target.state ?? "",
      postal_code: target.postal_code ?? "",
      phone: target.phone ?? "",
      email: target.email ?? "",
      website: target.website ?? "",
    });
    const [rows, hrs] = await Promise.all([
      loadShopServices(target.id),
      loadWorkingHours(target.id),
    ]);
    setServices(rows);
    setHours(
      hrs.length === 7
        ? hrs
        : Array.from({ length: 7 }, (_, index) => ({
            day_of_week: index,
            opens_at: "09:00:00",
            closes_at: "18:00:00",
            is_closed: false,
          }))
    );
  }, [user?.id, selectedShopId]);

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

  function selectShop(shopId: number) {
    if (shopId !== selectedShopId) {
      setSelectedShopId(shopId);
    }
  }

  const canEdit = selectedShop?.myRole === "owner";

  async function handleSaveDetails() {
    if (!selectedShop) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateShop(selectedShop.id, {
        description: details.description || null,
        address_line1: details.address_line1 || null,
        city: details.city || null,
        state: details.state || null,
        postal_code: details.postal_code || null,
        phone: details.phone || null,
        email: details.email || null,
        website: details.website || null,
      });
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === selectedShop.id ? { ...shop, ...details } : shop
        )
      );
      showNotice("Shop details saved", "success");
    } catch (e) {
      Alert.alert("Could not save", errorMessageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHours() {
    if (!selectedShop) {
      return;
    }
    for (const day of hours) {
      if (!day.is_closed) {
        const open = parseTimeToMinutes(day.opens_at);
        const close = parseTimeToMinutes(day.closes_at);
        if (open == null || close == null) {
          Alert.alert(
            "Check your hours",
            `${dayName(day.day_of_week)} needs an opening and closing time.`
          );
          return;
        }
        if (close <= open) {
          Alert.alert(
            "Check your hours",
            `${dayName(day.day_of_week)} closes at or before it opens.`
          );
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    try {
      await saveWorkingHours(selectedShop.id, hours);
      showNotice("Working hours saved", "success");
    } catch (e) {
      Alert.alert("Could not save", errorMessageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  }

  function updateDay(index: number, patch: Partial<WorkingHoursRow>) {
    setHours((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day))
    );
  }

  function adjustTime(dayIndex: number, field: "opens_at" | "closes_at", delta: number) {
    setHours((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) {
          return day;
        }
        const current = parseTimeToMinutes(day[field]) ?? (field === "opens_at" ? 540 : 1080);
        return { ...day, [field]: minutesToTime(current + delta) };
      })
    );
  }

  async function handleServiceSave(input: ServiceInput) {
    if (!selectedShop) {
      return;
    }
    try {
      if (serviceSheet?.mode === "edit" && serviceSheet.service) {
        const updated = await updateService(serviceSheet.service.id, input);
        setServices((prev) =>
          prev.map((service) => (service.id === updated.id ? updated : service))
        );
        showNotice("Service updated", "success");
      } else {
        const created = await createService(selectedShop.id, input);
        setServices((prev) => [...prev, created]);
        showNotice("Service added", "success");
      }
      setServiceSheet(null);
    } catch (e) {
      Alert.alert("Could not save service", errorMessageFromUnknown(e));
    }
  }

  function toggleService(service: OwnerService) {
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
    );
    setServiceActive(service.id, !service.is_active).catch((e) => {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: service.is_active } : s))
      );
      Alert.alert("Could not update service", errorMessageFromUnknown(e));
    });
  }

  if (loading && !shops.length) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error && !shops.length) {
    return (
      <Screen centered>
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (!selectedShop) {
    return (
      <Screen scroll style={styles.screenPadding}>
        <EmptyState
          title="You don't manage a shop yet"
          subtitle="Your shop details, services and hours will appear here."
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
          <Text style={styles.title}>Shop</Text>
          <Text style={styles.subtitle}>
            {selectedShop.status === "pending"
              ? "Pending approval by CutBook."
              : "Details, services and working hours."}
          </Text>
        </View>

        {notice ? <NoticeBanner notice={notice} variant="soft" /> : null}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {shops.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {shops.map((shop) => (
              <FilterChip
                key={shop.id}
                label={shop.name}
                selected={selectedShop.id === shop.id}
                onPress={() => selectShop(shop.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Details */}
        <SectionHeader title="Details" />
        {canEdit ? (
          <>
            <View style={styles.fieldGroup}>
              <TextField
                label="Description"
                value={details.description}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, description: text }))}
                placeholder="Tell customers what makes your shop special"
                autoCapitalize="sentences"
              />
              <TextField
                label="Address"
                value={details.address_line1}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, address_line1: text }))}
                placeholder="123 Main Street"
              />
              <View style={styles.rowFields}>
                <View style={styles.rowField}>
                  <TextField
                    label="City"
                    value={details.city}
                    onChangeText={(text) => setDetails((prev) => ({ ...prev, city: text }))}
                  />
                </View>
                <View style={styles.rowField}>
                  <TextField
                    label="State"
                    value={details.state}
                    onChangeText={(text) => setDetails((prev) => ({ ...prev, state: text }))}
                  />
                </View>
              </View>
              <TextField
                label="Postal code"
                value={details.postal_code}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, postal_code: text }))}
                keyboardType="numeric"
              />
              <TextField
                label="Phone"
                value={details.phone}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
              <TextField
                label="Email"
                value={details.email}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Website"
                value={details.website}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, website: text }))}
                placeholder="https://"
                autoCapitalize="none"
              />
            </View>
            <Button
              title="Save details"
              onPress={() => void handleSaveDetails()}
              loading={saving}
              disabled={saving}
            />
          </>
        ) : (
          <View style={styles.card}>
            <InfoRow label="Description" value={selectedShop.description} />
            <InfoRow label="Address" value={selectedShop.address_line1} />
            <InfoRow
              label="City"
              value={[selectedShop.city, selectedShop.state]
                .filter(Boolean)
                .join(", ")}
            />
            <InfoRow label="Postal code" value={selectedShop.postal_code} />
            <InfoRow label="Phone" value={selectedShop.phone} />
            <InfoRow label="Email" value={selectedShop.email} />
            <InfoRow label="Website" value={selectedShop.website} />
            <Text style={styles.managerHint}>
              Only the shop owner can edit details.
            </Text>
          </View>
        )}

        {/* Services */}
        <SectionHeader
          title="Services"
          actionLabel={canEdit ? "Add" : undefined}
          onAction={
            canEdit
              ? () => setServiceSheet({ mode: "create" })
              : undefined
          }
        />
        {services.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyTitle}>No services yet</Text>
            <Text style={styles.inlineEmptySubtitle}>
              Add the services customers can book.
            </Text>
          </View>
        ) : (
          services.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => {
                if (canEdit) {
                  setServiceSheet({ mode: "edit", service });
                }
              }}
              disabled={!canEdit}
              style={({ pressed }) => [
                styles.serviceRow,
                pressed && styles.serviceRowPressed,
              ]}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {service.name}
                </Text>
                <Text style={styles.serviceMeta} numberOfLines={1}>
                  {formatCents(service.price_cents)} · {service.duration_minutes} min
                  {service.category ? ` · ${service.category}` : ""}
                </Text>
              </View>
              {canEdit ? (
                <Switch
                  value={service.is_active}
                  onValueChange={() => toggleService(service)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              ) : (
                <Text style={[styles.badgeText, service.is_active ? styles.activeText : styles.inactiveText]}>
                  {service.is_active ? "Active" : "Hidden"}
                </Text>
              )}
            </Pressable>
          ))
        )}

        {/* Working hours */}
        <SectionHeader title="Working hours" />
        {hours.map((day, index) => (
          <View key={day.day_of_week} style={styles.hoursRow}>
            <Text style={styles.hoursDay}>{dayName(day.day_of_week)}</Text>
            <Switch
              value={!day.is_closed}
              onValueChange={(value) => updateDay(index, { is_closed: !value })}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
            {day.is_closed ? (
              <Text style={styles.closedText}>Closed</Text>
            ) : (
              <TimeStepper
                value={day.opens_at ?? "09:00:00"}
                onDecrease={() => adjustTime(index, "opens_at", -STEP_MINUTES)}
                onIncrease={() => adjustTime(index, "opens_at", STEP_MINUTES)}
              />
            )}
            {!day.is_closed && (
              <TimeStepper
                value={day.closes_at ?? "18:00:00"}
                onDecrease={() => adjustTime(index, "closes_at", -STEP_MINUTES)}
                onIncrease={() => adjustTime(index, "closes_at", STEP_MINUTES)}
              />
            )}
          </View>
        ))}
        <Button
          title="Save hours"
          variant="outline"
          onPress={() => void handleSaveHours()}
          loading={saving}
          disabled={saving}
        />
      </ScrollView>

      <ServiceSheet
        visible={serviceSheet !== null}
        service={serviceSheet?.mode === "edit" ? serviceSheet.service : undefined}
        onClose={() => setServiceSheet(null)}
        onSave={(input) => void handleServiceSave(input)}
      />
    </Screen>
  );
}

function TimeStepper({
  value,
  onDecrease,
  onIncrease,
}: {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDecrease} hitSlop={6} style={styles.stepperButton}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{formatTimeOfDay(value)}</Text>
      <Pressable onPress={onIncrease} hitSlop={6} style={styles.stepperButton}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

function ServiceSheet({
  visible,
  service,
  onClose,
  onSave,
}: {
  visible: boolean;
  service?: OwnerService;
  onClose: () => void;
  onSave: (input: ServiceInput) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isEditing = service !== undefined;

  const reset = useCallback(
    (target?: OwnerService) => {
      setName(target?.name ?? "");
      setPrice(target ? String(target.price_cents / 100) : "");
      setDuration(target ? String(target.duration_minutes) : "");
      setDescription(target?.description ?? "");
      setCategory(target?.category ?? "");
      setError(null);
    },
    []
  );

  useEffect(() => {
    if (visible) {
      reset(service);
    }
  }, [visible, service, reset]);

  function handleSave() {
    const trimmedName = name.trim();
    const priceValue = Number(price);
    const durationValue = Number(duration);
    if (!trimmedName) {
      setError("Please enter a service name.");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      setError("Please enter a valid duration in minutes.");
      return;
    }
    onSave({
      name: trimmedName,
      price_cents: Math.round(priceValue * 100),
      duration_minutes: durationValue,
      description: description.trim() || null,
      category: category.trim() || null,
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{isEditing ? "Edit service" : "Add service"}</Text>
      {isEditing ? null : <Text style={styles.sheetText}>Customers can book this service at your shop.</Text>}
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Classic fade"
        autoCapitalize="words"
      />
      <View style={styles.rowFields}>
        <View style={styles.rowField}>
          <TextField
            label="Price ($)"
            value={price}
            onChangeText={setPrice}
            placeholder="35"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.rowField}>
          <TextField
            label="Duration (min)"
            value={duration}
            onChangeText={setDuration}
            placeholder="30"
            keyboardType="numeric"
          />
        </View>
      </View>
      <TextField
        label="Category (optional)"
        value={category}
        onChangeText={setCategory}
        placeholder="Haircut"
        autoCapitalize="words"
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What's included?"
        autoCapitalize="sentences"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title={isEditing ? "Save changes" : "Add service"} onPress={handleSave} />
    </BottomSheet>
  );
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
  fieldGroup: {
    gap: spacing.md,
  },
  rowFields: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    color: colors.muted,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  managerHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  inlineEmpty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inlineEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  inlineEmptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  serviceRowPressed: {
    opacity: 0.8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.muted,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  hoursDay: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  closedText: {
    fontSize: 13,
    color: colors.muted,
    minWidth: 84,
    textAlign: "right",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  stepperValue: {
    minWidth: 58,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
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
});
