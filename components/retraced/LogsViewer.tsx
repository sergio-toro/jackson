import ErrorMessage from '@components/Error';
import Loading from '@components/Loading';
import { fetcher } from '@lib/ui/utils';
import RetracedEventsBrowser from '@retracedhq/logs-viewer';
import useSWR from 'swr';
import type { ApiError, ApiSuccess } from 'types';
import type { Project } from 'types/retraced';

const LogsViewer = (props: { project: Project; environmentId: string; groupId: string; host: string }) => {
  const { project, environmentId, groupId, host } = props;

  const token = project.tokens.filter((token) => token.environment_id === environmentId)[0];

  const { data, error, isLoading } = useSWR<ApiSuccess<{ viewerToken: string }>, ApiError>(
    `/api/admin/retraced/projects/${project.id}/viewer-token?groupId=${groupId}&token=${token.token}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage />;
  }

  const viewerToken = data?.data?.viewerToken;

  return (
    <>
      {viewerToken && (
        <RetracedEventsBrowser
          host={`${host}/viewer/v1`}
          auditLogToken={viewerToken}
          header='Audit Logs'
          customClass={'text-primary dark:text-white'}
          skipViewLogEvent={true}
        />
      )}
    </>
  );
};

export default LogsViewer;
