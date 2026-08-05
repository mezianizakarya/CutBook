import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useCallback, useContext, useMemo } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { FloatingTabBarItem } from "./FloatingTabBarItem";
import { FloatingTabContainer } from "./FloatingTabContainer";
import { TAB_BAR } from "./constants";
import { ROLE_TABS, type Role } from "@/lib/roles";

type TabRoute = BottomTabBarProps["state"]["routes"][number];

type FloatingTabBarProps = BottomTabBarProps & {
  role: Role;
  /** Renders the real profile avatar on the profile tab (Customer/Barber/Owner). */
  showProfileAvatar?: boolean;
};

type TabRouteItemProps = {
  route: TabRoute;
  navigation: BottomTabBarProps["navigation"];
  label: string;
  icon: string;
  iconImage?: number;
  iconImageActive?: number;
  isProfile: boolean;
  isFocused: boolean;
};

function TabRouteItem({
  route,
  navigation,
  label,
  icon,
  iconImage,
  iconImageActive,
  isProfile,
  isFocused,
}: TabRouteItemProps) {
  const handlePress = useCallback(() => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }, [isFocused, navigation, route.key, route.name, route.params]);

  const handleLongPress = useCallback(() => {
    navigation.emit({ type: "tabLongPress", target: route.key });
  }, [navigation, route.key]);

  return (
    <FloatingTabBarItem
      label={label}
      icon={icon}
      iconImage={iconImage}
      iconImageActive={iconImageActive}
      active={isFocused}
      showAvatar={isProfile}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  );
}

/**
 * Reusable floating iOS-style tab bar shared by every role navigator.
 * The bar overlays the bottom of the screen (content stays visible behind and
 * below the capsule) and floats above the bottom safe area.
 */
export function FloatingTabBar({
  state,
  navigation,
  insets,
  role,
  showProfileAvatar = false,
}: FloatingTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const bandHeight = TAB_BAR.topMargin + TAB_BAR.height + TAB_BAR.bottomMargin + insets.bottom;

  const items = useMemo(
    () =>
      state.routes.map((route) => {
        const config = ROLE_TABS[role].find((tab) => tab.name === route.name);
        return {
          route,
          label: config?.title ?? route.name,
          icon: config?.icon ?? "ellipse-outline",
          iconImage: config?.iconImage,
          iconImageActive: config?.iconImageActive,
          isProfile: showProfileAvatar && config?.name === "profile",
        };
      }),
    [role, showProfileAvatar, state.routes],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange?.(event.nativeEvent.layout.height);
    },
    [onHeightChange],
  );

  return (
    <View
      style={[styles.band, { height: bandHeight }]}
      onLayout={handleLayout}
      pointerEvents="box-none"
    >
      <View style={styles.capsule}>
        <FloatingTabContainer>
          <View style={styles.items}>
            {items.map((item, index) => (
              <TabRouteItem
                key={item.route.key}
                route={item.route}
                navigation={navigation}
                label={item.label}
                icon={item.icon}
                iconImage={item.iconImage}
                iconImageActive={item.iconImageActive}
                isProfile={item.isProfile}
                isFocused={state.index === index}
              />
            ))}
          </View>
        </FloatingTabContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  capsule: {
    position: "absolute",
    top: TAB_BAR.topMargin,
    left: TAB_BAR.horizontalMargin,
    right: TAB_BAR.horizontalMargin,
    height: TAB_BAR.height,
  },
  items: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});
