import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IVendorErrors {
  _id: string[];
  name: string[];
  email: string[];
  password: string[];
  confirmPassword: string[];
  image: string[];
  firstName: string[];
  lastName: string[];
  phoneNumber: string[];
}

export interface IVendorForm {
  
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
  image?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface IRestauransVendorDetailsForm {
  _id: IDropdownSelectItem | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  image?: string;
  phoneNumber?: string;
}

// JedzTo — simplified "Set Vendor" step: the owner account (login + temp
// password) is auto-generated server-side by createRestaurant, so this form
// only collects the two fields needed to create that account.
export interface IRestaurantOwnerDetailsForm {
  ownerName: string;
  ownerEmail: string;
}

export interface IRestaurantOwnerDetailsFormErrors {
  ownerName: string[];
  ownerEmail: string[];
}
