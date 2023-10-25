import type { DatabaseStore, EventCallback, IEventController, JacksonOption } from '../typings';
import { startSync } from './non-scim';
import { newGoogleProvider } from './non-scim/google';
import { RequestHandler } from './request';
import { DirectoryConfig } from './scim/DirectoryConfig';
import { DirectoryGroups } from './scim/DirectoryGroups';
import { DirectoryUsers } from './scim/DirectoryUsers';
import { handleEventCallback } from './scim/events';
import { Groups } from './scim/Groups';
import { Users } from './scim/Users';
import { getDirectorySyncProviders } from './scim/utils';
import { WebhookEventsLogger } from './scim/WebhookEventsLogger';

const directorySync = async (params: {
  db: DatabaseStore;
  opts: JacksonOption;
  eventController: IEventController;
}) => {
  const { db, opts, eventController } = params;

  const users = new Users({ db });
  const groups = new Groups({ db });
  const logger = new WebhookEventsLogger({ db });
  const directories = new DirectoryConfig({ db, opts, users, groups, logger, eventController });

  const directoryUsers = new DirectoryUsers({ directories, users });
  const directoryGroups = new DirectoryGroups({ directories, users, groups });
  const requestHandler = new RequestHandler(directoryUsers, directoryGroups);

  // Fetch the supported providers
  const getProviders = () => {
    return getDirectorySyncProviders();
  };

  const googleProvider = newGoogleProvider({ directories, opts });

  return {
    users,
    groups,
    directories,
    webhookLogs: logger,
    requests: requestHandler,
    providers: getProviders,
    events: {
      callback: await handleEventCallback(directories, logger),
    },
    google: googleProvider.oauth,
    sync: async (callback: EventCallback) => {
      return await startSync(
        { userController: users, groupController: groups, opts, directories, requestHandler },
        callback
      );
    },
  };
};

export default directorySync;
