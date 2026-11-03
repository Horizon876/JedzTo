import React, { useRef, useEffect } from 'react';
import { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getNationalDigits,
  formatPhoneNumber,
  isValidPhoneNumber
} from '../utils/phone';

const PhoneNumberInput = ({
  setError,
  placeholder,
  placeholderTextColor,
  style,
  region, // ISO country code, e.g. 'PK' — drives country-specific format & validation
  countryCode, // calling code digits, e.g. '92'
  value,
  onChange
}) => {
  const { t } = useTranslation();
  const debounceRef = useRef(null);

  // Clear the pending validation on unmount.
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = (text) => {
    // Country calling code lives in the picker on the left — this field is
    // national digits only. Do not strip a leading "48"/"52"/… while typing.
    // If the user pastes a full international number (+48…), drop the prefix once.
    let digits = getNationalDigits(text);
    const cc = String(countryCode || '').replace(/\D/g, '');
    const raw = String(text || '').trim();
    if (cc && (raw.startsWith('+') || raw.startsWith('00')) && digits.startsWith(cc)) {
      digits = digits.slice(cc.length);
    }

    onChange(digits);

    // Hide any error while typing; only validate once the user pauses.
    setError('');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (digits && region && !isValidPhoneNumber(digits, region)) {
        setError(t('mobileErr2'));
      }
    }, 700);
  };

  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="phone-pad"
      value={formatPhoneNumber(value, region)}
      onChangeText={handleChange}
      maxLength={20}
    />
  );
};

export default PhoneNumberInput;
