import ConnectionList from '@components/connection/ConnectionList';
import type { GetServerSidePropsContext, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const ConnectionsIndexPageForSettings: NextPage = () => {
  return <ConnectionList isSettingsView />;
};

export default ConnectionsIndexPageForSettings;

export async function getStaticProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}
