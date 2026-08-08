import { AccountScreen } from "@/components/ui/AccountScreen";
import { CustomerProfileSection } from "@/components/ui/CustomerProfileSection";

export default function ProfileScreen() {
  return (
    <AccountScreen role="customer">
      <CustomerProfileSection />
    </AccountScreen>
  );
}
