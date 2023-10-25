import { InputWithCopyButton } from '@components/ClipboardButton';
import { Toaster } from '@components/Toaster';
import jackson from '@lib/jackson';
import type { InferGetStaticPropsType, NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import React from 'react';

const SPConfig: NextPage<InferGetStaticPropsType<typeof getServerSideProps>> = ({ config }) => {
  const { t } = useTranslation('common');

  return (
    <>
      <Toaster />
      <div className='mt-10 flex w-full justify-center px-5'>
        <div className='w-full rounded border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 md:w-1/2'>
          <div className='flex flex-col space-y-3'>
            <h2 className='font-bold text-gray-700 md:text-xl'>{t('sp_saml_config_title')}</h2>
            <p className='text-sm leading-6 text-gray-800'>{t('sp_saml_config_description')}</p>
            <p className='text-sm leading-6 text-gray-600'>
              Refer to our&nbsp;
              <a
                href='https://boxyhq.com/docs/jackson/sso-providers'
                target='_blank'
                rel='noreferrer'
                className='underline underline-offset-4'>
                guides
              </a>
              &nbsp;for provider specific instructions.
            </p>
          </div>
          <div className='mt-6 flex flex-col gap-6'>
            <div className='form-control w-full'>
              <InputWithCopyButton text={config.acsUrl} label={t('sp_acs_url')} />
            </div>
            <div className='form-control w-full'>
              <InputWithCopyButton text={config.entityId} label={t('sp_entity_id')} />
            </div>
            <div className='form-control w-full'>
              <div className='flex flex-col'>
                <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>
                  {t('response')}
                </label>
                <p className='text-sm'>{config.response}</p>
              </div>
            </div>
            <div className='form-control w-full'>
              <div className='flex flex-col'>
                <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>
                  {t('assertion_signature')}
                </label>
                <p className='text-sm'>{config.assertionSignature}</p>
              </div>
            </div>
            <div className='form-control w-full'>
              <div className='flex flex-col'>
                <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>
                  {t('signature_algorithm')}
                </label>
                <p className='text-sm'>{config.signatureAlgorithm}</p>
              </div>
            </div>
            <div className='form-control w-full'>
              <div className='flex flex-col'>
                <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>
                  {t('assertion_encryption')}
                </label>
                <p className='text-sm'>
                  If you want to encrypt the assertion, you can&nbsp;
                  <Link href='/.well-known/saml.cer' className='underline underline-offset-4' target='_blank'>
                    download our public certificate.
                  </Link>
                  &nbsp;Otherwise select the Unencrypted option.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async ({ locale }) => {
  const { spConfig } = await jackson();

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      config: await spConfig.get(),
    },
  };
};

export default SPConfig;
