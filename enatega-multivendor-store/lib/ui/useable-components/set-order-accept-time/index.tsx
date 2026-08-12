import { useState } from "react";

import { Pressable, Text, TouchableOpacity, View } from "react-native";

// Hooks
import useAcceptOrder from "@/lib/hooks/useAcceptOrder";
import useOrderRing from "@/lib/hooks/useOrderRing";

// Constants
import { TIMES } from "@/lib/utils/constants";

// Interface
import { ISetOrderTimeComponentProps } from "@/lib/utils/interfaces";

// Icons
import { useApptheme } from "@/lib/context/theme.context";
import { useSoundContext } from "@/lib/context/global/sound.context";
import { useKitchenTicketContext } from "@/lib/context/global/kitchen-ticket.context";
import { useTranslation } from "react-i18next";
import CustomContinueButton from "../custom-continue-button";
import { CircleCrossIcon } from "../svg";

const SetTimeScreenAndAcceptOrder = ({
  id,
  orderId,
  handleDismissModal,
  order,
}: ISetOrderTimeComponentProps) => {
  // Hooks
  const { appTheme } = useApptheme();
  const { silenceRing } = useSoundContext();
  const { showTicket } = useKitchenTicketContext();
  const { t } = useTranslation();

  // States
  const [selectedTime, setSelectedTime] = useState(TIMES[0]);

  const { muteRing, loading: loadingRing } = useOrderRing();
  const { acceptOrder, loading: loadingAcceptOrder } = useAcceptOrder();
  const isSubmitting = loadingAcceptOrder || loadingRing;

  const onAcceptOrderHandler = async () => {
    if (isSubmitting) return;

    const ticketPayload = order
      ? { ...order, acceptedAt: new Date().toISOString() }
      : null;

    try {
      await silenceRing();
      await acceptOrder(id, selectedTime?.toString() || "0");
      muteRing(orderId).catch(() => {});
    } catch {
      // Still show print preview so kitchen can see the ticket.
    } finally {
      // Close the prep-time sheet first — a native Modal can't reliably
      // appear on top of an open BottomSheetModal.
      handleDismissModal();
      if (ticketPayload) {
        setTimeout(() => showTicket(ticketPayload), 350);
      }
    }
  };

  return (
    <View className="flex-1 items-center justify-center px-4 pb-20">
      <View className="mt-4 mb-4 text-center flex-row justify-between items-center">
        <Text
          className="flex-1 text-center text-[16px] font-[600]"
          style={{ color: appTheme.fontMainColor }}
        >
          {t("Set Preparation Time")}
        </Text>
        <TouchableOpacity onPress={handleDismissModal}>
          <CircleCrossIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <View className="flex-row flex-wrap gap-2 justify-between">
          {TIMES.map((time, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedTime(time)}
              className={`h-fit justify-center items-center  p-4 rounded-[8px] `}
              style={{
                backgroundColor:
                  selectedTime === time ? appTheme.primary : appTheme.white,
              }}
            >
              <Text
                className={`text-[Inter] text-center items-center text-[14px] font-medium`}
                style={{
                  color:
                    selectedTime === time ? appTheme.white : appTheme.black,
                }}
              >
                {`${time} mins`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <CustomContinueButton
          disabled={isSubmitting}
          isLoading={loadingAcceptOrder || loadingRing}
          style={{ backgroundColor: appTheme.primary }}
          onPress={onAcceptOrderHandler}
          title={t("Accept")}
        />
      </View>
    </View>
  );
};

export default SetTimeScreenAndAcceptOrder;
