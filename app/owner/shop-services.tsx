import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents } from "@/lib/format";
import {
  createService,
  loadOwnerShops,
  loadShopServices,
  setServiceActive,
  updateService,
  type OwnerService,
  type ServiceInput,
} from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

export default function ShopServicesScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId?: string; name?: string }>();
  const { notice, showNotice } = useNotice();

  const id = Number(shopId);

  const [services, setServices] = useState<OwnerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [serviceSheet, setServiceSheet] = useState<{
    mode: "create" | "edit";
    service?: OwnerService;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id || !user?.id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rows, shops] = await Promise.all([
        loadShopServices(id),
        loadOwnerShops(user.id),
      ]);
      setServices(rows);
      setCanEdit(
        shops.find((shop) => shop.id === id)?.myRole === "owner"
      );
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleServiceSave(input: ServiceInput) {
    try {
      if (serviceSheet?.mode === "edit" && serviceSheet.service) {
        const updated = await updateService(serviceSheet.service.id, input);
        setServices((prev) =>
          prev.map((service) => (service.id === updated.id ? updated : service))
        );
        showNotice("Service updated", "success");
      } else {
        const created = await createService(id, input);
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

  return (
    <Screen scroll paddingHorizontal={14}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backRow}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.subtitle}>
          The services customers can book at your shop.
        </Text>
      </View>

      {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : services.length === 0 ? (
        <EmptyState
          title="No services yet"
          subtitle="Add the services customers can book."
          actionLabel={canEdit ? "Add service" : undefined}
          onAction={
            canEdit ? () => setServiceSheet({ mode: "create" }) : undefined
          }
        />
      ) : (
        <>
          <View style={styles.groupCard}>
            {services.map((service, index) => (
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
                  index > 0 && styles.groupDivider,
                  pressed && styles.serviceRowPressed,
                ]}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceMeta} numberOfLines={1}>
                    <Text style={styles.servicePrice}>
                      {formatCents(service.price_cents)}
                    </Text>
                    {`  ·  ${service.duration_minutes} min`}
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
                  <View
                    style={[
                      styles.statusPill,
                      service.is_active
                        ? styles.statusPillActive
                        : styles.statusPillHidden,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        service.is_active
                          ? styles.statusPillTextActive
                          : styles.statusPillTextHidden,
                      ]}
                    >
                      {service.is_active ? "Active" : "Hidden"}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {canEdit ? (
            <Button
              title="Add service"
              onPress={() => setServiceSheet({ mode: "create" })}
              style={styles.addButton}
            />
          ) : null}
        </>
      )}

      <ServiceSheet
        visible={serviceSheet !== null}
        service={serviceSheet?.mode === "edit" ? serviceSheet.service : undefined}
        onClose={() => setServiceSheet(null)}
        onSave={(input) => void handleServiceSave(input)}
      />
    </Screen>
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
      <Text style={styles.sheetTitle}>
        {isEditing ? "Edit service" : "Add service"}
      </Text>
      {isEditing ? null : (
        <Text style={styles.sheetText}>
          Customers can book this service at your shop.
        </Text>
      )}
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
      <Button
        title={isEditing ? "Save changes" : "Add service"}
        onPress={handleSave}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
  },
  notice: {
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
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
  servicePrice: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillActive: {
    backgroundColor: "#dcfce7",
  },
  statusPillHidden: {
    backgroundColor: colors.border,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillTextActive: {
    color: colors.success,
  },
  statusPillTextHidden: {
    color: colors.muted,
  },
  addButton: {
    marginTop: spacing.lg,
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
  rowFields: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowField: {
    flex: 1,
  },
});
