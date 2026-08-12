'use client';

import { useContext } from 'react';
import { Dialog } from 'primereact/dialog';
import { faCopy, faUserShield } from '@fortawesome/free-solid-svg-icons';
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

// JedzTo — shows the login + password the super-admin just set for this
// restaurant owner. Admin can copy them before handing them over to the owner.
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
      header={
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUserShield} className="text-blue-500" />
          <span>{t('Dane logowania właściciela')}</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '480px' }}
      modal
      draggable={false}
      closable={false}
    >
      {credentials && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <FontAwesomeIcon icon={faUserShield} className="mt-0.5 shrink-0" />
            <span>
              {t(
                'Poniżej znajdziesz dane logowania do panelu właściciela i aplikacji kuchni. Przekaż je właścicielowi restauracji.'
              )}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#09090B] dark:text-white">
              {t('Login')}
            </label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-dark-600">
              <span className="truncate font-mono text-sm">{credentials.login}</span>
              <button
                type="button"
                onClick={() => onCopy(credentials.login, t('Login'))}
                className="text-gray-500 hover:text-black dark:hover:text-white"
                aria-label={t('Copy login')}
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#09090B] dark:text-white">
              {t('Hasło')}
            </label>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-dark-600">
              <span className="truncate font-mono text-sm">
                {credentials.password}
              </span>
              <button
                type="button"
                onClick={() =>
                  onCopy(credentials.password, t('Hasło'))
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
