import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import {
  TOGGLE_ACCEPT_EXTRA_ORDERS,
  UPDATE_AVAILABILITY,
} from "@/lib/apollo/mutations/rider.mutation";
import { RIDER_PROFILE } from "@/lib/apollo/queries";
import { useApptheme } from "@/lib/context/global/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useWorkMode } from "@/lib/context/global/work-mode.context";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import { IRiderProfile } from "@/lib/utils/interfaces";
import { MutationTuple, useMutation } from "@apollo/client";
import { useEffect, useState } from "react";
import { showMessage } from "react-native-flash-message";
import { isBoolean } from "lodash";

const CustomDrawerHeader = () => {
  // Hook
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { workMode } = useWorkMode();
  const { dataProfile, loadingProfile, refetchProfile } = useUserContext();
  const [isRiderAvailable, setIsRiderAvailable] = useState(false);
  const [acceptExtra, setAcceptExtra] = useState(false);

  useEffect(() => {
    setIsRiderAvailable(dataProfile?.available || false);
    setAcceptExtra(Boolean(dataProfile?.acceptExtraOrders));
  }, [dataProfile?.available, dataProfile?.acceptExtraOrders]);

  const profileVars = { id: dataProfile?._id?.toString() ?? "" };

  // Queries
  const [toggleAvailablity, { loading }] = useMutation(UPDATE_AVAILABILITY, {
    refetchQueries: [{ query: RIDER_PROFILE, variables: profileVars }],
    awaitRefetchQueries: true,
  }) as MutationTuple<IRiderProfile | undefined, { id: string }>;

  const [toggleExtra, { loading: loadingExtra }] = useMutation(
    TOGGLE_ACCEPT_EXTRA_ORDERS,
    {
      refetchQueries: [{ query: RIDER_PROFILE, variables: profileVars }],
      awaitRefetchQueries: true,
      onCompleted: () => {
        void refetchProfile?.();
      },
    }
  );

  return (
    <View
      className="w-full flex-row items-center justify-between p-3 pt-6 top-0 bottom-4"
      style={{ backgroundColor: appTheme.primary }}
    >
      <View className="flex-row flex-1 items-center gap-3 pr-3">
        <View
          className="w-[32px] h-[32px] rounded-full items-center justify-center overflow-hidden"
          style={{ backgroundColor: appTheme.white }}
        >
          <Text
            className="text-[16px] font-semibold"
            style={{
              color: appTheme.primary,
            }}
          >
            {dataProfile?.name
              ?.split(" ")[0]
              ?.substring(0, 1)
              ?.toUpperCase()
              ?.concat(
                "",
                dataProfile?.name?.split(" ")[1]?.length
                  ? (dataProfile?.name
                      ?.split(" ")[1]
                      ?.substring(0, 1)
                      ?.toUpperCase() ?? "")
                  : ""
              ) ?? "JS"}
          </Text>
        </View>
        <View className="flex-1 justify-center">
          <Text
            className="font-semibold text-[16px]"
            style={{
              color: appTheme.black,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {dataProfile?.name ?? t("rider name")}
          </Text>
          <Text
            className="font-medium"
            style={{
              color: appTheme.secondaryTextColor,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {dataProfile?._id.substring(0, 9).toUpperCase() ?? "rider id"}
          </Text>
        </View>
      </View>

      <View className="items-end justify-center gap-2">
        <Text
          className="text-md"
          style={{ color: appTheme.secondaryTextColor }}
        >
          {t("Availability")}
        </Text>
        {loading || loadingProfile ? (
          <SpinnerComponent color={appTheme.secondaryTextColor} />
        ) : (
          <CustomSwitch
            value={isRiderAvailable}
            isDisabled={loading}
            onToggle={async () => {
              try {
                if (!dataProfile?._id?.toString()) {
                  showMessage({
                    message: t("User ID is missing"),
                    type: "danger",
                  });
                  return;
                }

                await toggleAvailablity({
                  variables: { id: dataProfile?._id?.toString() ?? "" },
                });
              } catch (error) {
                // Error is already handled in the mutation's onError callback
                console.error("Toggle availability error:", error);
              }
            }}
          />
        )}

        <Text
          className="text-xs font-medium"
          style={{ color: appTheme.secondaryTextColor }}
        >
          {isBoolean(dataProfile?.available)
            ? dataProfile?.available
              ? t("Available")
              : t("Not Available")
            : ""}
        </Text>

        {workMode === "delivery" ? (
          <>
            <Text
              className="text-md mt-2"
              style={{ color: appTheme.secondaryTextColor }}
            >
              {t("Accept extra orders")}
            </Text>
            {loadingExtra || loadingProfile ? (
              <SpinnerComponent color={appTheme.secondaryTextColor} />
            ) : (
              <CustomSwitch
                value={acceptExtra}
                isDisabled={loadingExtra}
                onToggle={async () => {
                  try {
                    if (!dataProfile?._id?.toString()) {
                      showMessage({
                        message: t("User ID is missing"),
                        type: "danger",
                      });
                      return;
                    }
                    await toggleExtra({
                      variables: { id: dataProfile._id.toString() },
                    });
                  } catch (error) {
                    console.error("Toggle extra orders error:", error);
                  }
                }}
              />
            )}
          </>
        ) : null}
      </View>
    </View>
  );
};

export default CustomDrawerHeader;
