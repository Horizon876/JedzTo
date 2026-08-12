import { useMemo } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { IOrder } from "@/lib/utils/interfaces/order.interface";
import { formatKitchenTicketPreview } from "@/lib/utils/methods/format-receipt";

interface IKitchenTicketModalProps {
  order: IOrder | null;
  visible: boolean;
  onClose: () => void;
  onPrint?: () => void;
  isPrinting?: boolean;
}

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

const KitchenTicketModal = ({
  order,
  visible,
  onClose,
  onPrint,
  isPrinting,
}: IKitchenTicketModalProps) => {
  const { t } = useTranslation();

  const previewText = useMemo(
    () => (order ? formatKitchenTicketPreview(order) : ""),
    [order],
  );

  return (
    <Modal
      visible={visible && !!order}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("Print preview")}</Text>
          <Text style={styles.subtitle}>
            {t("How it will look on the printer")}
          </Text>

          <View style={styles.paper}>
            <ScrollView
              style={styles.paperScroll}
              contentContainerStyle={styles.paperContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.receiptText}>{previewText}</Text>
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>{t("Close")}</Text>
            </TouchableOpacity>
            {onPrint ? (
              <TouchableOpacity
                style={styles.printBtn}
                onPress={onPrint}
                disabled={isPrinting}
              >
                <Text style={styles.printBtnText}>
                  {isPrinting ? t("Please wait") : t("Print")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default KitchenTicketModal;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: WINDOW_HEIGHT * 0.9,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 12,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    width: "100%",
    maxHeight: WINDOW_HEIGHT * 0.58,
  },
  paperScroll: {
    maxHeight: WINDOW_HEIGHT * 0.58,
  },
  paperContent: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  receiptText: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
    color: "#111111",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  closeBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  printBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
