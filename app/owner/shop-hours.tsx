import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { Screen } from "@/components/ui/Screen";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { dayName, formatTimeOfDay, parseTimeToMinutes } from "@/lib/format";
import {
  loadUpcomingBookings,
  loadWorkingHours,
  saveWorkingHours,
  type UpcomingBooking,
  type WorkingHoursRow,
} from "@/lib/owner";
import { colors, radius, spacing } from "@/lib/theme";
import { useNotice } from "@/lib/useNotice";

const todayDayOfWeek = new Date().getDay();

const DAY_CHIP_LABELS = [
  t("days.sunday").slice(0, 3),
  t("days.monday").slice(0, 3),
  t("days.tuesday").slice(0, 3),
  t("days.wednesday").slice(0, 3),
  t("days.thursday").slice(0, 3),
  t("days.friday").slice(0, 3),
  t("days.saturday").slice(0, 3),
];

function dateFromTimeValue(value: string | null | undefined): Date {
  const date = new Date();
  const minutes = parseTimeToMinutes(value) ?? 540;
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:00`;
}

function localTimeLabel(date: Date): string {
  return formatTimeOfDay(
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}:00`
  );
}

type HoursConflict = {
  id: number;
  day_of_week: number;
  starts_at: string;
  service_name: string;
};

/** Bookings that would fall outside the new schedule for their weekday. */
function findHoursConflicts(
  hours: WorkingHoursRow[],
  bookings: UpcomingBooking[]
): HoursConflict[] {
  const byDay = new Map(hours.map((day) => [day.day_of_week, day]));
  const conflicts: HoursConflict[] = [];
  for (const booking of bookings) {
    const start = new Date(booking.starts_at);
    const day = byDay.get(start.getDay());
    if (!day) {
      continue;
    }
    if (day.is_closed) {
      conflicts.push({
        id: booking.id,
        day_of_week: day.day_of_week,
        starts_at: booking.starts_at,
        service_name: booking.service_name,
      });
      continue;
    }
    const open = parseTimeToMinutes(day.opens_at);
    const close = parseTimeToMinutes(day.closes_at);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const end = new Date(booking.ends_at);
    const endMin = end.getHours() * 60 + end.getMinutes();
    if (
      open == null ||
      close == null ||
      startMin < open ||
      startMin >= close ||
      endMin > close
    ) {
      conflicts.push({
        id: booking.id,
        day_of_week: day.day_of_week,
        starts_at: booking.starts_at,
        service_name: booking.service_name,
      });
    }
  }
  return conflicts;
}

function defaultWeek(): WorkingHoursRow[] {
  return Array.from({ length: 7 }, (_, index) => ({
    day_of_week: index,
    opens_at: "09:00:00",
    closes_at: "18:00:00",
    is_closed: false,
  }));
}

