import * as Yup from 'yup';

import { imageUrlSchema } from './image-url';

// Validation schema for the Super Admin "create restaurant" wizard.
// Owner account is now created with an admin-specified login + password
// (no longer email-based with auto-generated password).
export const RestaurantSchema = Yup.object().shape({
  name: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),

  ownerName: Yup.string().required('Wymagane').max(70, 'Maksymalnie 70 znaków'),

  ownerLogin: Yup.string()
    .required('Login jest wymagany')
    .min(3, 'Login musi mieć co najmniej 3 znaki')
    .max(50, 'Login może mieć maksymalnie 50 znaków')
    .matches(/^[a-zA-Z0-9._-]+$/, 'Login może zawierać tylko litery, cyfry i znaki: . _ -'),

  ownerPassword: Yup.string()
    .required('Hasło jest wymagane')
    .min(6, 'Hasło musi mieć co najmniej 6 znaków'),

  ownerPasswordConfirm: Yup.string()
    .nullable()
    .oneOf([Yup.ref('ownerPassword'), null, ''], 'Hasła nie są zgodne'),

  address: Yup.string()
    .max(200, 'Maximum 200 characters allowed')
    .trim()
    .matches(/\S/, 'Address cannot be only spaces')
    .required('Required'),

  commissionRate: Yup.number()
    .required('Wymagane')
    .min(0, 'Minimalna prowizja to 0')
    .max(100, 'Maksymalna prowizja to 100'),

  image: imageUrlSchema(),
  logo: imageUrlSchema('Invalid logo URL'),

});