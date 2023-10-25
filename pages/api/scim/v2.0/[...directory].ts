import type { DirectorySyncRequest } from '@boxyhq/saml-jackson';
import { extractAuthToken } from '@lib/auth';
import jackson from '@lib/jackson';
import { bodyParser } from '@lib/utils';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { directorySyncController } = await jackson();

  const { method, query } = req as NextApiRequest & { query: { directory: string[] } } & { method: string };
  const [directoryId, path, resourceId] = query.directory as string[];

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    body: bodyParser(req),
    method,
    directoryId,
    resourceId,
    resourceType: path,
    apiSecret: extractAuthToken(req),
    query: {
      count: query.count ? parseInt(query.count as string) : undefined,
      startIndex: query.startIndex ? parseInt(query.startIndex as string) : undefined,
      filter: query.filter as string,
    },
  };

  const { status, data } = await directorySyncController.requests.handle(
    request,
    directorySyncController.events.callback
  );

  return res.status(status).json(data);
}
