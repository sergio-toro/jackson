import type { DirectorySyncEvent } from '@boxyhq/saml-jackson';
import nock from 'nock';
import tap from 'tap';
import { DirectoryType, IDirectorySyncController } from '../../src/typings';
import { jacksonOptions } from '../utils';

let directorySyncController: IDirectorySyncController;

const directoryPayload = {
  tenant: 'boxyhq',
  product: 'saml-jackson-google',
  name: 'Google Directory',
  type: 'google' as DirectoryType,
  google_domain: 'boxyhq.com',
  google_access_token: 'access_token',
  google_refresh_token: 'refresh_token',
};

const fakeGoogleDirectory = {
  users: [
    {
      id: 'elizasmith',
      primaryEmail: 'eliza@example.com',
      name: {
        givenName: 'Eliza',
        familyName: 'Smith',
      },
      suspended: false,
      password: 'password',
      hashFunction: 'SHA-1',
      changePasswordAtNextLogin: false,
      ipWhitelisted: false,
      etag: 'abcd1234',
    },
    {
      id: 'johndoe',
      primaryEmail: 'john@example.com',
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      suspended: false,
      password: 'password',
      hashFunction: 'SHA-1',
      changePasswordAtNextLogin: false,
      ipWhitelisted: false,
      etag: 'efgh5678',
    },
  ],

  groups: [
    {
      id: 'engineering',
      email: 'engineering@example.com',
      name: 'Engineering Team',
      description: 'A group for the engineering department',
      adminCreated: true,
      directMembersCount: '10',
      kind: 'admin#directory#group',
      etag: 'abcd1234',
      aliases: ['eng-team@example.com', 'engineering@example.com'],
      nonEditableAliases: ['group123@example.com'],
    },
    {
      id: 'sales',
      email: 'sales@example.com',
      name: 'Sales Team',
      description: 'A group for the sales department',
      adminCreated: true,
      directMembersCount: '5',
      kind: 'admin#directory#group',
      etag: 'efgh5678',
      aliases: ['sales@example.com'],
      nonEditableAliases: ['sales-group456@example.com'],
    },
  ],

  members: {
    engineering: [
      {
        kind: 'directory#member',
        id: 'elizasmith',
        email: 'eliza@example.com',
        role: 'MANAGER',
        type: 'USER',
      },
      {
        kind: 'directory#member',
        id: 'johndoe',
        email: 'johndoe@example.com',
        role: 'MANAGER',
        type: 'USER',
      },
    ],
    sales: [
      {
        kind: 'directory#member',
        id: 'elizasmith',
        email: 'eliza@example.com',
        role: 'MANAGER',
        type: 'USER',
      },
    ],
    marketing: [
      {
        kind: 'directory#member',
        id: 'jackson',
        email: 'jackson@example.com',
        role: 'MANAGER',
        type: 'USER',
      },
    ],
  },
};

// Mock /admin/directory/v1/users
const mockUsersAPI = (users: any[]) => {
  nock('https://admin.googleapis.com')
    .get('/admin/directory/v1/users')
    .query({
      maxResults: 200,
      domain: 'boxyhq.com',
    })
    .reply(200, { users });
};

// Mock /admin/directory/v1/groups
const mockGroupsAPI = (groups: any[]) => {
  nock('https://admin.googleapis.com')
    .get('/admin/directory/v1/groups')
    .query({
      maxResults: 200,
      domain: 'boxyhq.com',
    })
    .times(2)
    .reply(200, { groups });
};

// Mock /admin/directory/v1/groups/{groupKey}/members
const mockGroupMembersAPI = (groupKey: string, members: any[]) => {
  nock('https://admin.googleapis.com')
    .get(`/admin/directory/v1/groups/${groupKey}/members`)
    .query({
      maxResults: 200,
      domain: 'boxyhq.com',
    })
    .reply(200, { members });
};

tap.before(async () => {
  directorySyncController = (await (await import('../../src/index')).default(jacksonOptions))
    .directorySyncController;

  await directorySyncController.directories.create(directoryPayload);
});

tap.teardown(async () => {
  process.exit(0);
});

