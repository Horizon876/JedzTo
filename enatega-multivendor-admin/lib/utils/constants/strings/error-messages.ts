import {
  IAddonsErrors,
  IBannersErrors,
  ICategoryErrors,
  IOptionErrors,
  IRiderErrors,
  ISignInFormErrors,
  ISignUpFormErrors,
  IVendorErrors,
  IUpdateProfileFormErrors,
  IRestaurantOwnerDetailsFormErrors,
  IVariationErrors,
  IUpdateBussinessDetailsFormErrors,
  IShopTypeErrors,
} from '@/lib/utils/interfaces/forms';

import {
  IRestaurantDeliveryFormErrors,
  IRestaurantFormErrors,
} from '@/lib/utils/interfaces/forms/restaurant.form.interface';
import { IZoneErrors } from '../../interfaces/forms/zone.form.interface';
import { IStaffErrors } from '../../interfaces/forms/staff.form.interface';
import { ICuisineErrors } from '../../interfaces/forms/cuisine.form.interface';
import { ICouponErrors } from '../../interfaces/forms/coupon.form.interface';
import { IFoodErrors } from '../../interfaces/forms/food.form.interface';
import { INoticiationErrors } from '../../interfaces/forms/notification.form.interface';

export const PasswordErrors = [
  'at_least_6_characters',
  'at_least_one_lowercase_letter_a_z',
  'at_least_one_uppercase_letter_A_Z',
  'at_least_one_number_0_9',
  'at_least_one_special_character',
  'password_does_not_match',
];

