import { useUser } from "@clerk/expo";

import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchMyReputation,
  getReputationLabel,
  REPUTATION_TONES,
  type CustomerReputation,
} from "@/lib/reputation";
import { useFocusLoad } from "@/lib/useFocusLoad";

/**
 * Trust-level badge for the signed-in customer's own profile. Renders the
 * database-generated level (admin override wins); a missing row means the
 * customer has no booking history yet and shows "New". Never calculated or
 * written on the client.
 */
export function ReputationBadge() {
  const { user } = useUser();
  const { data } = useFocusLoad<CustomerReputation | null>(
    async () => {
      if (!user?.id) {
        return null;
      }
      return fetchMyReputation();
    },
    [user?.id]
  );

  const level = data?.level ?? "new";

  return (
    <StatusBadge
      label={getReputationLabel(level)}
      tone={REPUTATION_TONES[level]}
    />
  );
}
