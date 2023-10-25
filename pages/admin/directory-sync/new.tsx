import CreateDirectory from '@components/dsync/CreateDirectory';
import { jacksonOptions } from '@lib/env';
import type { GetServerSidePropsContext, InferGetServerSidePropsType, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';

const DirectoryCreatePage: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = (props) => {
  const { defaultWebhookEndpoint } = props;

  return <CreateDirectory defaultWebhookEndpoint={defaultWebhookEndpoint} />;
};

export const getServerSideProps = async ({ locale }: GetServerSidePropsContext) => {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      defaultWebhookEndpoint: jacksonOptions.webhook?.endpoint,
    },
  };
};

export default DirectoryCreatePage;
