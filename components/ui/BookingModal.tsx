import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents, parseTimeToMinutes, toDateKey } from "@/lib/format";
import { useUserCountry } from "@/lib/user-country";
import type { ShopMember, ShopService } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import { getLocale, t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

const DAYS_AHEAD = 14;
const SLOT_STEP_MINUTES = 30;

type BookingModalProps = {
  visible: boolean;
  shopId: number;
  shopName: string;
  shopCountry?: string | null;
  services: ShopService[];
  members: ShopMember[];
  onClose: () => void;
  onBooked: () => void;
};

type Slot = { starts_at: string; ends_at: string; label: string };

function buildDayList(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let index = 0; index < DAYS_AHEAD; index += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + index);
    days.push(day);
  }
  return days;
}

function formatDayLabel(day: Date): string {
  return day.toLocaleDateString(getLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function BookingModal({
  visible,
  shopId,
  shopName,
  shopCountry,
  services,
  members,
  onClose,
  onBooked,
}: BookingModalProps) {
  const { user } = useUser();
  const userCountry = useUserCountry();
  const days = useMemo(buildDayList, []);

  const regionMismatch = !!shopCountry && !!userCountry && shopCountry !== userCountry;

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setServiceId(null);
      setMemberId(null);
      setDateKey(null);
      setSlots(null);
      setSelectedSlot(null);
      setNote("");
      setSubmitting(false);
      setError(null);
      setCreatedId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !shopId) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const selectedDay = days.find((day) => toDateKey(day) === dateKey);
        const selectedService = services.find((service) => service.id === serviceId);
        if (!selectedDay || !selectedService) {
          if (!cancelled) {
            setSlots(null);
          }
          return;
        }
        const weekday = selectedDay.getDay();
        const { data: hours, error: hoursError } = await supabase
          .from("working_hours")
          .select("opens_at, closes_at, is_closed")
          .eq("shop_id", shopId)
          .eq("day_of_week", weekday)
          .maybeSingle();
        if (hoursError || !hours || hours.is_closed || !hours.opens_at || !hours.closes_at) {
          if (!cancelled) {
            setSlots([]);
          }
          return;
        }
        const generated = generateSlots(selectedDay, hours.opens_at, hours.closes_at, selectedService.duration_minutes);
        if (!cancelled) {
          setSlots(generated);
          setSelectedSlot(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessageFromUnknown(e));
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, dateKey, serviceId, shopId, services, days]);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const selectedMember = members.find((member) => member.id === memberId) ?? null;
  const canSubmit = !!selectedService && !!selectedMember && !!selectedSlot && !submitting && !regionMismatch;

  async function handleBook() {
    if (!user?.id || !selectedService || !selectedMember || !selectedSlot) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("bookings")
        .insert({
          shop_id: shopId,
          customer_id: user.id,
          staff_id: selectedMember.id,
          service_id: selectedService.id,
          status: "pending",
          starts_at: selectedSlot.starts_at,
          ends_at: selectedSlot.ends_at,
          service_name: selectedService.name,
          service_price_cents: selectedService.price_cents,
          service_duration_minutes: selectedService.duration_minutes,
          note: note.trim() || null,
        })
        .select("id")
        .single();
      if (insertError) {
        const message = insertError.message.toLowerCase();
        if (message.includes("exclude") || message.includes("overlap")) {
          setError(t("shop.time_just_booked"));
          return;
        }
        throw insertError;
      }
      setCreatedId((data as { id: number }).id);
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (createdId !== null) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.success}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={28} color={colors.white} />
          </View>
          <AppText style={styles.successTitle}>{t("shop.booking_requested_title")}</AppText>
          <AppText style={styles.successSubtitle}>
            {t("shop.booking_requested_message", { shopName })}
          </AppText>
          <Button
            title={t("shop.view_my_bookings")}
            onPress={() => {
              onClose();
              onBooked();
            }}
            style={styles.actionButton}
          />
          <Button title={t("common.close")} variant="outline" onPress={onClose} style={styles.cancelButton} />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText style={styles.title}>{t("shop.book_at_shop", { shopName })}</AppText>
      <AppText style={styles.subtitle}>
        {t("shop.pick_service_barber")}
      </AppText>

      {regionMismatch && (
        <View style={styles.regionWarning}>
          <Ionicons name="warning" size={16} color="#b45309" />
          <AppText style={styles.regionWarningText}>
            {t("shop.different_region", { userCountry })}
          </AppText>
        </View>
      )}

      <AppText style={styles.stepTitle}>{t("shop.service")}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {services.map((service) => {
          const isActive = serviceId === service.id;
          return (
            <Pressable
              key={service.id}
              onPress={() => {
                setServiceId(service.id);
                setSelectedSlot(null);
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <AppText style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {service.name} · {formatCents(service.price_cents, userCountry)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <AppText style={styles.stepTitle}>{t("shop.barber")}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {members.map((member) => {
          const isActive = memberId === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => {
                setMemberId(member.id);
                setSelectedSlot(null);
              }}
              style={[styles.memberChip, isActive && styles.memberChipActive]}
            >
              <Avatar
                fullName={member.display_name}
                imageUrl={member.avatar_url}
                size={28}
              />
              <AppText
                style={[styles.memberChipLabel, isActive && styles.memberChipLabelActive]}
              >
                {member.display_name || "—"}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <AppText style={styles.stepTitle}>{t("shop.date")}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {days.map((day) => {
          const key = toDateKey(day);
          const isActive = dateKey === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setDateKey(key);
                setSelectedSlot(null);
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <AppText style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {formatDayLabel(day)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {dateKey !== null && (
        <>
          <AppText style={styles.stepTitle}>{t("shop.time")}</AppText>
          {loadingSlots ? (
            <AppText style={styles.hint}>{t("shop.checking_availability")}</AppText>
          ) : slots === null ? (
            <AppText style={styles.hint}>{t("shop.pick_first")}</AppText>
          ) : slots.length === 0 ? (
            <AppText style={styles.hint}>{t("shop.no_available_slots")}</AppText>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const isActive = selectedSlot?.starts_at === slot.starts_at;
                return (
                  <Pressable
                    key={slot.starts_at}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slot, isActive && styles.slotActive]}
                  >
                    <AppText style={[styles.slotLabel, isActive && styles.slotLabelActive]}>
                      {slot.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      {!!error && <AppText style={styles.error}>{error}</AppText>}

      <TextField
        label={t("shop.note_for_barber")}
        value={note}
        onChangeText={setNote}
        placeholder={t("shop.anything_they_should_know")}
        multiline
        autoCapitalize="sentences"
        style={styles.noteField}
      />

      <Button
        title={t("shop.request_booking_button")}
        onPress={handleBook}
        loading={submitting}
        disabled={!canSubmit}
      />
      <Button title={t("common.cancel")} variant="outline" onPress={onClose} style={styles.cancelButton} />
    </BottomSheet>
  );
}

function generateSlots(
  day: Date,
  opensAt: string,
  closesAt: string,
  durationMinutes: number
): Slot[] {
  const open = parseTimeToMinutes(opensAt);
  const close = parseTimeToMinutes(closesAt);
  if (open == null || close == null) {
    return [];
  }
  const now = new Date();
  const slots: Slot[] = [];
  for (let start = open; start + durationMinutes <= close; start += SLOT_STEP_MINUTES) {
    const startsAt = new Date(day);
    startsAt.setHours(0, 0, 0, 0);
    startsAt.setMinutes(start);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    if (startsAt.getTime() <= now.getTime()) {
      continue;
    }
    slots.push({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      label: startsAt.toLocaleTimeString(getLocale(), {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }
  return slots;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: -spacing.sm,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
    paddingEnd: 6,
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
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  memberChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  memberChipLabelActive: {
    color: colors.white,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slot: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  slotLabelActive: {
    color: colors.white,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
  },
  regionWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#fef3c7",
  },
  regionWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  noteField: {
    marginTop: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
  success: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  actionButton: {
    marginTop: spacing.sm,
  },
});
