import { AccountScreen } from "@/components/ui/AccountScreen";
import { BarberProfileSection } from "@/components/ui/BarberProfileSection";

export default function ProfileScreen() {
  return (
    <AccountScreen role="barber">
      <BarberProfileSection />
    </AccountScreen>
  );
}
