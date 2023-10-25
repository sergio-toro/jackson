// Maintain /config path for backward compatibility
import type { GetConfigQuery } from '@boxyhq/saml-jackson';
import jackson from '@lib/jackson';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { connectionAPIController } = await jackson();
    if (req.method === 'GET') {
      const rsp = await connectionAPIController.getConfig(req.query as GetConfigQuery);
      if (Object.keys(rsp).length === 0) {
        res.status(404).send({});
      } else {
        res.status(204).end();
      }
    } else {
      throw { message: 'Method not allowed', statusCode: 405 };
    }
  } catch (err: any) {
    console.error('config api error:', err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
