import { retracedOptions } from '@lib/env';
import { getToken } from '@lib/retraced';
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Project } from 'types/retraced';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return await getProject(req, res);
    default:
      res.setHeader('Allow', 'GET');
      res.status(405).json({
        data: null,
        error: { message: `Method ${method} Not Allowed` },
      });
  }
}

const getProject = async (req: NextApiRequest, res: NextApiResponse) => {
  const token = await getToken(req);

  const { id } = req.query;

  const { data } = await axios.get<{ project: Project }>(
    `${retracedOptions?.hostUrl}/admin/v1/project/${id}`,
    {
      headers: {
        Authorization: `id=${token.id} token=${token.token} admin_token=${retracedOptions.adminToken}`,
      },
    }
  );

  return res.status(201).json({
    data,
    error: null,
  });
};

export default handler;