tap.test('Sync 1', async (t) => {
  const events: DirectorySyncEvent[] = [];

  // Mock necessary API calls
  mockUsersAPI(fakeGoogleDirectory.users);
  mockGroupsAPI(fakeGoogleDirectory.groups);
  mockGroupMembersAPI('engineering', fakeGoogleDirectory.members.engineering);
  mockGroupMembersAPI('sales', fakeGoogleDirectory.members.sales);

  await directorySyncController.sync(async (event: DirectorySyncEvent) => {
    events.push(event);
  });

  nock.cleanAll();

  t.strictSame(events.length, 7);

  t.strictSame(events[0].event, 'user.created');
  t.strictSame(events[0].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[0].data.raw, fakeGoogleDirectory.users[0]);

  t.strictSame(events[1].event, 'user.created');
  t.strictSame(events[1].data.id, fakeGoogleDirectory.users[1].id);
  t.strictSame(events[1].data.raw, fakeGoogleDirectory.users[1]);

  t.strictSame(events[2].event, 'group.created');
  t.strictSame(events[2].data.id, fakeGoogleDirectory.groups[0].id);
  t.strictSame(events[2].data.raw, fakeGoogleDirectory.groups[0]);

  t.strictSame(events[3].event, 'group.created');
  t.strictSame(events[3].data.id, fakeGoogleDirectory.groups[1].id);
  t.strictSame(events[3].data.raw, fakeGoogleDirectory.groups[1]);

  t.strictSame(events[4].event, 'group.user_added');
  t.strictSame(events[4].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[4].data.raw, fakeGoogleDirectory.users[0]);

  // Check that the user was added to the group
  if ('group' in events[4].data) {
    t.strictSame(events[4].data.group.id, fakeGoogleDirectory.groups[0].id);
  }

  t.strictSame(events[5].event, 'group.user_added');
  t.strictSame(events[5].data.id, fakeGoogleDirectory.users[1].id);
  t.strictSame(events[5].data.raw, fakeGoogleDirectory.users[1]);

  // Check that the user was added to the group
  if ('group' in events[5].data) {
    t.strictSame(events[5].data.group.id, fakeGoogleDirectory.groups[0].id);
  }

  t.strictSame(events[6].event, 'group.user_added');
  t.strictSame(events[6].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[6].data.raw, fakeGoogleDirectory.users[0]);

  // Check that the user was added to the group
  if ('group' in events[6].data) {
    t.strictSame(events[6].data.group.id, fakeGoogleDirectory.groups[1].id);
  }

  t.end();
});

tap.test('Sync 2', async (t) => {
  const events: DirectorySyncEvent[] = [];

  // Update user
  fakeGoogleDirectory.users[0].name.givenName = 'Eliza Updated';

  // Update group
  fakeGoogleDirectory.groups[0].name = 'Engineering Updated';

  mockUsersAPI(fakeGoogleDirectory.users);
  mockGroupsAPI(fakeGoogleDirectory.groups);
  mockGroupMembersAPI('engineering', fakeGoogleDirectory.members.engineering);
  mockGroupMembersAPI('sales', fakeGoogleDirectory.members.sales);

  await directorySyncController.sync(async (event: DirectorySyncEvent) => {
    events.push(event);
  });

  nock.cleanAll();

  t.strictSame(events.length, 2);

  t.strictSame(events[0].event, 'user.updated');
  t.strictSame(events[0].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[0].data.raw, fakeGoogleDirectory.users[0]);

  t.strictSame(events[1].event, 'group.updated');
  t.strictSame(events[1].data.id, fakeGoogleDirectory.groups[0].id);
  t.strictSame(events[1].data.raw, fakeGoogleDirectory.groups[0]);

  t.end();
});

