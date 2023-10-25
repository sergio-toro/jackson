// Maintain /config path for backward compatibility
import type { DelConnectionsQuery, GetConfigQuery } from '@boxyhq/saml-jackson';
import jackson from '@lib/jackson';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { connectionAPIController } = await jackson();
    if (req.method === 'POST') {
      res.json(await connectionAPIController.config(req.body));
    } else if (req.method === 'GET') {
      res.json(await connectionAPIController.getConfig(req.query as GetConfigQuery));
    } else if (req.method === 'PATCH') {
      res.status(204).end(await connectionAPIController.updateConfig(req.body));
    } else if (req.method === 'DELETE') {
      res.status(204).end(await connectionAPIController.deleteConfig(req.query as DelConnectionsQuery));
    } else {
      throw { message: 'Method not allowed', statusCode: 405 };
    }
  } catch (err: any) {
    console.error('config api error:', err);
    const { message, statusCode = 500 } = err;

    res.status(statusCode).send(message);
  }
}
