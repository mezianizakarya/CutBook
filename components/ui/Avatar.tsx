import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";


import { avatarColor, getInitials } from "@/lib/avatar";
import { colors, radius } from "@/lib/theme";

type AvatarProps = {
  fullName?: string | null;
  imageUrl?: string | null;
  size?: number;
};

export function Avatar({ fullName, imageUrl, size = 96 }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: radius.full };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={dimensions} contentFit="cover" />;
  }

  return (
    <View style={[styles.initials, dimensions, { backgroundColor: avatarColor(fullName) }]}>
      <AppText style={[styles.initialsText, { fontSize: size * 0.38 }]}>
        {getInitials(fullName)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: colors.primary,
    fontWeight: "700",
  },
});
