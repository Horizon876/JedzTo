import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { View } from "react-native";
import { IOrder } from "@/lib/utils/interfaces/order.interface";
import KitchenTicketModal from "@/lib/ui/useable-components/kitchen-ticket";
import usePrintOrder from "@/lib/hooks/usePrintOrder";

type KitchenTicketContextValue = {
  showTicket: (order: IOrder) => void;
  hideTicket: () => void;
};

const KitchenTicketContext = createContext<KitchenTicketContextValue>({
  showTicket: () => {},
  hideTicket: () => {},
});

export function KitchenTicketProvider({ children }: { children: ReactNode }) {
  const [ticketOrder, setTicketOrder] = useState<IOrder | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const { printOrder } = usePrintOrder();

  const showTicket = useCallback((order: IOrder) => {
    setTicketOrder({
      ...order,
      acceptedAt: order.acceptedAt || new Date().toISOString(),
    });
  }, []);

  const hideTicket = useCallback(() => {
    setTicketOrder(null);
  }, []);

  const printTicket = useCallback(async () => {
    if (!ticketOrder || isPrinting) return;
    setIsPrinting(true);
    try {
      await printOrder(ticketOrder._id);
    } finally {
      setIsPrinting(false);
    }
  }, [ticketOrder, isPrinting, printOrder]);

  const value = useMemo(
    () => ({ showTicket, hideTicket }),
    [showTicket, hideTicket],
  );

  return (
    <KitchenTicketContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <KitchenTicketModal
          order={ticketOrder}
          visible={!!ticketOrder}
          onClose={hideTicket}
          onPrint={printTicket}
          isPrinting={isPrinting}
        />
      </View>
    </KitchenTicketContext.Provider>
  );
}

export function useKitchenTicketContext() {
  return useContext(KitchenTicketContext);
}
