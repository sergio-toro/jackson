import type { SetupLinkService } from '@boxyhq/saml-jackson';
import CreateSetupLink from '@components/setup-link/CreateSetupLink';
import type { GetServerSidePropsContext, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

const serviceMaps = {
  'sso-connection': 'sso',
  'directory-sync': 'dsync',
};

const SetupLinkCreatePage: NextPage = () => {
  const router = useRouter();

  // Extract the service name from the path
  const serviceName = router.asPath.split('/')[2];

  const service = serviceMaps[serviceName] as SetupLinkService;

  if (!service) {
    return null;
  }

  return <CreateSetupLink service={service} />;
};

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default SetupLinkCreatePage;
