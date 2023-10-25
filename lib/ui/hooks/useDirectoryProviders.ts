import type { DirectorySyncProviders } from '@boxyhq/saml-jackson';
import { fetcher } from '@lib/ui/utils';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';

const useDirectoryProviders = (setupLinkToken?: string) => {
  const url = setupLinkToken
    ? `/api/setup/${setupLinkToken}/directory-sync/providers`
    : '/api/admin/directory-sync/providers';

  const { data, error, isLoading } = useSWR<ApiSuccess<DirectorySyncProviders>, ApiError>(url, fetcher);

  return {
    providers: data?.data,
    isLoading,
    error,
  };
};

export default useDirectoryProviders;
