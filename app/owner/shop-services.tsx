import { RTLIcon } from "@/components/ui/RTLIcon";
import { useUser } from "@clerk/expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { formatCents } from "@/lib/format";
import { useUserCountry } from "@/lib/user-country";
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
  const userCountry = useUserCountry();
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
        showNotice(t("services.updated"), "success");
      } else {
        const created = await createService(id, input);
        setServices((prev) => [...prev, created]);
        showNotice(t("services.added"), "success");
      }
      setServiceSheet(null);
    } catch (e) {
      Alert.alert(t("services.could_not_save"), errorMessageFromUnknown(e));
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
      Alert.alert(t("services.could_not_update"), errorMessageFromUnknown(e));
    });
  }

  return (
    <Screen scroll paddingHorizontal={14}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <RTLIcon name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <AppText style={styles.title}>{t("shop.services")}</AppText>
      </View>
      <AppText style={styles.subtitle}>
        {t("services.subtitle")}
      </AppText>

      {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
      {!!error && <AppText style={styles.errorText}>{error}</AppText>}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : services.length === 0 ? (
        <EmptyState
          title={t("services.no_services")}
          subtitle={t("services.add_services_hint")}
          actionLabel={canEdit ? t("services.add_service") : undefined}
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
                  <AppText style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </AppText>
                  <AppText style={styles.serviceMeta} numberOfLines={1}>
                    <AppText style={styles.servicePrice}>
                      {formatCents(service.price_cents, userCountry)}
                    </AppText>
                    {`  ·  ${service.duration_minutes} ${t("common.min")}`}
                  </AppText>
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
                    <AppText
                      style={[
                        styles.statusPillText,
                        service.is_active
                          ? styles.statusPillTextActive
                          : styles.statusPillTextHidden,
                      ]}
                    >
                      {service.is_active ? t("services.active") : t("services.hidden")}
                    </AppText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {canEdit ? (
            <Button
              title={t("services.add_service")}
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
      setError(t("services.enter_name"));
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError(t("services.enter_price"));
      return;
    }
    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      setError(t("services.enter_duration"));
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
      <AppText style={styles.sheetTitle}>
        {isEditing ? t("services.edit_service") : t("services.add_service_title")}
      </AppText>
      {isEditing ? null : (
        <AppText style={styles.sheetText}>
          {t("services.service_description")}
        </AppText>
      )}
      <TextField
        label={t("services.name_label")}
        value={name}
        onChangeText={setName}
        placeholder={t("services.name_placeholder")}
        autoCapitalize="words"
      />
      <View style={styles.rowFields}>
        <View style={styles.rowField}>
          <TextField
            label={t("services.price_label")}
            value={price}
            onChangeText={setPrice}
            placeholder="35"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.rowField}>
          <TextField
            label={t("services.duration_label")}
            value={duration}
            onChangeText={setDuration}
            placeholder="30"
            keyboardType="numeric"
          />
        </View>
      </View>
      <TextField
        label={t("services.category_label")}
        value={category}
        onChangeText={setCategory}
        placeholder={t("services.category_placeholder")}
        autoCapitalize="words"
      />
      <TextField
        label={t("services.description_label")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("services.description_placeholder")}
        autoCapitalize="sentences"
      />
      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
      <Button
        title={isEditing ? t("services.save_changes") : t("services.add_service")}
        onPress={handleSave}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
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
