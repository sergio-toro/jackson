import type {
  Directory,
  EventData,
  EventPayloadSchema,
  EventType,
  JacksonOption,
  OIDCSSORecord,
  SAMLSSORecord,
  SSOConnectionEventType,
  Webhook,
} from '../typings';
import {
  transformDirectoryConnection,
  transformOIDCSSOConnection,
  transformSAMLSSOConnection,
} from './utils';
import { sendPayloadToWebhook } from './webhook';

export default class Event {
  private webhook: JacksonOption['webhook'];

  constructor({ opts }: { opts: JacksonOption }) {
    this.webhook = opts.webhook;
  }

  async notify<T extends EventType>(
    event: T,
    data: T extends SSOConnectionEventType ? SAMLSSORecord | OIDCSSORecord : Directory
  ) {
    const payload = this.constructPayload(event, data);

    return this.sendWebhookEvent(this.webhook, payload);
  }

  private constructPayload(event: EventType, data: SAMLSSORecord | OIDCSSORecord | Directory) {
    let transformedData: EventData;

    if ('idpMetadata' in data) {
      transformedData = transformSAMLSSOConnection(data);
    } else if ('oidcProvider' in data) {
      transformedData = transformOIDCSSOConnection(data);
    } else {
      transformedData = transformDirectoryConnection(data);
    }

    const { tenant, product } = data;

    const payload: EventPayloadSchema = {
      event,
      tenant,
      product,
      data: transformedData,
    };

    return payload;
  }

  async sendWebhookEvent(webhook: Webhook | undefined, payload: EventPayloadSchema) {
    if (!webhook?.endpoint || !webhook.secret) {
      return;
    }

    return await sendPayloadToWebhook(webhook, payload);
  }
}
