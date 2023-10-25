import type { OIDCSSORecord, SAMLSSORecord } from '@boxyhq/saml-jackson';
import Badge from '@components/Badge';
import { InputWithCopyButton } from '@components/ClipboardButton';
import EmptyState from '@components/EmptyState';
import { IconButton } from '@components/IconButton';
import { LinkPrimary } from '@components/LinkPrimary';
import Loading from '@components/Loading';
import { NoMoreResults, pageLimit, Pagination } from '@components/Pagination';
import { errorToast } from '@components/Toaster';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import usePaginate from '@lib/ui/hooks/usePaginate';
import { fetcher } from '@lib/ui/utils';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';

const ConnectionList = ({
  setupLinkToken,
  idpEntityID,
  isSettingsView = false,
}: {
  setupLinkToken?: string;
  idpEntityID?: string;
  isSettingsView?: boolean;
}) => {
  const { t } = useTranslation('common');
  const { paginate, setPaginate, pageTokenMap, setPageTokenMap } = usePaginate();
  const router = useRouter();

  const displayTenantProduct = setupLinkToken ? false : true;
  let getConnectionsUrl = setupLinkToken
    ? `/api/setup/${setupLinkToken}/sso-connection`
    : isSettingsView
    ? `/api/admin/connections?isSystemSSO`
    : `/api/admin/connections?pageOffset=${paginate.offset}&pageLimit=${pageLimit}`;

  // Use the (next)pageToken mapped to the previous page offset to get the current page
  if (paginate.offset > 0 && pageTokenMap[paginate.offset - pageLimit]) {
    getConnectionsUrl += `&pageToken=${pageTokenMap[paginate.offset - pageLimit]}`;
  }
  const createConnectionUrl = setupLinkToken
    ? `/setup/${setupLinkToken}/sso-connection/new`
    : isSettingsView
    ? `/admin/settings/sso-connection/new`
    : '/admin/sso-connection/new';

  const { data, error, isLoading } = useSWR<
    ApiSuccess<((SAMLSSORecord | OIDCSSORecord) & { isSystemSSO?: boolean })[]>,
    ApiError
  >(getConnectionsUrl, fetcher, { revalidateOnFocus: false });

  const nextPageToken = data?.pageToken;
  // store the nextPageToken against the pageOffset
  useEffect(() => {
    if (nextPageToken) {
      setPageTokenMap((tokenMap) => ({ ...tokenMap, [paginate.offset]: nextPageToken }));
    }
  }, [nextPageToken, paginate.offset]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    errorToast(error.message);
    return null;
  }

  const connections = data?.data || [];
  const noConnections = connections.length === 0 && paginate.offset === 0;
  const noMoreResults = connections.length === 0 && paginate.offset > 0;

  if (connections && setupLinkToken && connections.length === 0) {
    router.replace(`/setup/${setupLinkToken}/sso-connection/new`);
    return null;
  }

  // Find the display name for a connection
  const connectionDisplayName = (connection: SAMLSSORecord | OIDCSSORecord) => {
    if (connection.name) {
      return connection.name;
    }

    if ('idpMetadata' in connection) {
      return connection.idpMetadata.friendlyProviderName || connection.idpMetadata.provider;
    }

    if ('oidcProvider' in connection) {
      return connection.oidcProvider.provider;
    }

    return 'Unknown';
  };

  return (
    <div>
      <div className='mb-5 flex items-center justify-between'>
        <h2 className='font-bold text-gray-700 dark:text-white md:text-xl'>
          {t(isSettingsView ? 'admin_portal_sso' : 'enterprise_sso')}
        </h2>
        <div className='flex gap-2'>
          <LinkPrimary Icon={PlusIcon} href={createConnectionUrl} data-testid='create-connection'>
            {t('new_connection')}
          </LinkPrimary>
          {!setupLinkToken && !isSettingsView && (
            <LinkPrimary
              Icon={LinkIcon}
              href='/admin/sso-connection/setup-link/new'
              data-testid='create-setup-link'>
              {t('new_setup_link')}
            </LinkPrimary>
          )}
        </div>
      </div>
      {idpEntityID && setupLinkToken && (
        <div className='mb-5 mt-5 items-center justify-between'>
          <div className='form-control'>
            <InputWithCopyButton text={idpEntityID} label={t('idp_entity_id')} />
          </div>
        </div>
      )}
      {noConnections ? (
        <EmptyState title={t('no_connections_found')} href={createConnectionUrl} />
      ) : (
        <>
          <div className='rounder border'>
            <table className='w-full text-left text-sm text-gray-500 dark:text-gray-400'>
              <thead className='bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400'>
                <tr className='hover:bg-gray-50'>
                  <th scope='col' className='px-6 py-3'>
                    {t('name')}
                  </th>
                  {displayTenantProduct && (
                    <>
                      <th scope='col' className='px-6 py-3'>
                        {t('tenant')}
                      </th>
                      <th scope='col' className='px-6 py-3'>
                        {t('product')}
                      </th>
                    </>
                  )}
                  <th scope='col' className='px-6 py-3'>
                    {t('idp_type')}
                  </th>
                  <th scope='col' className='px-6 py-3'>
                    {t('status')}
                  </th>
                  <th scope='col' className='px-6 py-3'>
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection) => {
                  const connectionIsSAML = 'idpMetadata' in connection;
                  const connectionIsOIDC = 'oidcProvider' in connection;
                  const isSystemSSO = connection?.isSystemSSO;
                  return (
                    <tr
                      key={connection.clientID}
                      className='border-b bg-white last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800'>
                      <td className='whitespace-nowrap px-6 py-3 text-sm text-gray-500 dark:text-gray-400'>
                        {connectionDisplayName(connection)}
                        {isSystemSSO && (
                          <Badge
                            color='info'
                            className='ml-2 uppercase'
                            aria-label='is an sso connection for the admin portal'
                            size='xs'>
                            {t('system')}
                          </Badge>
                        )}
                      </td>
                      {displayTenantProduct && (
                        <>
                          <td className='whitespace-nowrap px-6 py-3 text-sm font-medium text-gray-900 dark:text-white'>
                            {connection.tenant}
                          </td>
                          <td className='whitespace-nowrap px-6 py-3 text-sm text-gray-500 dark:text-gray-400'>
                            {connection.product}
                          </td>
                        </>
                      )}
                      <td className='px-6 py-3'>
                        {connectionIsOIDC ? 'OIDC' : connectionIsSAML ? 'SAML' : ''}
                      </td>
                      <td className='px-6'>
                        {connection.deactivated ? (
                          <Badge color='warning' size='md'>
                            {t('inactive')}
                          </Badge>
                        ) : (
                          <Badge color='success' size='md'>
                            {t('active')}
                          </Badge>
                        )}
                      </td>
                      <td className='px-6 py-3'>
                        <span className='inline-flex items-baseline'>
                          <IconButton
                            tooltip={t('edit')}
                            Icon={PencilIcon}
                            className='hover:text-green-400'
                            data-testid='edit'
                            onClick={() => {
                              router.push(
                                setupLinkToken
                                  ? `/setup/${setupLinkToken}/sso-connection/edit/${connection.clientID}`
                                  : isSettingsView || isSystemSSO
                                  ? `/admin/settings/sso-connection/edit/${connection.clientID}`
                                  : `/admin/sso-connection/edit/${connection.clientID}`
                              );
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {noMoreResults && <NoMoreResults colSpan={5} />}
              </tbody>
            </table>
          </div>
          {!isSettingsView && (
            <Pagination
              itemsCount={connections.length}
              offset={paginate.offset}
              onPrevClick={() => {
                setPaginate({
                  offset: paginate.offset - pageLimit,
                });
              }}
              onNextClick={() => {
                setPaginate({
                  offset: paginate.offset + pageLimit,
                });
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ConnectionList;
