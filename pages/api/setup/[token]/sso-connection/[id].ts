import type { SetupLink } from '@boxyhq/saml-jackson';
import jackson from '@lib/jackson';
import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { setupLinkController } = await jackson();

  const { method } = req;
  const { token } = req.query as { token: string };

  try {
    const setupLink = await setupLinkController.getByToken(token);

    switch (method) {
      case 'GET':
        return await handleGET(req, res, setupLink);
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: { message: `Method ${method} Not Allowed` } });
    }
  } catch (error: any) {
    const { message, statusCode = 500 } = error;

    return res.status(statusCode).json({ error: { message } });
  }
};

const handleGET = async (req: NextApiRequest, res: NextApiResponse, setupLink: SetupLink) => {
  const { connectionAPIController } = await jackson();

  const { id } = req.query as { id: string };

  const connections = await connectionAPIController.getConnections({
    tenant: setupLink.tenant,
    product: setupLink.product,
  });

  return res.json({ data: connections.filter((l) => l.clientID === id)[0] });
};

export default handler;
