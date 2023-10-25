import jackson from '@lib/jackson';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export { default } from 'ee/branding/pages/index';

export async function getServerSideProps({ locale }) {
  const { checkLicense } = await jackson();

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      hasValidLicense: await checkLicense(),
    },
  };
}
