'use client';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { CustomDialog } from '@/lib/ui/useable-components/custom-dialog';
import useToast from '@/lib/hooks/useToast';
import {
  CLEAR_USER_FEATURE_BLOCK,
  DELETE_USER,
  SET_USER_FEATURE_BLOCK,
  UPDATE_USER_STATUS,
} from '@/lib/api/graphql/mutations/user';
import {
  IUserFeatureBlock,
  IUserResponse,
} from '@/lib/utils/interfaces/users.interface';
import { formatDateTime } from '@/lib/utils/methods';
import { GET_USER_BY_ID } from '@/lib/api/graphql';

type ModalType = 'block' | 'unblock' | 'delete' | 'feature' | null;

const FEATURE_OPTIONS = [
  { value: 'ordering', labelKey: 'feature_ordering' },
  { value: 'login', labelKey: 'feature_login' },
  { value: 'coupons', labelKey: 'feature_coupons' },
];

const DURATION_OPTIONS = [
  { value: 1, labelKey: 'feature_duration_1d' },
  { value: 3, labelKey: 'feature_duration_3d' },
  { value: 7, labelKey: 'feature_duration_7d' },
  { value: 30, labelKey: 'feature_duration_30d' },
];

interface UserActionsProps {
  user: IUserResponse;
}

