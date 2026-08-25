import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { CompleteProfileFirstSheet } from "@/components/ui/CompleteProfileFirstSheet";
import { DetailRow, DetailsCard } from "@/components/ui/DetailsCard";
import { JoinShopForm } from "@/components/ui/JoinShopForm";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { loadMemberShops, loadMyMemberships } from "@/lib/barber";
import {
  fetchOwnProfile,
  isBarberProfessionalComplete,
  type OwnProfile,
} from "@/lib/profile";
import { t } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";
import { useFocusLoad } from "@/lib/useFocusLoad";
import { useNotice } from "@/lib/useNotice";

type BarberProfileData = {
  profile: OwnProfile | null;
  shopNames: string[];
};

/**
 * Barber profile page sections: professional completion state (DB-backed) and
 * shop membership. Joining a shop is gated on the same completion check the
 * `redeem_shop_invitation` RPC enforces.
 */
export function BarberProfileSection() {
  const { user } = useUser();
  const router = useRouter();
  const { notice, showNotice } = useNotice();
  const [joinVisible, setJoinVisible] = useState(false);
  const [completeProfileVisible, setCompleteProfileVisible] = useState(false);

  const loader = useCallback(async () => {
    if (!user?.id) {
      return { profile: null, shopNames: [] };
    }
    const [profile, memberships] = await Promise.all([
      fetchOwnProfile(user.id),
      loadMyMemberships(user.id),
    ]);
    const shops = await loadMemberShops(
      memberships.map((member) => member.shop_id)
    );
    return {
      profile,
      shopNames: shops.map((shop) => shop.name),
    };
  }, [user?.id]);

  const { data, setData, loading, error } = useFocusLoad<BarberProfileData>(
    loader,
    [user?.id]
  );

  const complete = isBarberProfessionalComplete(data?.profile ?? null);

  async function handleJoined(shopName: string) {
    showNotice(t("shop.you_joined", { shopName }), "success");
    setData(await loader());
  }

  function handleJoinPress() {
    if (complete) {
      setJoinVisible(true);
    } else {
      setCompleteProfileVisible(true);
    }
  }

  const yearsLabel =
    data?.profile?.years_of_experience != null
      ? `${data.profile.years_of_experience} ${
          data.profile.years_of_experience === 1 ? t("barber.year") : t("barber.years")
        }`
      : null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t("barber.professional_profile")}
        actionLabel={t("common.edit")}
        onAction={() => router.push("/onboarding/barber-professional")}
      />

      {complete ? (
        <NoticeBanner
          variant="soft"
          notice={{ message: t("barber.professional_profile_complete"), tone: "success" }}
        />
      ) : (
        <View style={styles.incompleteCard}>
          <Text style={styles.incompleteText}>
            {t("barber.complete_profile_to_join")}
          </Text>
          <Button
            title={t("barber.complete_professional_profile")}
            onPress={() => router.push("/onboarding/barber-professional")}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <DetailsCard>
          <DetailRow
            label={t("barber.specialty")}
            value={data?.profile?.specialty ?? t("barber.not_set")}
            numberOfLines={2}
          />
          <DetailRow label={t("barber.experience")} value={yearsLabel ?? t("barber.not_set")} />
          {!!data?.profile?.bio && (
            <DetailRow
              label={t("barber.bio")}
              value={data.profile.bio}
              numberOfLines={2}
            />
          )}
        </DetailsCard>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <SectionHeader title={t("barber.shop")} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !data || data.shopNames.length === 0 ? (
        <View style={styles.shopCard}>
          <Text style={styles.shopEmpty}>{t("shop.not_joined_yet")}</Text>
          <Text style={styles.shopHint}>
            {t("shop.ask_for_code")}
          </Text>
          <Button
            title={t("shop.join_with_code")}
            variant="outline"
            onPress={handleJoinPress}
          />
        </View>
      ) : (
        <View style={styles.card}>
          {data.shopNames.map((name) => (
            <View key={name} style={styles.row}>
              <Text style={styles.value} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {notice ? <NoticeBanner notice={notice} /> : null}

      <JoinShopForm
        visible={joinVisible}
        onClose={() => setJoinVisible(false)}
        onJoined={(shopName) => {
          setJoinVisible(false);
          void handleJoined(shopName);
        }}
      />
      <CompleteProfileFirstSheet
        visible={completeProfileVisible}
        onClose={() => setCompleteProfileVisible(false)}
        onCompleteProfile={() => {
          setCompleteProfileVisible(false);
          router.push("/onboarding/barber-professional");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  incompleteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  incompleteText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  loading: {
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: 98,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  shopCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: 98,
  },
  shopEmpty: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  shopHint: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
