import type {
  ApiError,
  Directory,
  DirectorySyncRequest,
  DirectorySyncResponse,
  EventCallback,
  IDirectoryConfig,
  IUsers,
  User,
  UserPatchOperation,
} from '../../typings';
import { sendEvent } from './events';
import { extractStandardUserAttributes, parseUserPatchRequest, updateRawUserAttributes } from './utils';

interface DirectoryUsersParams {
  directories: IDirectoryConfig;
  users: IUsers;
}

export class DirectoryUsers {
  private directories: IDirectoryConfig;
  private users: IUsers;
  private callback: EventCallback | undefined;

  constructor({ directories, users }: DirectoryUsersParams) {
    this.directories = directories;
    this.users = users;
  }

  public async create(directory: Directory, body: any): Promise<DirectorySyncResponse> {
    const { id, first_name, last_name, email, active } = extractStandardUserAttributes(body);

    const { data: user } = await this.users.create({
      directoryId: directory.id,
      id,
      first_name,
      last_name,
      email,
      active,
      raw: 'rawAttributes' in body ? body.rawAttributes : body,
    });

    await sendEvent('user.created', { directory, user }, this.callback);

    return {
      status: 201,
      data: user?.raw,
    };
  }

  public async get(user: User): Promise<DirectorySyncResponse> {
    return {
      status: 200,
      data: user.raw,
    };
  }

  public async update(directory: Directory, user: User, body: any): Promise<DirectorySyncResponse> {
    const { name, emails, active } = body;

    const { data: updatedUser } = await this.users.update(user.id, {
      first_name: name.givenName,
      last_name: name.familyName,
      email: emails[0].value,
      active,
      raw: 'rawAttributes' in body ? body.rawAttributes : body,
    });

    await sendEvent('user.updated', { directory, user: updatedUser }, this.callback);

    return {
      status: 200,
      data: updatedUser?.raw,
    };
  }

  public async patch(directory: Directory, user: User, body: any): Promise<DirectorySyncResponse> {
    const { Operations } = body as { Operations: UserPatchOperation[] };

    let attributes: Partial<User> = {};
    let rawAttributes = {};

    // There can be multiple update operations in a single request for a user
    for (const operation of Operations) {
      const parsedAttributes = parseUserPatchRequest(operation);

      attributes = {
        ...attributes,
        ...parsedAttributes.attributes,
      };

      rawAttributes = {
        ...rawAttributes,
        ...parsedAttributes.rawAttributes,
      };
    }

    const { data: updatedUser } = await this.users.update(user.id, {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      active: user.active,
      ...attributes,
      raw: updateRawUserAttributes(user.raw, rawAttributes),
    });

    await sendEvent('user.updated', { directory, user: updatedUser }, this.callback);

    return {
      status: 200,
      data: updatedUser?.raw,
    };
  }

  public async delete(directory: Directory, user: User): Promise<DirectorySyncResponse> {
    await this.users.delete(user.id);

    await sendEvent('user.deleted', { directory, user }, this.callback);

    return {
      status: 200,
      data: user.raw,
    };
  }

  public async getAll(queryParams: {
    count: number;
    startIndex: number;
    filter?: string;
    directoryId: string;
  }): Promise<DirectorySyncResponse> {
    const { startIndex, filter, count, directoryId } = queryParams;

    let users: User[] | null = [];
    let totalResults = 0;

    if (filter) {
      // Search users by userName
      // filter: userName eq "john@example.com"
      const { data } = await this.users.search(filter.split('eq ')[1].replace(/['"]+/g, ''), directoryId);

      users = data;
      totalResults = users ? users.length : 0;
    } else {
      // Fetch all the existing Users (Paginated)
      // At this moment, we don't have method to count the database records.
      const { data: allUsers } = await this.users.getAll({ directoryId });
      const { data } = await this.users.getAll({ pageOffset: startIndex - 1, pageLimit: count, directoryId });

      users = data;
      totalResults = allUsers ? allUsers.length : 0;
    }

    return {
      status: 200,
      data: {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: startIndex ? startIndex : 1,
        totalResults: totalResults ? totalResults : 0,
        itemsPerPage: count ? count : 0,
        Resources: users ? users.map((user) => user.raw) : [],
      },
    };
  }

  private respondWithError(error: ApiError | null) {
    return {
      status: error ? error.code : 500,
      data: null,
    };
  }

  // Handle the request from the Identity Provider and route it to the appropriate method
  public async handleRequest(
    request: DirectorySyncRequest,
    callback?: EventCallback
  ): Promise<DirectorySyncResponse> {
    const { body, query, resourceId: userId, directoryId, apiSecret } = request;

    const method = request.method.toUpperCase();

    // Get the directory
    const { data: directory, error } = await this.directories.get(directoryId);

    if (error || !directory) {
      return this.respondWithError(error);
    }

    // Validate the request
    if (directory.scim.secret != apiSecret) {
      return this.respondWithError({ code: 401, message: 'Unauthorized' });
    }

    this.callback = callback;
    this.users.setTenantAndProduct(directory.tenant, directory.product);

    // Get the user
    const { data: user } = userId ? await this.users.get(userId) : { data: null };

    // Delete password if exists in the body
    if (body && 'password' in body) {
      delete body['password'];
    }

    if (userId && !user) {
      return this.respondWithError({ code: 404, message: 'User not found' });
    }

    if (user) {
      switch (method) {
        case 'GET':
          return await this.get(user);
        case 'PATCH':
          return await this.patch(directory, user, body);
        case 'PUT':
          return await this.update(directory, user, body);
        case 'DELETE':
          return await this.delete(directory, user);
      }
    }

    switch (method) {
      case 'POST':
        return await this.create(directory, body);
      case 'GET':
        return await this.getAll({
          count: query.count as number,
          startIndex: query.startIndex as number,
          filter: query.filter,
          directoryId,
        });
    }

    return {
      status: 404,
      data: {},
    };
  }
}
