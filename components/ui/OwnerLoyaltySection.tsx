import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppText } from "@/components/AppText";


import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TextField } from "@/components/ui/TextField";
import { errorMessageFromUnknown } from "@/lib/errors";
import { formatCents } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useUserCountry } from "@/lib/user-country";
import {
  deleteLoyaltyMilestone,
  loadShopLoyalty,
  saveLoyaltyMilestone,
  setLoyaltyProgram,
  type LoyaltyMilestone,
  type LoyaltyRewardType,
  type ShopLoyalty,
} from "@/lib/loyalty";
import { colors, radius, spacing } from "@/lib/theme";
import { useConfirmAction } from "@/lib/useConfirmAction";
import type { NoticeTone } from "@/lib/useNotice";

function getRewardTypeLabels(): Record<LoyaltyRewardType, string> {
  return {
    percentage_discount: t("loyalty.percentage_off"),
    fixed_discount: t("loyalty.fixed_off"),
    free_service: t("loyalty.free"),
    custom: t("loyalty.custom"),
  };
}

function rewardMeta(milestone: LoyaltyMilestone, countryCode?: string | null): string {
  if (milestone.reward_type === "percentage_discount") {
    return `${milestone.reward_value}${t("loyalty.percentage_off")}`;
  }
  if (milestone.reward_type === "fixed_discount") {
    return `${formatCents(Math.round((milestone.reward_value ?? 0) * 100), countryCode)} ${t("loyalty.fixed_off_suffix")}`;
  }
  if (milestone.reward_type === "free_service") {
    return t("loyalty.free_service");
  }
  return milestone.reward_description || t("loyalty.custom_reward");
}

type OwnerLoyaltySectionProps = {
  shopId: number;
  onNotice: (message: string, tone?: NoticeTone) => void;
};

