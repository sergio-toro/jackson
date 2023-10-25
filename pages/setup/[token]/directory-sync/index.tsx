import DirectoryList from '@components/dsync/DirectoryList';
import type { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

const DirectoryIndexPage: NextPage = () => {
  const router = useRouter();

  const { token } = router.query as { token: string };

  return <DirectoryList setupLinkToken={token} />;
};

export const getServerSideProps = async (context) => {
  const { locale } = context;

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
};

export default DirectoryIndexPage;
