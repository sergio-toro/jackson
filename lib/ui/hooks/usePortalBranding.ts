import { fetcher } from '@lib/ui/utils';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';

const usePortalBranding = () => {
  const url = '/api/branding';

  const { data, error, isLoading } = useSWR<
    ApiSuccess<{
      logoUrl: string;
      primaryColor: string;
      faviconUrl: string;
      companyName: string;
    }>,
    ApiError
  >(url, fetcher);

  return {
    branding: data?.data,
    isLoading,
    error,
  };
};

export default usePortalBranding;
