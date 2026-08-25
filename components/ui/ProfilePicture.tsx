import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AlertButton,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { errorMessageFromUnknown } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/lib/theme";

const AVATAR_SIZE = 80;

async function syncAvatarUrl(user: { id: string; hasImage: boolean; imageUrl: string }) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: user.hasImage ? user.imageUrl : null })
    .eq("id", user.id);
  if (error) {
    console.warn("Failed to sync avatar_url to Supabase:", error.message);
  }
}

export function ProfilePicture() {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(file: string) {
    setError(null);
    setUploading(true);
    try {
      await user?.setProfileImage({ file });
      await user?.reload();
      if (user) {
        await syncAvatarUrl(user);
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleChoosePhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("account.photo_library_required"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      setError(t("account.could_not_read_photo"));
      return;
    }
    await uploadImage(`data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`);
  }

  async function handleRemovePhoto() {
    setError(null);
    setUploading(true);
    try {
      await user?.setProfileImage({ file: null });
      await user?.reload();
      if (user) {
        await syncAvatarUrl(user);
      }
    } catch (e) {
      setError(errorMessageFromUnknown(e));
    } finally {
      setUploading(false);
    }
  }

  function handlePress() {
    const buttons: AlertButton[] = [{ text: t("account.choose_photo"), onPress: handleChoosePhoto }];
    if (user?.hasImage) {
      buttons.push({ text: t("account.remove_photo"), onPress: handleRemovePhoto, style: "destructive" });
    }
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(t("account.profile_picture"), undefined, buttons);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={uploading}
        accessibilityRole="imagebutton"
        accessibilityLabel="Profile picture"
      >
        <Avatar
          fullName={user?.fullName}
          imageUrl={user?.hasImage ? user?.imageUrl : null}
          size={AVATAR_SIZE}
        />
        {uploading && (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
      </Pressable>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
});
