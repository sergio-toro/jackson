import jackson from '@lib/jackson';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    throw { message: 'Method not allowed', statusCode: 405 };
  }

  const { encryption = 'false' } = req.query;

  const { spConfig } = await jackson();

  res
    .status(200)
    .setHeader('Content-Type', 'text/xml')
    .send(await spConfig.toXMLMetadata(encryption === 'true'));
}
