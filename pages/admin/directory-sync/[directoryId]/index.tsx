import DirectoryInfo from '@components/dsync/DirectoryInfo';
import type { GetServerSidePropsContext, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

const DirectoryInfoPage: NextPage = () => {
  const router = useRouter();

  const { directoryId } = router.query as { directoryId: string };

  return <DirectoryInfo directoryId={directoryId} />;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

export default DirectoryInfoPage;
