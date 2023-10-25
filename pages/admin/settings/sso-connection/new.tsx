import CreateConnection from '@components/connection/CreateConnection';
import type { AdminPortalSSODefaults } from '@components/connection/utils';
import { adminPortalSSODefaults } from '@lib/env';
import type { GetServerSidePropsContext, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

type Props = {
  adminPortalSSODefaults: AdminPortalSSODefaults;
};

const NewSSOConnection: NextPage<Props> = ({ adminPortalSSODefaults }) => {
  return <CreateConnection isSettingsView adminPortalSSODefaults={adminPortalSSODefaults} />;
};

export async function getStaticProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      adminPortalSSODefaults,
    },
  };
}

export default NewSSOConnection;
