import sinon from 'sinon';
import tap from 'tap';
import axios from '../../src/event/axios';
import { createSignatureString } from '../../src/event/webhook';
import { Directory, DirectorySyncEvent, EventCallback, IDirectorySyncController } from '../../src/typings';
import { jacksonOptions } from '../utils';
import { getFakeDirectory } from './data/directories';
import { default as groupRequest } from './data/group-requests';
import groups from './data/groups';
import { default as usersRequest } from './data/user-requests';
import users from './data/users';

let directorySync: IDirectorySyncController;
let directory: Directory;
let eventCallback: EventCallback;

const fakeDirectory = getFakeDirectory();

const webhook: Directory['webhook'] = {
  endpoint: 'http://localhost',
  secret: 'secret',
};

tap.before(async () => {
  const jackson = await (await import('../../src/index')).default(jacksonOptions);

  directorySync = jackson.directorySyncController;

  // Create a directory before starting the test
  const { data, error } = await directorySync.directories.create({
    ...fakeDirectory,
    webhook_url: webhook.endpoint,
    webhook_secret: webhook.secret,
  });

  if (error || !data) {
    tap.fail("Couldn't create a directory");
    return;
  }

  directory = data;

  // Turn on webhook event logging for the directory
  await directorySync.directories.update(directory.id, {
    log_webhook_events: true,
  });

  directorySync.webhookLogs.setTenantAndProduct(directory.tenant, directory.product);
  directorySync.users.setTenantAndProduct(directory.tenant, directory.product);

  eventCallback = directorySync.events.callback;
});

tap.teardown(async () => {
  process.exit(0);
});