const UserActions: React.FC<UserActionsProps> = ({ user }) => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [blockReason, setBlockReason] = useState('');
  const [feature, setFeature] = useState('ordering');
  const [durationDays, setDurationDays] = useState(7);
  const [featureReason, setFeatureReason] = useState('');

  const featureBlocks: IUserFeatureBlock[] = user.featureBlocks || [];
  const isBlocked = user.status === 'blocked' || user.isActive === false;

  const featureDropdown = useMemo(
    () =>
      FEATURE_OPTIONS.map((o) => ({
        label: t(o.labelKey),
        value: o.value,
      })),
    [t]
  );

  const durationDropdown = useMemo(
    () =>
      DURATION_OPTIONS.map((o) => ({
        label: t(o.labelKey),
        value: o.value,
      })),
    [t]
  );

  const refetchUser = [
    { query: GET_USER_BY_ID, variables: { userId: user._id } },
  ];

  const [updateUserStatus, { loading: statusLoading }] = useMutation(
    UPDATE_USER_STATUS,
    {
      onCompleted: (data) => {
        showToast({
          type: 'success',
          title: t('Success'),
          message: `${t('Status')}: ${data.updateUserStatus.status}`,
        });
        setActiveModal(null);
        setBlockReason('');
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: t('Error'),
          message: error.message,
        });
      },
      refetchQueries: refetchUser,
      awaitRefetchQueries: true,
    }
  );

  const [deleteUser, { loading: deleteLoading }] = useMutation(DELETE_USER, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('user_deleted_ok'),
      });
      router.push('/general/users');
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t('Error'),
        message: error.message,
      });
    },
  });

  const [setFeatureBlock, { loading: setFeatureLoading }] = useMutation(
    SET_USER_FEATURE_BLOCK,
    {
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Success'),
          message: t('feature_block_set_ok'),
        });
        setActiveModal(null);
        setFeatureReason('');
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: t('Error'),
          message: error.message,
        });
      },
      refetchQueries: refetchUser,
      awaitRefetchQueries: true,
    }
  );

  const [clearFeatureBlock, { loading: clearFeatureLoading }] = useMutation(
    CLEAR_USER_FEATURE_BLOCK,
    {
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Success'),
          message: t('feature_block_cleared_ok'),
        });
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: t('Error'),
          message: error.message,
        });
      },
      refetchQueries: refetchUser,
      awaitRefetchQueries: true,
    }
  );

  const featureLabel = (key: string) => {
    const found = FEATURE_OPTIONS.find((f) => f.value === key);
    return found ? t(found.labelKey) : key;
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {isBlocked ? (
          <Button
            label={t('activate_account')}
            icon="pi pi-unlock"
            className="p-button-success"
            onClick={() => updateUserStatus({ variables: { id: user._id, status: 'active' } })}
            loading={statusLoading}
          />
        ) : (
          <Button
            label={t('block_user')}
            icon="pi pi-ban"
            className="p-button-warning"
            onClick={() => setActiveModal('block')}
          />
        )}
        <Button
          label={t('temp_block_feature')}
          icon="pi pi-clock"
          outlined
          onClick={() => setActiveModal('feature')}
        />
        <Button
          label={t('delete_account')}
          icon="pi pi-trash"
          severity="danger"
          onClick={() => setActiveModal('delete')}
        />
      </div>

      {featureBlocks.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-900">
            {t('active_feature_blocks')}
          </h3>
          <div className="space-y-2">
            {featureBlocks.map((block) => (
              <div
                key={`${block.feature}-${block.until}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {featureLabel(block.feature)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('until')}:{' '}
                    {formatDateTime(block.until, 'pl-PL', undefined, '—')}
                    {block.reason ? ` · ${block.reason}` : ''}
                  </p>
                </div>
                <Button
                  label={t('Remove')}
                  icon="pi pi-times"
                  text
                  size="small"
                  loading={clearFeatureLoading}
                  onClick={() =>
                    clearFeatureBlock({
                      variables: { userId: user._id, feature: block.feature },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CustomDialog
        visible={activeModal === 'block'}
        onHide={() => setActiveModal(null)}
        onConfirm={() => {
          if (blockReason.trim().length < 5) {
            showToast({
              type: 'error',
              title: t('Error'),
              message: t('Reason is required'),
            });
            return;
          }
          updateUserStatus({
            variables: {
              id: user._id,
              status: 'blocked',
              reason: blockReason.trim(),
            },
          });
        }}
        title={t('Block User Confirmation')}
        message={t(
          'Are you sure you want to block this user? Please provide a reason.'
        )}
        loading={statusLoading}
        buttonConfig={{
          primaryButtonProp: {
            label: t('Yes, block'),
            className: 'p-button-warning p-3 !px-5 rounded-md bg-red-500 text-white',
          },
          secondaryButtonProp: {
            label: t('Cancel'),
            className: 'p-button-warning p-3 rounded-md bg-gray-500 text-white me-5',
          },
        }}
      >
        <div className="mt-4">
          <label className="mb-2 block font-medium">
            {t('Reason')} <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            rows={3}
            className="w-full"
            placeholder={t('Enter reason for blocking this user...')}
          />
        </div>
      </CustomDialog>

      <CustomDialog
        visible={activeModal === 'feature'}
        onHide={() => setActiveModal(null)}
        onConfirm={() => {
          const until = new Date();
          until.setDate(until.getDate() + durationDays);
          setFeatureBlock({
            variables: {
              userId: user._id,
              feature,
              until: until.toISOString(),
              reason: featureReason.trim() || undefined,
            },
          });
        }}
        title={t('temp_block_feature')}
        message={t('temp_block_feature_hint')}
        loading={setFeatureLoading}
        buttonConfig={{
          primaryButtonProp: {
            label: t('Save'),
            className: 'p-button-warning p-3 !px-5 rounded-md bg-primary-color text-white',
          },
          secondaryButtonProp: {
            label: t('Cancel'),
            className: 'p-button-warning p-3 rounded-md bg-gray-500 text-white me-5',
          },
        }}
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-2 block font-medium">{t('Feature')}</label>
            <Dropdown
              value={feature}
              options={featureDropdown}
              onChange={(e) => setFeature(e.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">{t('Duration')}</label>
            <Dropdown
              value={durationDays}
              options={durationDropdown}
              onChange={(e) => setDurationDays(e.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">{t('Reason')}</label>
            <InputTextarea
              value={featureReason}
              onChange={(e) => setFeatureReason(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
        </div>
      </CustomDialog>

      <CustomDialog
        visible={activeModal === 'delete'}
        onHide={() => setActiveModal(null)}
        onConfirm={() => deleteUser({ variables: { id: user._id } })}
        title={t('Delete Account Confirmation')}
        message={t(
          'Are you sure you want to permanently delete this account? This action cannot be undone.'
        )}
        loading={deleteLoading}
        buttonConfig={{
          primaryButtonProp: {
            label: t('Yes, delete'),
            className: 'p-button-warning p-3 !px-5 rounded-md bg-red-500 text-white',
          },
          secondaryButtonProp: {
            label: t('Cancel'),
            className: 'p-button-warning p-3 rounded-md bg-gray-500 text-white me-5',
          },
        }}
      />
    </div>
  );
};

export default UserActions;