tap.test('Sync 3', async (t) => {
  const events: DirectorySyncEvent[] = [];

  // Delete the last user
  const deleteUser = fakeGoogleDirectory.users.pop();

  // Delete the last group
  const deleteGroup = fakeGoogleDirectory.groups.pop();

  // Clear the members
  fakeGoogleDirectory.members.sales = [];

  mockUsersAPI(fakeGoogleDirectory.users);
  mockGroupsAPI(fakeGoogleDirectory.groups);
  mockGroupMembersAPI('engineering', fakeGoogleDirectory.members.engineering);

  await directorySyncController.sync(async (event: DirectorySyncEvent) => {
    events.push(event);
  });

  nock.cleanAll();

  t.strictSame(events.length, 2);

  t.strictSame(events[0].event, 'user.deleted');
  t.strictSame(events[0].data.id, deleteUser?.id);
  t.strictSame(events[0].data.raw, deleteUser);

  t.strictSame(events[1].event, 'group.deleted');
  t.strictSame(events[1].data.id, deleteGroup?.id);
  t.strictSame(events[1].data.raw, deleteGroup);

  t.end();
});

tap.test('Sync 4', async (t) => {
  const events: DirectorySyncEvent[] = [];

  // Add new user
  const newUser = {
    ...fakeGoogleDirectory.users[0],
    id: 'jackson',
    primaryEmail: 'jackson@example.com',
    name: {
      givenName: 'Jackson',
      familyName: 'Smith',
    },
  };

  // Add new group
  const newGroup = {
    ...fakeGoogleDirectory.groups[0],
    id: 'marketing',
    email: 'marketing@example.com',
    name: 'Marketing Team',
    description: 'A group for the marketing department',
  };

  fakeGoogleDirectory.users.push(newUser);
  fakeGoogleDirectory.groups.push(newGroup);

  mockUsersAPI(fakeGoogleDirectory.users);
  mockGroupsAPI(fakeGoogleDirectory.groups);
  mockGroupMembersAPI('engineering', fakeGoogleDirectory.members.engineering);
  mockGroupMembersAPI('marketing', fakeGoogleDirectory.members.marketing);

  await directorySyncController.sync(async (event: DirectorySyncEvent) => {
    events.push(event);
  });

  nock.cleanAll();

  t.strictSame(events.length, 3);

  t.strictSame(events[0].event, 'user.created');
  t.strictSame(events[0].data.id, newUser.id);
  t.strictSame(events[0].data.raw, newUser);

  t.strictSame(events[1].event, 'group.created');
  t.strictSame(events[1].data.id, newGroup.id);
  t.strictSame(events[1].data.raw, newGroup);

  t.strictSame(events[2].event, 'group.user_added');
  t.strictSame(events[2].data.id, newUser.id);
  t.strictSame(events[2].data.raw, newUser);

  // Check that the user was added to the group
  if ('group' in events[2].data) {
    t.strictSame(events[2].data.group.id, newGroup.id);
  }

  t.end();
});

tap.test('Sync 5', async (t) => {
  const events: DirectorySyncEvent[] = [];

  // Remove elizasmith from the engineering group
  fakeGoogleDirectory.members.engineering.shift();

  // Add elizasmith to the marketing group
  fakeGoogleDirectory.members.marketing.push({
    kind: 'directory#member',
    id: 'elizasmith',
    email: 'eliza@example.com',
    role: 'MANAGER',
    type: 'USER',
  });

  mockUsersAPI(fakeGoogleDirectory.users);
  mockGroupsAPI(fakeGoogleDirectory.groups);
  mockGroupMembersAPI('engineering', fakeGoogleDirectory.members.engineering);
  mockGroupMembersAPI('marketing', fakeGoogleDirectory.members.marketing);

  await directorySyncController.sync(async (event: DirectorySyncEvent) => {
    events.push(event);
  });

  nock.cleanAll();

  t.strictSame(events.length, 2);

  t.strictSame(events[0].event, 'group.user_removed');
  t.strictSame(events[0].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[0].data.raw, fakeGoogleDirectory.users[0]);

  // Check that the user was removed from the group
  if ('group' in events[0].data) {
    t.strictSame(events[0].data.group.id, fakeGoogleDirectory.groups[0].id);
  }

  t.strictSame(events[1].event, 'group.user_added');
  t.strictSame(events[1].data.id, fakeGoogleDirectory.users[0].id);
  t.strictSame(events[1].data.raw, fakeGoogleDirectory.users[0]);

  // Check that the user was added to the group
  if ('group' in events[1].data) {
    t.strictSame(events[1].data.group.id, fakeGoogleDirectory.groups[1].id);
  }

  t.end();
});
