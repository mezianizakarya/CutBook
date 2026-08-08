import { AccountScreen } from "@/components/ui/AccountScreen";
import { OwnerProfileSection } from "@/components/ui/OwnerProfileSection";

export default function ProfileScreen() {
  return (
    <AccountScreen role="owner">
      <OwnerProfileSection />
    </AccountScreen>
  );
}
