import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IRestaurantFormErrors {
  name: string[];
  address: string[];
  deliveryTime: string[];
  minOrder: string[];
  salesTax: string[];
  shopType: string[];
  cuisines: string[];
  image: string[];
  logo: string[];
  phoneNumber: string[];
  ownerName: string[];
  ownerLogin: string[];
  ownerPassword: string[];
  ownerPasswordConfirm: string[];
  commissionRate?: string[];
  // Legacy fields used by vendor-scoped restaurant forms (still in use)
  username?: string[];
  password?: string[];
  confirmPassword?: string[];
}

export interface IRestaurantForm {
  name: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?:string;
  address: string;
  deliveryTime?: number;
  minOrder?: number;
  salesTax?: number;
  shopType?: IDropdownSelectItem | null;
  cuisines?: IDropdownSelectItem[];
  image: string;
  logo: string;
  commissionRate?: number;
}


export interface IRestaurantDeliveryForm {
  minDeliveryFee: number | null;
  deliveryDistance: number | null;
  deliveryFee: number | null;
}

export interface IRestaurantDeliveryFormErrors {
  minDeliveryFee: string[];
  deliveryDistance: string[];
  deliveryFee: string[];
}
