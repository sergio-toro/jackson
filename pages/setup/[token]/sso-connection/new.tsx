import fs from 'fs';
import path from 'path';
import { InputWithCopyButton } from '@components/ClipboardButton';
import CreateSSOConnection from '@components/setup-link-instructions/CreateSSOConnection';
import Footer from '@components/setup-link-instructions/Footer';
import NextButton from '@components/setup-link-instructions/NextButton';
import PreviousButton from '@components/setup-link-instructions/PreviousButton';
import SelectIdentityProviders from '@components/setup-link-instructions/SelectIdentityProviders';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { identityProviders } from '@lib/constants';
import { jacksonOptions } from '@lib/env';
import jackson from '@lib/jackson';
import mediumZoom from 'medium-zoom';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { MDXRemote } from 'next-mdx-remote';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import Link from 'next/link';
import { useEffect } from 'react';
import remarkGfm from 'remark-gfm';

type NewConnectionProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const AdvancedSPConfigLink = () => {
  return (
    <div className='py-2'>
      <Link href='/.well-known/saml-configuration' target='_blank' className='underline-offset-4'>
        <span className='text-xs'>Advanced Service Provider (SP) SAML Configuration</span>
      </Link>
    </div>
  );
};

const components = {
  Footer,
  NextButton,
  PreviousButton,
  InputWithCopyButton,
  CreateSSOConnection,
  AdvancedSPConfigLink,
};

const proseClassNames = [
  'prose',
  'prose-sm',
  'prose-h2:text-lg',
  'prose-h2:text-slate-700',
  'prose-h2:font-semibold',
  'prose-p:text-base',
  'prose-img:rounded',
  'prose-img:h-96',
  'prose-img:w-full',
  'prose-table:table',
  'prose-table:border',
  'prose-a:text-sm',
];

const findIdp = (idp: string) => {
  return identityProviders.find((provider) => provider.id === idp);
};

const NewConnection = ({
  step,
  idp,
  setupLinkToken,
  idpEntityId,
  source,
  spConfig,
  spMetadataUrl,
  publicCertUrl,
  oidcCallbackUrl,
}: NewConnectionProps) => {
  const linkSelectIdp = { pathname: '/setup/[token]/sso-connection/new', query: { token: setupLinkToken } };

  const scope = {
    idpEntityId,
    spConfig,
    setupLinkToken,
    spMetadataUrl,
    publicCertUrl,
    oidcCallbackUrl,
  };

  let heading = '';
  let progress = 0;

  // Add zoom to images
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const zoom = mediumZoom('img', {
      scrollOffset: 0,
      margin: 50,
    });

    return () => {
      zoom.detach();
    };
  }, [step]);

  if (source && idp && step) {
    const selectedIdP = findIdp(idp);

    if (!selectedIdP) {
      throw new Error('Identity Provider not found');
    }

    progress = (100 / selectedIdP.stepCount) * parseInt(step);
    heading = `Configure ${selectedIdP?.name}`;
  } else {
    heading = 'Select Identity Provider';
  }

  return (
    <>
      <div className='flex space-y-4 flex-col pb-6'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl font-noraml'>{heading}</h1>
          {source && (
            <Link className='btn btn-xs h-0' href={linkSelectIdp}>
              <ArrowsRightLeftIcon className='w-5 h-5' />
              Change Identity Provider
            </Link>
          )}
        </div>
        {source && <progress className='progress progress-primary w-full' value={progress} max={100} />}
      </div>

      <article className={`${proseClassNames.join(' ')} max-w-4xl`}>
        {source ? (
          <MDXRemote {...source} components={components} scope={scope} />
        ) : (
          <SelectIdentityProviders />
        )}
      </article>
    </>
  );
};

export async function getServerSideProps({ locale, query }: GetServerSidePropsContext) {
  const { spConfig, setupLinkController, connectionAPIController } = await jackson();

  const { idp, step, token } = query as { idp: string; step: string; token: string };

  const { tenant, product } = await setupLinkController.getByToken(token);
  const idpEntityId = connectionAPIController.getIDPEntityID({
    tenant,
    product,
  });

  let mdxSource: MDXRemoteSerializeResult<Record<string, unknown>> | null = null;

  // Read the MDX file based on the idp and step
  if (idp && step) {
    try {
      const mdxDirectory = path.join(process.cwd(), `components/setup-link-instructions/${idp}`);
      const source = fs.readFileSync(`${mdxDirectory}/${step}.mdx`, 'utf8');
      mdxSource = await serialize(source, { mdxOptions: { remarkPlugins: [remarkGfm] } });
    } catch (error: any) {
      return {
        redirect: {
          destination: `/setup/${token}/sso-connection/new`,
        },
      };
    }
  }

  return {
    props: {
      idp: idp || null,
      step: step || null,
      setupLinkToken: token,
      idpEntityId,
      source: mdxSource,
      spConfig: await spConfig.get(),
      spMetadataUrl: `${jacksonOptions.externalUrl}/.well-known/sp-metadata`,
      publicCertUrl: `${jacksonOptions.externalUrl}/.well-known/saml.cer`,
      oidcCallbackUrl: `${jacksonOptions.externalUrl}${jacksonOptions.oidcPath}`,
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default NewConnection;