tap.test('Webhook Events /', async (t) => {
  t.teardown(async () => {
    await directorySync.directories.delete(directory.id);
  });

  t.test('Webhook Events / ', async (t) => {
    t.afterEach(async () => {
      await directorySync.webhookLogs.deleteAll(directory.id);
    });

    t.test("Should be able to get the directory's webhook", async (t) => {
      t.match(directory.webhook.endpoint, webhook.endpoint);
      t.match(directory.webhook.secret, webhook.secret);
    });

    t.test('Should not log events if the directory has no webhook', async (t) => {
      await directorySync.directories.update(directory.id, {
        webhook: {
          endpoint: '',
          secret: '',
        },
      });

      // Create a user
      await directorySync.requests.handle(usersRequest.create(directory, users[0]), eventCallback);

      const events = await directorySync.webhookLogs.getAll();

      t.equal(events.length, 0);

      // Restore the directory's webhook
      await directorySync.directories.update(directory.id, {
        webhook: {
          endpoint: webhook.endpoint,
          secret: webhook.secret,
        },
      });
    });

    t.test('Should not log webhook events if the logging is turned off', async (t) => {
      // Turn off webhook event logging for the directory
      await directorySync.directories.update(directory.id, {
        log_webhook_events: false,
      });

      // Create a user
      await directorySync.requests.handle(usersRequest.create(directory, users[0]), eventCallback);

      const events = await directorySync.webhookLogs.getAll();

      t.equal(events.length, 0);

      // Turn on webhook event logging for the directory
      await directorySync.directories.update(directory.id, {
        log_webhook_events: true,
      });
    });

    t.test('Should be able to get an event by id', async (t) => {
      // Create a user
      await directorySync.requests.handle(usersRequest.create(directory, users[0]), eventCallback);

      const logs = await directorySync.webhookLogs.getAll();

      const log = await directorySync.webhookLogs.get(logs[0].id);

      t.equal(log.id, logs[0].id);
    });

    t.test('Should send user related events', async (t) => {
      const mock = sinon.mock(axios);

      mock.expects('post').thrice().withArgs(webhook.endpoint).throws();

      // Create the user
      const { data: createdUser } = await directorySync.requests.handle(
        usersRequest.create(directory, users[0]),
        eventCallback
      );

      // Update the user
      const { data: updatedUser } = await directorySync.requests.handle(
        usersRequest.updateById(directory, createdUser.id, users[0]),
        eventCallback
      );

      // Delete the user
      const { data: deletedUser } = await directorySync.requests.handle(
        usersRequest.deleteById(directory, createdUser.id),
        eventCallback
      );

      mock.verify();
      mock.restore();

      const logs = await directorySync.webhookLogs.getAll();

      t.ok(logs);
      t.equal(logs.length, 3);

      t.match(logs[0].event, 'user.deleted');
      t.match(logs[0].directory_id, directory.id);
      t.hasStrict(logs[0].data.raw, deletedUser);

      t.match(logs[1].event, 'user.updated');
      t.match(logs[1].directory_id, directory.id);
      t.hasStrict(logs[1].data.raw, updatedUser);

      t.match(logs[2].event, 'user.created');
      t.match(logs[2].directory_id, directory.id);
      t.hasStrict(logs[2].data.raw, createdUser);

      await directorySync.users.deleteAll(directory.id);
    });

    t.test('Should send group related events', async (t) => {
      const mock = sinon.mock(axios);

      mock.expects('post').thrice().withArgs(webhook.endpoint).throws();

      // Create the group
      const { data: createdGroup } = await directorySync.requests.handle(
        groupRequest.create(directory, groups[0]),
        eventCallback
      );

      // Update the group
      const { data: updatedGroup } = await directorySync.requests.handle(
        groupRequest.updateById(directory, createdGroup.id, groups[0]),
        eventCallback
      );

      // Delete the group
      const { data: deletedGroup } = await directorySync.requests.handle(
        groupRequest.deleteById(directory, createdGroup.id),
        eventCallback
      );

      mock.verify();
      mock.restore();

      const logs = await directorySync.webhookLogs.getAll();

      t.ok(logs);
      t.equal(logs.length, 3);

      t.match(logs[0].event, 'group.deleted');
      t.match(logs[0].directory_id, directory.id);
      t.hasStrict(logs[0].data.raw, deletedGroup);

      t.match(logs[1].event, 'group.updated');
      t.match(logs[1].directory_id, directory.id);
      t.hasStrict(logs[1].data.raw, updatedGroup);

      t.match(logs[2].event, 'group.created');
      t.match(logs[2].directory_id, directory.id);
      t.hasStrict(logs[2].data.raw, createdGroup);
    });

    t.test('Should send group membership related events', async (t) => {
      const mock = sinon.mock(axios);

      mock.expects('post').exactly(4).withArgs(webhook.endpoint).throws();

      // Create the user
      const { data: createdUser } = await directorySync.requests.handle(
        usersRequest.create(directory, users[0]),
        eventCallback
      );

      // Create the group
      const { data: createdGroup } = await directorySync.requests.handle(
        groupRequest.create(directory, groups[0]),
        eventCallback
      );

      // Add the user to the group
      await directorySync.requests.handle(
        groupRequest.addMembers(directory, createdGroup.id, [{ value: createdUser.id }]),
        eventCallback
      );

      // Remove the user from the group
      await directorySync.requests.handle(
        groupRequest.removeMembers(
          directory,
          createdGroup.id,
          [{ value: createdUser.id }],
          `members[value eq "${createdUser.id}"]`
        ),
        eventCallback
      );

      mock.verify();
      mock.restore();

      const logs = await directorySync.webhookLogs.getAll();

      t.ok(logs);
      t.equal(logs.length, 4);

      t.match(logs[0].event, 'group.user_removed');
      t.match(logs[0].directory_id, directory.id);
      t.hasStrict(logs[0].data.raw, createdUser);

      t.match(logs[1].event, 'group.user_added');
      t.match(logs[1].directory_id, directory.id);
      t.hasStrict(logs[1].data.raw, createdUser);

      await directorySync.users.delete(createdUser.id);
      await directorySync.groups.delete(createdGroup.id);
    });

    t.test('createSignatureString()', async (t) => {
      const event: DirectorySyncEvent = {
        event: 'user.created',
        directory_id: directory.id,
        tenant: directory.tenant,
        product: directory.product,
        data: {
          raw: [],
          id: 'user-id',
          first_name: 'Kiran',
          last_name: 'Krishnan',
          email: 'kiran@boxyhq.com',
          active: true,
        },
      };

      const signatureString = createSignatureString(directory.webhook.secret, event);
      const parts = signatureString.split(',');

      t.ok(signatureString);
      t.ok(parts[0].match(/^t=[0-9a-f]/));
      t.ok(parts[1].match(/^s=[0-9a-f]/));

      // Empty secret should create an empty signature
      const emptySignatureString = createSignatureString('', event);

      t.match(emptySignatureString, '');
    });
  });
});