export default function ShopHoursScreen() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId?: string; name?: string }>();
  const { notice, showNotice } = useNotice();

  const id = Number(shopId);

  const [hours, setHours] = useState<WorkingHoursRow[]>(defaultWeek());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [timePicker, setTimePicker] = useState<{
    index: number;
    field: "opens_at" | "closes_at";
  } | null>(null);
  const [conflicts, setConflicts] = useState<HoursConflict[] | null>(null);
  const [applySheet, setApplySheet] = useState(false);
  const [applySource, setApplySource] = useState(1);
  const [applyTargets, setApplyTargets] = useState<number[]>([1, 2, 3, 4, 5]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await loadWorkingHours(id);
      setHours(
        rows.length === 7
          ? rows
          : Array.from({ length: 7 }, (_, index) => {
              const row = rows.find((day) => day.day_of_week === index);
              return (
                row ?? {
                  day_of_week: index,
                  opens_at: "09:00:00",
                  closes_at: "18:00:00",
                  is_closed: false,
                }
              );
            })
      );
      setConflicts(null);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function updateDay(index: number, patch: Partial<WorkingHoursRow>) {
    setHours((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day))
    );
    setConflicts(null);
  }

  function applyPickedTime(
    index: number,
    field: "opens_at" | "closes_at",
    date: Date
  ) {
    updateDay(index, { [field]: timeFromDate(date) });
  }

  function handleTimePickerChange(
    event: DateTimePickerEvent,
    date?: Date
  ) {
    if (!timePicker || !date) {
      return;
    }
    if (Platform.OS === "android") {
      setTimePicker(null);
      if (event.type === "set") {
        applyPickedTime(timePicker.index, timePicker.field, date);
      }
      return;
    }
    applyPickedTime(timePicker.index, timePicker.field, date);
  }

  function openApplySheet() {
    const source = hours.find((day) => !day.is_closed)?.day_of_week ?? 1;
    setApplySource(source);
    setApplyTargets([1, 2, 3, 4, 5]);
    setApplySheet(true);
  }

  function toggleApplyTarget(dayOfWeek: number) {
    setApplyTargets((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((day) => day !== dayOfWeek)
        : [...prev, dayOfWeek]
    );
  }

  function applyToDays() {
    const source = hours.find((day) => day.day_of_week === applySource);
    if (!source || applyTargets.length === 0) {
      return;
    }
    setHours((prev) =>
      prev.map((day) =>
        applyTargets.includes(day.day_of_week)
          ? {
              ...day,
              opens_at: source.opens_at,
              closes_at: source.closes_at,
              is_closed: source.is_closed,
            }
          : day
      )
    );
    setConflicts(null);
    setApplySheet(false);
    showNotice(
      t("hours.copied_hours", { day: dayName(source.day_of_week), count: applyTargets.length }),
      "success"
    );
  }

  async function handleSave() {
    setError(null);
    for (const day of hours) {
      if (!day.is_closed) {
        const open = parseTimeToMinutes(day.opens_at);
        const close = parseTimeToMinutes(day.closes_at);
        if (open == null || close == null) {
          setError(
            t("hours.needs_open_close", { day: dayName(day.day_of_week) })
          );
          return;
        }
        if (close <= open) {
          setError(
            t("hours.closes_before_open", { day: dayName(day.day_of_week) })
          );
          return;
        }
      }
    }

    if (conflicts === null) {
      try {
        const bookings = await loadUpcomingBookings(id);
        const found = findHoursConflicts(hours, bookings);
        if (found.length > 0) {
          setConflicts(found);
          return;
        }
      } catch {
        setError(t("hours.could_not_check_conflicts"));
        return;
      }
    }

    setSaving(true);
    try {
      await saveWorkingHours(id, hours);
      showNotice(t("shop.hours_saved"), "success");
      setTimeout(() => router.back(), 800);
    } catch (e) {
      Alert.alert(t("error.could_not_save"), errorMessageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  }

  const applySourceDay = hours.find((day) => day.day_of_week === applySource);

  return (
    <Screen scroll paddingHorizontal={14}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("shop.shop_hours")}</Text>
      </View>
      <Text style={styles.subtitle}>
        {t("hours.opening_hours_subtitle")}
      </Text>

      {notice ? <NoticeBanner notice={notice} style={styles.notice} /> : null}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading && hours.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <Button
            title={t("hours.apply_to_multiple")}
            variant="outline"
            onPress={openApplySheet}
            style={styles.applyButton}
          />

          <View style={styles.daysList}>
            {hours.map((day) => {
              const isToday = day.day_of_week === todayDayOfWeek;
              return (
                <View key={day.day_of_week} style={styles.dayBlock}>
                  <Text
                    style={[styles.dayName, isToday && styles.dayNameToday]}
                  >
                    {dayName(day.day_of_week)}
                  </Text>
                  <View style={styles.dayCard}>
                    <View style={styles.dayValue}>
                      {day.is_closed ? (
                        <Text
                          style={[
                            styles.closedText,
                            isToday && styles.dayValueToday,
                          ]}
                        >
                          {t("shop.closed")}
                        </Text>
                      ) : (
                        <View style={styles.dayTimes}>
                          <Pressable
                            onPress={() =>
                              setTimePicker({
                                index: day.day_of_week,
                                field: "opens_at",
                              })
                            }
                            accessibilityRole="button"
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.timePressable,
                              pressed && styles.timePressablePressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeText,
                                isToday && styles.dayValueToday,
                              ]}
                            >
                              {formatTimeOfDay(day.opens_at)}
                            </Text>
                          </Pressable>
                          <Text style={styles.dash}>–</Text>
                          <Pressable
                            onPress={() =>
                              setTimePicker({
                                index: day.day_of_week,
                                field: "closes_at",
                              })
                            }
                            accessibilityRole="button"
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.timePressable,
                              pressed && styles.timePressablePressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeText,
                                isToday && styles.dayValueToday,
                              ]}
                            >
                              {formatTimeOfDay(day.closes_at)}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                    <Switch
                      value={!day.is_closed}
                      onValueChange={(value) =>
                        updateDay(day.day_of_week, { is_closed: !value })
                      }
                      trackColor={{ true: colors.primary, false: colors.border }}
                      thumbColor={colors.white}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {conflicts && conflicts.length > 0 ? (
            <View style={styles.conflictCard}>
              <Text style={styles.conflictTitle}>
                {t("hours.conflict_title")}
              </Text>
              {conflicts.map((conflict) => (
                <Text key={conflict.id} style={styles.conflictRow}>
                  {dayName(conflict.day_of_week)} · {conflict.service_name} ·{" "}
                  {localTimeLabel(new Date(conflict.starts_at))}
                </Text>
              ))}
              <Text style={styles.conflictHint}>
                {t("hours.conflict_hint")}
              </Text>
            </View>
          ) : null}

          <Button
            title={
              conflicts && conflicts.length > 0
                ? t("hours.save_anyway", { count: conflicts.length })
                : t("shop.save_hours")
            }
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          />
        </>
      )}

      {Platform.OS === "android" && timePicker ? (
        <DateTimePicker
          value={dateFromTimeValue(hours[timePicker.index]?.[timePicker.field])}
          mode="time"
          is24Hour={false}
          onChange={handleTimePickerChange}
        />
      ) : null}

      <Modal
        visible={Platform.OS === "ios" && timePicker !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setTimePicker(null)}
      >
        <View style={styles.timePickerModal}>
          <Pressable
            style={styles.timePickerBackdrop}
            onPress={() => setTimePicker(null)}
          />
          <View style={styles.timePickerCard}>
            <View style={styles.timePickerHandle} />
            <Text style={styles.timePickerTitle}>{t("hours.change_time")}</Text>
            {timePicker && (
              <DateTimePicker
                value={dateFromTimeValue(hours[timePicker.index]?.[timePicker.field])}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={handleTimePickerChange}
              />
            )}
            <Button title={t("common.done")} onPress={() => setTimePicker(null)} />
          </View>
        </View>
      </Modal>

      <BottomSheet
        visible={applySheet}
        onClose={() => setApplySheet(false)}
      >
        <Text style={styles.sheetTitle}>{t("hours.apply_to_days_title")}</Text>
        <Text style={styles.sheetText}>
          {t("hours.apply_to_days_desc")}
        </Text>

        <Text style={styles.sheetLabel}>{t("hours.copy_from")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {hours.map((day) => (
            <FilterChip
              key={day.day_of_week}
              label={DAY_CHIP_LABELS[day.day_of_week]}
              selected={applySource === day.day_of_week}
              onPress={() => setApplySource(day.day_of_week)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sheetLabel}>{t("hours.apply_to")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {hours.map((day) => (
            <FilterChip
              key={day.day_of_week}
              label={DAY_CHIP_LABELS[day.day_of_week]}
              selected={applyTargets.includes(day.day_of_week)}
              onPress={() => toggleApplyTarget(day.day_of_week)}
            />
          ))}
        </ScrollView>

        <View style={styles.applyPreview}>
          <Text style={styles.applyPreviewLabel}>
            {applySourceDay
              ? applySourceDay.is_closed
                ? t("hours.day_is_closed", { day: dayName(applySource) })
                : t("hours.day_schedule", {
                    day: dayName(applySource),
                    open: formatTimeOfDay(applySourceDay.opens_at),
                    close: formatTimeOfDay(applySourceDay.closes_at),
                  })
              : ""}
          </Text>
        </View>

        <Button
          title={
            applyTargets.length === 1
              ? t("hours.apply_to_count", { count: applyTargets.length })
              : t("hours.apply_to_count_plural", { count: applyTargets.length })
          }
          onPress={applyToDays}
          disabled={applyTargets.length === 0}
        />
      </BottomSheet>
    </Screen>
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
  applyButton: {
    marginBottom: spacing.lg,
  },
  daysList: {
    gap: spacing.md,
  },
  dayBlock: {
    gap: spacing.xs,
  },
  dayName: {
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.muted,
  },
  dayNameToday: {
    fontWeight: "700",
    color: colors.text,
  },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  dayValue: {
    flex: 1,
  },
  dayValueToday: {
    fontWeight: "600",
    color: colors.primaryDark,
  },
  dayTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dash: {
    fontSize: 14,
    color: colors.muted,
  },
  timePressable: {
    paddingVertical: spacing.xs,
  },
  timePressablePressed: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 14,
    color: colors.text,
  },
  closedText: {
    fontSize: 14,
    color: colors.muted,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  conflictCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
  conflictRow: {
    fontSize: 13,
    color: colors.text,
  },
  conflictHint: {
    fontSize: 12,
    color: colors.danger,
  },
  timePickerModal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  timePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  timePickerCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: "stretch",
  },
  timePickerHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
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
  sheetLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipRow: {
    gap: spacing.sm,
  },
  applyPreview: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
  },
  applyPreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
});
