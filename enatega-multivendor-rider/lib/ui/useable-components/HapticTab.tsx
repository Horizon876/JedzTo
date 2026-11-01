import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";

/** Tab button without click sound / haptics — only order alert may play audio. */
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      android_disableSound
      pressRetentionOffset={props.pressRetentionOffset}
    />
  );
}
