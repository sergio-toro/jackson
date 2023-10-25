import EventController from '../event';
import type {
  Directory,
  DirectorySyncEventData,
  DirectorySyncEventType,
  OIDCSSORecord,
  SAMLSSORecord,
} from '../typings';

export type IEventController = InstanceType<typeof EventController>;

export type SSOConnectionEventType = 'sso.created' | 'sso.deleted' | 'sso.activated' | 'sso.deactivated';

export type DsyncConnectionEventType =
  | 'dsync.created'
  | 'dsync.deleted'
  | 'dsync.activated'
  | 'dsync.deactivated';

export type EventType = SSOConnectionEventType | DsyncConnectionEventType | DirectorySyncEventType;

export type SAMLSSOConnectionEventData = Pick<
  SAMLSSORecord,
  'name' | 'description' | 'clientID' | 'clientSecret'
> & {
  provider: string;
  friendlyProviderName: string;
};

export type OIDCSSOConnectionEventData = Pick<
  OIDCSSORecord,
  'name' | 'description' | 'clientID' | 'clientSecret'
> & {
  provider: string | undefined;
};

export type DsyncConnectionEventData = Pick<Directory, 'id' | 'name' | 'type'>;

export type EventData =
  | SAMLSSOConnectionEventData
  | OIDCSSOConnectionEventData
  | DsyncConnectionEventData
  | DirectorySyncEventData;

export type EventPayloadSchema = {
  tenant: string;
  product: string;
  event: EventType;
  data: EventData;
};
