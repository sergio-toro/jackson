import jackson from '@lib/jackson';
import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  switch (method) {
    case 'GET':
      return await handleGET(req, res);
    default:
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: { message: `Method ${method} Not Allowed` } });
  }
};

// Get the details of a user
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { directorySyncController } = await jackson();

  const { directoryId, userId } = req.query as { directoryId: string; userId: string };

  const { data: directory } = await directorySyncController.directories.get(directoryId);

  if (!directory) {
    return res.status(404).json({ error: { message: 'Directory not found.' } });
  }

  const { data: user, error } = await directorySyncController.users
    .setTenantAndProduct(directory.tenant, directory.product)
    .get(userId);

  if (error) {
    return res.status(400).json({ error });
  }

  if (user) {
    return res.status(200).json({ data: user });
  }
};

export default handler;
