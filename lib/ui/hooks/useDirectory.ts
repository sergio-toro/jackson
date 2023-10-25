import type { Directory } from '@boxyhq/saml-jackson';
import { fetcher } from '@lib/ui/utils';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';

const useDirectory = (directoryId: string, setupLinkToken?: string) => {
  const url = setupLinkToken
    ? `/api/setup/${setupLinkToken}/directory-sync/${directoryId}`
    : `/api/admin/directory-sync/${directoryId}`;

  const { data, error, isLoading, isValidating } = useSWR<ApiSuccess<Directory>, ApiError>(url, fetcher);

  return {
    directory: data?.data,
    isLoading,
    isValidating,
    error,
  };
};

export default useDirectory;