export const SignUpErrors: ISignUpFormErrors = {
  firstName: ['Required', 'Name cannot be only spaces'],
  lastName: ['Required', 'Name cannot be only spaces'],
  email: ['Required', 'Invalid email'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
};

export const SignInErrors: ISignInFormErrors = {
  email: ['Required', 'Invalid email'],
  password: ['Required'],
};

export const VendorErrors: IVendorErrors = {
  _id: ['Required'],
  name: ['Required', 'Name cannot be only spaces'],
  email: ['Required', 'Invalid email'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
  image: ['Required', 'Invalid image URL'],
  firstName: ['Required', 'Firstname cannot be only spaces'],
  lastName: ['Required', 'Lastname cannot be only spaces'],
  phoneNumber: ['Required', 'Minimum 5 Numbers are Required'],
};

export const RestaurantErrors: IRestaurantFormErrors = {
  name: ['Required', 'Name cannot be only spaces'],
  address: ['Required', 'Address cannot be only spaces'],
  commissionRate: ['Wymagane', 'Minimalna prowizja to 0', 'Maksymalna prowizja to 100'],
  image: ['Required', 'Invalid image URL'],
  logo: ['Required', 'Invalid logo URL'],
  ownerName: ['Wymagane', 'Maksymalnie 70 znaków'],
  ownerLogin: ['Login jest wymagany', 'Login musi mieć co najmniej 3 znaki', 'Login może zawierać tylko litery, cyfry i znaki: . _ -'],
  ownerPassword: ['Hasło jest wymagane', 'Hasło musi mieć co najmniej 6 znaków'],
  ownerPasswordConfirm: ['Hasła nie są zgodne'],
  // Legacy fields for vendor-scoped restaurant forms
  username: ['Required', 'Invalid email'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
};



export const RestaurantOwnerDetailsErrors: IRestaurantOwnerDetailsFormErrors = {
  ownerName: ['Required', 'Name cannot be only spaces'],
  ownerEmail: ['Required', 'Invalid email'],
};

export const ProfileErrors: IUpdateProfileFormErrors = {
  name: ['Required', 'Name cannot be only spaces'],
  email: ['Required', 'Invalid email'],
  username: ['Required', 'Invalid email'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
  address: ['Required', 'Name cannot be only spaces'],
  deliveryTime: ['Required'],
  minOrder: ['Required'],
  salesTax: ['Required'],
  orderprefix: ['Required'],
  shopType: ['Required'],
  cuisines: ['Required', 'Cuisines field must have at least 1 items'],
  image: ['Required', 'Invalid image URL'],
  logo: ['Required', 'Invalid logo URL'],
};

export const BussinessDetailsErrors: IUpdateBussinessDetailsFormErrors = {
  bankName: ['Required'],
  accountName: ['Required'],
  accountCode: ['Required'],
  accountNumber: ['Required'],
  bussinessRegNo: [],
  companyRegNo: [],
  taxRate: ['Required'],
};

export const RiderErrors: IRiderErrors = {
  name: ['Required', 'Name cannot be only spaces'],
  username: ['Required'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
  zone: ['Required'],
  phone: ['Required', 'Minimum 5 Numbers are Required'],
  vehicleType: ['Required'],
};

export const BannersErrors: IBannersErrors = {
  title: ['Required', 'Name cannot be only spaces'],
  description: ['Required', 'Name cannot be only spaces'],
  action: ['Required'],
  screen: ['Required'],
  file: ['Required'],
};

export const CategoryErrors: ICategoryErrors = {
  _id: [],
  title: ['Required', 'Name cannot be only spaces'],
  image: ['Required'],
};

export const OptionErrors: IOptionErrors = {
  _id: [],
  title: ['Required', 'Name cannot be only spaces'],
  description: [],
  price: [
    'Required',
    'Minimum value must be greater than 0',
    'Maximum price is 99999',
  ],
};

export const AddonsErrors: IAddonsErrors = {
  _id: [],
  title: ['Required', 'Name cannot be only spaces'],
  description: [],
  quantityMinimum: [
    'Required',
    'Minimum value must be greater than 0',
    'Maximum price is 99999',
  ],
  quantityMaximum: [
    'Required',
    'Minimum value must be greater than 0',
    'Maximum price is 99999',
  ],
  options: ['Required', 'Option field must have at least 1 items'],
};

export const ZoneErrors: IZoneErrors = {
  title: ['Required', 'Name cannot be only spaces'],
  description: ['Required', 'Name cannot be only spaces'],
};

export const StaffErrors: IStaffErrors = {
  name: ['Required', 'Name cannot be only spaces'],
  email: ['Required'],
  phone: ['Required', 'Minimum 5 Numbers are Required'],
  password: ['Required', ...PasswordErrors],
  confirmPassword: ['Required', 'Password must match'],
  isActive: ['Required'],
  permissions: ['Required', 'Permissions field must have at least 1 items'],
};

export const CuisineErrors: ICuisineErrors = {
  name: ['Required', 'Name cannot be only spaces'],
  description: ['Required', 'Name cannot be only spaces'],
  shopType: ['Required'],
  image: ['Required'],
};

export const ShopTypeErrors: IShopTypeErrors = {
  title: [
    'Required',
    'Name cannot be only spaces',
    'You have reached the maximum limit!',
    'Title is a required field',
  ],
  image: [],
  isActive: []
};



export const CouponErrors: ICouponErrors = {
  title: [
    'Required',
    'Name cannot be only spaces',
    'You have reached the maximum limit!',
    'Title is a required field',
  ],
  discount: [
    'Required',
    'Discount is a required field',
    'The minimum starting value is one',
    'You cannot exceed from 100 as this is a %age field',
  ],
  enabled: ['Required', 'Please choose one'],
  startDate: ['Required'],
  endDate: ['Required'],
};



export const NotificationErrors: INoticiationErrors = {
  title: ['Required'],
  body: ['Required'],
};

export const FoodErrors: IFoodErrors = {
  title: ['Required', 'Name cannot be only spaces'],
  description: [],
  image: ['Required', 'Invalid image URL'],
  category: ['Required'],
  subCategory: [''],
};

export const VariationErrors: IVariationErrors = {
  title: ['Required', 'Name cannot be only spaces'],
  discounted: ['Required'],
  price: ['Required', 'Minimum value must be greater than 0'],
  addons: ['Required', 'Addons field must have at least 1 items'],
  isOutOfStock: ['Required'],
};

export const RestaurantDeliveryErrors: IRestaurantDeliveryFormErrors = {
  minDeliveryFee: ['Required'],
  deliveryDistance: ['Required'],
  deliveryFee: ['Required'],
};
