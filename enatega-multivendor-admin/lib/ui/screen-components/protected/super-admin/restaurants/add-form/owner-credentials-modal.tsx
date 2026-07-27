'use client';

import { useContext } from 'react';
import { Dialog } from 'primereact/dialog';
import { faCopy, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';

import CustomButton from '@/lib/ui/useable-components/button';
import { ToastContext } from '@/lib/context/global/toast.context';
import { IGeneratedOwnerCredentials } from '@/lib/utils/interfaces';

interface IOwnerCredentialsModalProps {
  visible: boolean;
  credentials: IGeneratedOwnerCredentials | null;
  onHide: () => void;
}

// JedzTo — the temporary password is only ever returned once, right here,
// in the createRestaurant response. This modal is the only place an admin
// can read it — make sure it's easy to copy before closing.
export default function OwnerCredentialsModal({
  visible,
  credentials,
  onHide,
}: IOwnerCredentialsModalProps) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const onCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast({
        type: 'success',
        title: t('Copied'),
        message: `${label} ${t('copied to clipboard')}`,
        duration: 2000,
      });
    } catch {
      showToast({
        type: 'error',
        title: t('Copy failed'),
        message: t('Please copy manually'),
        duration: 2500,
      });
    }
  };

  return (
    <Dialog
      header={t('Owner Login Credentials')}
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '480px' }}
      modal
      draggable={false}
      closable={false}
    >
      {credentials && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
            <span>
              {t(
                'This password is shown only once. Copy it now and share it securely with the restaurant owner.'
              )}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#09090B] dark:text-white">
              {t('Email')}
            </label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-dark-600">
              <span className="truncate text-sm">{credentials.email}</span>
              <button
                type="button"
                onClick={() => onCopy(credentials.email, t('Email'))}
                className="text-gray-500 hover:text-black dark:hover:text-white"
                aria-label={t('Copy email')}
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#09090B] dark:text-white">
              {t('Temporary Password')}
            </label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-dark-600">
              <span className="truncate font-mono text-sm">
                {credentials.temporaryPassword}
              </span>
              <button
                type="button"
                onClick={() =>
                  onCopy(credentials.temporaryPassword, t('Password'))
                }
                className="text-gray-500 hover:text-black dark:hover:text-white"
                aria-label={t('Copy password')}
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <CustomButton
              className="h-10 w-fit border border-gray-300 dark:border-dark-600 bg-black px-8 text-white"
              label={t('Done')}
              type="button"
              onClick={onHide}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
