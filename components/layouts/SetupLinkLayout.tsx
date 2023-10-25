import Loading from '@components/Loading';
import { PoweredBy } from '@components/PoweredBy';
import InvalidSetupLinkAlert from '@components/setup-link/InvalidSetupLinkAlert';
import { darkenHslColor, hexToHsl } from '@lib/color';
import usePortalBranding from '@lib/ui/hooks/usePortalBranding';
import useSetupLink from '@lib/ui/hooks/useSetupLink';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

export const SetupLinkLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { branding } = usePortalBranding();
  const { t } = useTranslation('common');

  const { token } = router.query as { token: string };

  const { setupLink, error, isLoading } = useSetupLink(token);

  if (isLoading) {
    return <Loading />;
  }

  const primaryColor = branding?.primaryColor ? hexToHsl(branding?.primaryColor) : null;
  const title =
    setupLink?.service === 'sso'
      ? t('configure_sso')
      : setupLink?.service === 'dsync'
      ? t('configure_dsync')
      : null;

  return (
    <>
      <Head>
        <title>{`${title} - ${branding?.companyName}`}</title>
        {branding?.faviconUrl && <link rel='icon' href={branding.faviconUrl} />}
      </Head>

      {primaryColor && (
        <style>{`:root { --p: ${primaryColor}; --pf: ${darkenHslColor(primaryColor, 30)}; }`}</style>
      )}

      <div className='mx-auto max-w-3xl'>
        <div className='flex flex-1 flex-col'>
          <div className='top-0 flex h-16 flex-shrink-0 border-b'>
            <div className='flex flex-shrink-0 items-center gap-4'>
              <Link href={`/setup/${token}`}>
                {branding?.logoUrl && (
                  <Image src={branding.logoUrl} alt={branding.companyName} width={40} height={40} />
                )}
              </Link>
              <span className='text-xl font-bold tracking-wide text-gray-900'>{title}</span>
            </div>
          </div>
          <main>
            <div className='py-6'>
              {error && <InvalidSetupLinkAlert message={error.message} />}
              {setupLink && children}
            </div>
          </main>
        </div>
      </div>
      <PoweredBy />
    </>
  );
};
