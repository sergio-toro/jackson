import type { SetupLink } from '@boxyhq/saml-jackson';
import { fetcher } from '@lib/ui/utils';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';

const useSetupLink = (setupLinkToken: string) => {
  const url = setupLinkToken ? `/api/setup/${setupLinkToken}` : null;

  const { data, error, isLoading } = useSWR<ApiSuccess<SetupLink>, ApiError>(url, fetcher);

  return {
    setupLink: data?.data,
    isLoading,
    error,
  };
};

export default useSetupLink;
