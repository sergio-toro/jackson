import EmptyState from '@components/EmptyState';
import Loading from '@components/Loading';
import { retracedOptions } from '@lib/env';
import type { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export interface Props {
  host?: string;
}

const Retraced: NextPage<Props> = ({ host }: Props) => {
  const router = useRouter();

  useEffect(() => {
    if (!host) {
      return;
    }
    router.push('/admin/retraced/projects');
  }, [router]);

  if (!host) {
    return (
      <EmptyState
        title='This feature has not been enabled.'
        description='Please add the host for our Audit Logs service to enable this feature.'
      />
    );
  }

  return <Loading />;
};

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      host: retracedOptions.externalUrl || null,
    },
  };
}

export default Retraced;
