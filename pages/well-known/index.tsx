import WellKnownURLs from '@components/connection/WellKnownURLs';
import type { GetServerSidePropsContext, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const WellKnownURLsIndex: NextPage = () => {
  return (
    <div className='my-10 mx-5 flex justify-center'>
      <div className='flex flex-col'>
        <WellKnownURLs />
      </div>
    </div>
  );
};

export async function getStaticProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default WellKnownURLsIndex;
