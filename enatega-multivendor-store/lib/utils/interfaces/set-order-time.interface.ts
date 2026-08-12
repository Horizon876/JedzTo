import { IGlobalComponentProps } from "./global.interface";
import { IOrder } from "./order.interface";

export interface ISetOrderTimeComponentProps extends IGlobalComponentProps {
  id: string;
  orderId: string;
  handleDismissModal: () => void;
  order?: IOrder | null;
  onAccepted?: (order: IOrder) => void;
}