export function OwnerLoyaltySection({ shopId, onNotice }: OwnerLoyaltySectionProps) {
  const [loyalty, setLoyalty] = useState<ShopLoyalty | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sheet, setSheet] = useState<{
    mode: "create" | "edit";
    milestone?: LoyaltyMilestone;
  } | null>(null);

  const load = useCallback(async () => {
    const next = await loadShopLoyalty(shopId);
    setLoyalty(next);
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch(() => undefined)
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

  async function handleToggle(value: boolean) {
    if (!loyalty?.program || toggling) {
      return;
    }
    const previous = loyalty.program;
    setToggling(true);
    setLoyalty((prev) =>
      prev?.program
        ? { ...prev, program: { ...prev.program, enabled: value } }
        : prev
    );
    try {
      const updated = await setLoyaltyProgram(shopId, value);
      setLoyalty((prev) => (prev ? { ...prev, program: updated } : prev));
      onNotice(
        value ? t("notice.program_turned_on") : t("notice.program_turned_off")
      );
    } catch (e) {
      setLoyalty((prev) =>
        prev?.program
          ? { ...prev, program: { ...prev.program, enabled: previous.enabled } }
          : prev
      );
      Alert.alert(t("loyalty.could_not_update_program"), errorMessageFromUnknown(e));
    } finally {
      setToggling(false);
    }
  }

  async function handleEnable() {
    setToggling(true);
    try {
      const updated = await setLoyaltyProgram(shopId, true);
      setLoyalty((prev) => (prev ? { ...prev, program: updated } : { program: updated, milestones: [] }));
      onNotice(t("notice.program_turned_on"));
    } catch (e) {
      Alert.alert(t("loyalty.could_not_turn_on"), errorMessageFromUnknown(e));
    } finally {
      setToggling(false);
    }
  }

  async function handleMilestoneSave(
    visitCount: number,
    input: {
      reward_type: LoyaltyRewardType;
      reward_title: string;
      reward_description: string;
      reward_value: number | null;
      active: boolean;
    }
  ) {
    if (!loyalty?.program) {
      return;
    }
    try {
      if (sheet?.mode === "edit" && sheet.milestone) {
        await saveLoyaltyMilestone(
          loyalty.program.id,
          visitCount,
          {
            reward_type: input.reward_type,
            reward_title: input.reward_title,
            reward_description: input.reward_description || null,
            reward_value: input.reward_value,
            active: input.active,
          },
          sheet.milestone.id
        );
        onNotice(t("notice.reward_updated"));
      } else {
        await saveLoyaltyMilestone(loyalty.program.id, visitCount, {
          reward_type: input.reward_type,
          reward_title: input.reward_title,
          reward_description: input.reward_description || null,
          reward_value: input.reward_value,
          active: input.active,
        });
        onNotice(t("notice.reward_added"));
      }
      setSheet(null);
      await load();
    } catch (e) {
      Alert.alert(t("loyalty.could_not_save_reward"), errorMessageFromUnknown(e));
    }
  }

  async function handleDelete(milestone: LoyaltyMilestone) {
    try {
      await deleteLoyaltyMilestone(milestone.id);
      onNotice(t("notice.reward_removed"));
      await load();
    } catch (e) {
      Alert.alert(t("loyalty.could_not_delete_reward"), errorMessageFromUnknown(e));
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const program = loyalty?.program ?? null;
  const milestones = loyalty?.milestones ?? [];

  return (
    <>
      <SectionHeader
        title={t("loyalty.loyalty_program")}
        actionLabel={program ? t("loyalty.add_reward") : undefined}
        onAction={program ? () => setSheet({ mode: "create" }) : undefined}
      />

      {!program ? (
        <View style={styles.emptyCard}>
          <AppText style={styles.emptyTitle}>{t("loyalty.no_program_yet")}</AppText>
          <AppText style={styles.emptySubtitle}>
            {t("loyalty.program_description")}
          </AppText>
          <Button
            title={t("loyalty.turn_on_program")}
            onPress={() => void handleEnable()}
            loading={toggling}
            disabled={toggling}
          />
        </View>
      ) : (
        <>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <AppText style={styles.toggleTitle}>{t("loyalty.program_active")}</AppText>
              <AppText style={styles.toggleSubtitle}>
                {program.enabled
                  ? t("loyalty.program_active_description")
                  : t("loyalty.program_off")}
              </AppText>
            </View>
            <Switch
              value={program.enabled}
              onValueChange={(value) => void handleToggle(value)}
              disabled={toggling}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          {milestones.length === 0 ? (
            <View style={styles.emptyCard}>
              <AppText style={styles.emptyTitle}>{t("loyalty.no_rewards_yet")}</AppText>
              <AppText style={styles.emptySubtitle}>
                {t("loyalty.add_rewards_description")}
              </AppText>
            </View>
          ) : (
            milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                onPress={() => setSheet({ mode: "edit", milestone })}
                onDelete={() => void handleDelete(milestone)}
              />
            ))
          )}
        </>
      )}

      <MilestoneSheet
        visible={sheet !== null}
        milestone={sheet?.mode === "edit" ? sheet.milestone : undefined}
        onClose={() => setSheet(null)}
        onSave={(visitCount, input) => void handleMilestoneSave(visitCount, input)}
      />
    </>
  );
}

function MilestoneRow({
  milestone,
  onPress,
  onDelete,
}: {
  milestone: LoyaltyMilestone;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { confirming, count, press } = useConfirmAction(onDelete);
  const userCountry = useUserCountry();

  return (
    <View style={styles.milestoneRow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.milestoneMain, pressed && styles.pressed]}
      >
        <View style={styles.visitPill}>
          <AppText style={styles.visitPillText}>{milestone.visit_count}</AppText>
        </View>
        <View style={styles.milestoneInfo}>
          <AppText style={styles.milestoneTitle} numberOfLines={1}>
            {milestone.reward_title}
          </AppText>
          <AppText style={styles.milestoneMeta} numberOfLines={1}>
            {milestone.reward_type === "custom"
              ? milestone.reward_description || t("loyalty.custom_reward")
              : rewardMeta(milestone, userCountry)}
          </AppText>
        </View>
        <AppText
          style={[
            styles.badgeText,
            milestone.active ? styles.activeText : styles.inactiveText,
          ]}
        >
          {milestone.active ? t("loyalty.active") : t("loyalty.hidden")}
        </AppText>
      </Pressable>
      <Pressable
        onPress={press}
        hitSlop={4}
        style={[
          styles.deleteButton,
          confirming && styles.deleteButtonConfirming,
        ]}
      >
        <AppText
          style={[
            styles.deleteButtonText,
            confirming && styles.deleteButtonTextConfirming,
          ]}
        >
          {confirming ? t("loyalty.confirm_delete", { count }) : t("loyalty.delete")}
        </AppText>
      </Pressable>
    </View>
  );
}

function MilestoneSheet({
  visible,
  milestone,
  onClose,
  onSave,
}: {
  visible: boolean;
  milestone?: LoyaltyMilestone;
  onClose: () => void;
  onSave: (
    visitCount: number,
    input: {
      reward_type: LoyaltyRewardType;
      reward_title: string;
      reward_description: string;
      reward_value: number | null;
      active: boolean;
    }
  ) => void;
}) {
  const [visitCount, setVisitCount] = useState("");
  const [rewardType, setRewardType] = useState<LoyaltyRewardType>("free_service");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isEditing = milestone !== undefined;

  useEffect(() => {
    if (visible) {
      setVisitCount(milestone ? String(milestone.visit_count) : "");
      setRewardType(milestone?.reward_type ?? "free_service");
      setRewardTitle(milestone?.reward_title ?? "");
      setRewardDescription(milestone?.reward_description ?? "");
      setRewardValue(
        milestone?.reward_value != null ? String(milestone.reward_value) : ""
      );
      setActive(milestone?.active ?? true);
      setError(null);
    }
  }, [visible, milestone]);

  function handleSave() {
    const visits = Number(visitCount);
    if (!Number.isInteger(visits) || visits <= 0) {
      setError(t("loyalty.enter_visit_count"));
      return;
    }
    const title = rewardTitle.trim();
    if (!title) {
      setError(t("loyalty.give_title"));
      return;
    }
    let value: number | null = null;
    if (rewardType === "percentage_discount" || rewardType === "fixed_discount") {
      const parsed = Number(rewardValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError(t("loyalty.enter_valid_value"));
        return;
      }
      if (rewardType === "percentage_discount" && parsed > 100) {
        setError(t("loyalty.percentage_exceeds"));
        return;
      }
      value = parsed;
    }
    onSave(visits, {
      reward_type: rewardType,
      reward_title: title,
      reward_description: rewardDescription.trim(),
      reward_value: value,
      active,
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText style={styles.sheetTitle}>
        {isEditing ? t("loyalty.edit_reward") : t("loyalty.add_reward_title")}
      </AppText>
      <TextField
        label={t("loyalty.visit_count")}
        value={visitCount}
        onChangeText={setVisitCount}
        placeholder="5"
        keyboardType="numeric"
      />
      <View style={styles.typeWrap}>
        {Object.entries(getRewardTypeLabels()).map(([type, label]) => (
          <FilterChip
            key={type}
            label={label}
            selected={rewardType === type}
            onPress={() => setRewardType(type as LoyaltyRewardType)}
          />
        ))}
      </View>
      <TextField
        label={t("loyalty.reward_title")}
        value={rewardTitle}
        onChangeText={setRewardTitle}
        placeholder={t("loyalty.free_service")}
        autoCapitalize="sentences"
      />
      {rewardType === "percentage_discount" || rewardType === "fixed_discount" ? (
        <TextField
          label={rewardType === "percentage_discount" ? t("loyalty.value_percent") : t("loyalty.value_dollar")}
          value={rewardValue}
          onChangeText={setRewardValue}
          placeholder={rewardType === "percentage_discount" ? "10" : "5"}
          keyboardType="numeric"
        />
      ) : null}
      <TextField
        label={t("loyalty.description_optional")}
        value={rewardDescription}
        onChangeText={setRewardDescription}
        placeholder={t("loyalty.whats_included")}
        autoCapitalize="sentences"
      />
      <View style={styles.activeRow}>
        <View style={styles.toggleInfo}>
          <AppText style={styles.toggleTitle}>{t("loyalty.active_toggle")}</AppText>
          <AppText style={styles.toggleSubtitle}>
            {t("loyalty.inactive_description")}
          </AppText>
        </View>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>
      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
      <Button
        title={isEditing ? t("common.save") : t("loyalty.add_reward")}
        onPress={handleSave}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  milestoneRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  milestoneMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  visitPill: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  visitPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  milestoneInfo: {
    flex: 1,
    gap: 2,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  milestoneMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.muted,
  },
  deleteButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  deleteButtonConfirming: {
    backgroundColor: colors.dangerSoft,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  deleteButtonTextConfirming: {
    color: colors.danger,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
