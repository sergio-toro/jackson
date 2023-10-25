import type { Directory } from '@boxyhq/saml-jackson';
import { ButtonDanger } from '@components/ButtonDanger';
import ConfirmationModal from '@components/ConfirmationModal';
import { errorToast, successToast } from '@components/Toaster';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import type { ApiResponse } from 'types';

export const DeleteDirectory = ({ directoryId }: { directoryId: Directory['id'] }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [delModalVisible, setDelModalVisible] = useState(false);

  const deleteDirectory = async () => {
    const rawResponse = await fetch(`/api/admin/directory-sync/${directoryId}`, {
      method: 'DELETE',
    });

    const response: ApiResponse<unknown> = await rawResponse.json();

    if ('error' in response) {
      errorToast(response.error.message);
      return;
    }

    if ('data' in response) {
      successToast(t('directory_connection_deleted_successfully'));
      router.replace('/admin/directory-sync');
    }
  };

  return (
    <>
      <section className='mt-5 flex items-center rounded bg-red-100 p-6 text-red-900'>
        <div className='flex-1'>
          <h6 className='mb-1 font-medium'>{t('delete_this_directory')}</h6>
          <p className='font-light'>{t('delete_this_directory_desc')}</p>
        </div>
        <ButtonDanger
          type='button'
          data-modal-toggle='popup-modal'
          onClick={() => {
            setDelModalVisible(true);
          }}>
          {t('delete')}
        </ButtonDanger>
      </section>
      <ConfirmationModal
        title={t('delete_this_directory')}
        description={t('delete_this_directory_desc')}
        visible={delModalVisible}
        onConfirm={deleteDirectory}
        onCancel={() => {
          setDelModalVisible(false);
        }}
      />
    </>
  );
};
