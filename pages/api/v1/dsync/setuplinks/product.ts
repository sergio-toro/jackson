import type { SetupLinkService } from '@boxyhq/saml-jackson';
import jackson from '@lib/jackson';
import type { NextApiRequest, NextApiResponse } from 'next';

const service: SetupLinkService = 'dsync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const { message, statusCode = 500 } = error;

    res.status(statusCode).json({ error: { message } });
  }
}

// Get the setup links filtered by the product
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { setupLinkController } = await jackson();

  const { product, pageOffset, pageLimit, pageToken } = req.query as {
    product: string;
    pageOffset: string;
    pageLimit: string;
    pageToken?: string;
  };

  if (!product) {
    throw new Error('Please provide a product');
  }

  const setupLinks = await setupLinkController.filterBy({
    product,
    service,
    pageOffset: parseInt(pageOffset),
    pageLimit: parseInt(pageLimit),
    pageToken,
  });

  res.json(setupLinks);
};
