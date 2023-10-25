import { randomUUID } from 'crypto';
import { apiError, JacksonError } from '../../controller/error';
import {
  createRandomSecret,
  IndexNames,
  isConnectionActive,
  storeNamespacePrefix,
  validateTenantAndProduct,
} from '../../controller/utils';
import * as dbutils from '../../db/utils';
import * as metrics from '../../opentelemetry/metrics';
import type {
  DatabaseStore,
  Directory,
  DirectoryType,
  IEventController,
  IGroups,
  Index,
  IUsers,
  IWebhookEventsLogger,
  JacksonOption,
  PaginationParams,
  Response,
  Storable,
} from '../../typings';
import { getDirectorySyncProviders, isSCIMEnabledProvider } from './utils';

interface DirectoryConfigParams {
  db: DatabaseStore;
  opts: JacksonOption;
  users: IUsers;
  groups: IGroups;
  logger: IWebhookEventsLogger;
  eventController: IEventController;
}

interface FilterByParams extends PaginationParams {
  product?: string;
  provider?: DirectoryType;
}

/**
 * @swagger
 * definitions:
 *   Directory:
 *      type: object
 *      properties:
 *        id:
 *          type: string
 *          description: Directory ID
 *        name:
 *          type: string
 *          description: name
 *        tenant:
 *          type: string
 *          description: Tenant
 *        product:
 *          type: string
 *          description: Product
 *        type:
 *          type: string
 *          description: Directory provider
 *        deactivated:
 *          type: boolean
 *          description: Status
 *        log_webhook_events:
 *          type: boolean
 *          description: If true, webhook requests will be logged
 *        scim:
 *         type: object
 *         properties:
 *           path:
 *              type: string
 *              description: SCIM path
 *           endpoint:
 *              type: string
 *              description: SCIM url
 *           secret:
 *              type: string
 *              description: SCIM secret
 *        webhook:
 *         type: object
 *         properties:
 *           endpoint:
 *              type: string
 *              description: Webhook url
 *           secret:
 *              type: string
 *              description: Webhook secret
 */
export class DirectoryConfig {
  private _store: Storable | null = null;
  private opts: JacksonOption;
  private db: DatabaseStore;
  private users: IUsers;
  private groups: IGroups;
  private logger: IWebhookEventsLogger;
  private eventController: IEventController;

  constructor({ db, opts, users, groups, logger, eventController }: DirectoryConfigParams) {
    this.opts = opts;
    this.db = db;
    this.users = users;
    this.groups = groups;
    this.logger = logger;
    this.eventController = eventController;
  }

  // Return the database store
  private store(): Storable {
    return this._store || (this._store = this.db.store(storeNamespacePrefix.dsync.config));
  }

  /**
   * @swagger
   * parameters:
   *   tenant:
   *     name: tenant
   *     description: Tenant
   *     in: query
   *     required: true
   *     type: string
   *   product:
   *     name: product
   *     description: Product
   *     in: query
   *     required: true
   *     type: string
   *   directoryId:
   *     name: directory id
   *     description: Directory ID
   *     in: query
   *     required: false
   *     type: string
   */

  /**
   * @swagger
   * /api/v1/dsync:
   *   post:
   *     summary: Create a directory connection
   *     parameters:
   *       - name: tenant
   *         description: Tenant
   *         in: formData
   *         required: true
   *         type: string
   *       - name: product
   *         description: Product
   *         in: formData
   *         required: true
   *         type: string
   *       - name: name
   *         description: Name
   *         in: formData
   *         required: false
   *         type: string
   *       - name: webhook_url
   *         description: Webhook URL
   *         in: formData
   *         required: false
   *         type: string
   *       - name: webhook_secret
   *         description: Webhook secret
   *         in: formData
   *         required: false
   *         type: string
   *       - name: type
   *         description: Directory provider. (Supported values are azure-scim-v2, onelogin-scim-v2, okta-scim-v2, jumpcloud-scim-v2, generic-scim-v2, google)
   *         in: formData
   *         required: false
   *         type: string
   *     tags: [Directory Sync]
   *     produces:
   *      - application/json
   *     consumes:
   *      - application/x-www-form-urlencoded
   *      - application/json
   *     responses:
   *      200:
   *        description: Success
   *        schema:
   *          $ref:  '#/definitions/Directory'
   */
  public async create(params: {
    name?: string;
    tenant: string;
    product: string;
    webhook_url?: string;
    webhook_secret?: string;
    type?: DirectoryType;
    google_domain?: string;
    google_access_token?: string;
    google_refresh_token?: string;
  }): Promise<Response<Directory>> {
    metrics.increment('createDsyncConnection');

    try {
      const {
        name,
        tenant,
        product,
        webhook_url,
        webhook_secret,
        type = 'generic-scim-v2',
        google_domain,
        google_access_token,
        google_refresh_token,
      } = params;

      if (!tenant || !product) {
        throw new JacksonError('Missing required parameters.', 400);
      }

      // Validate the directory type
      if (!Object.keys(getDirectorySyncProviders()).includes(type)) {
        throw new JacksonError('Invalid directory type.', 400);
      }

      validateTenantAndProduct(tenant, product);

      const directoryName = name || `scim-${tenant}-${product}`;
      const id = randomUUID();
      const hasWebhook = webhook_url && webhook_secret;
      const isSCIMProvider = isSCIMEnabledProvider(type);

      let directory: Directory = {
        id,
        name: directoryName,
        tenant,
        product,
        type,
        log_webhook_events: false,
        webhook: {
          endpoint: hasWebhook ? webhook_url : '',
          secret: hasWebhook ? webhook_secret : '',
        },
        scim: isSCIMProvider
          ? {
              path: `${this.opts.scimPath}/${id}`,
              secret: await createRandomSecret(16),
            }
          : {
              path: '',
              secret: '',
            },
      };

      if (type === 'google') {
        directory = {
          ...directory,
          google_domain: google_domain || '',
          google_access_token: google_access_token || '',
          google_refresh_token: google_refresh_token || '',
        };
      }

      const indexes: Index[] = [
        {
          name: IndexNames.TenantProduct,
          value: dbutils.keyFromParts(tenant, product),
        },
        {
          name: IndexNames.Product,
          value: product,
        },
      ];

      // Add secondary index for Non-SCIM providers
      if (!isSCIMProvider) {
        indexes.push({
          name: storeNamespacePrefix.dsync.providers,
          value: type,
        });
      }

      await this.store().put(id, directory, ...indexes);

      const connection = this.transform(directory);

      await this.eventController.notify('dsync.created', connection);

      return { data: connection, error: null };
    } catch (err: any) {
      return apiError(err);
    }
  }

  /**
   * @swagger
   * /api/v1/dsync/{directoryId}:
   *   get:
   *     summary: Get a directory connection by id
   *     parameters:
   *       - name: directoryId
   *         description: Directory ID
   *         in: path
   *         required: true
   *         type: string
   *     tags:
   *       - Directory Sync
   *     produces:
   *       - application/json
   *     responses:
   *       '200':
   *         description: Success
   *         schema:
   *           $ref: '#/definitions/Directory'
   */
  public async get(id: string): Promise<Response<Directory>> {
    metrics.increment('getDsyncConnections');

    try {
      if (!id) {
        throw new JacksonError('Missing required parameters.', 400);
      }

      const directory: Directory = await this.store().get(id);

      if (!directory) {
        throw new JacksonError('Directory configuration not found.', 404);
      }

      return { data: this.transform(directory), error: null };
    } catch (err: any) {
      return apiError(err);
    }
  }

  /**
   * @swagger
   * /api/v1/dsync/{directoryId}:
   *   patch:
   *     summary: Update a directory connection
   *     parameters:
   *       - name: directoryId
   *         description: Directory ID
   *         in: path
   *         required: true
   *         type: string
   *       - name: name
   *         description: Name
   *         in: formData
   *         required: false
   *         type: string
   *       - name: webhook_url
   *         description: Webhook URL
   *         in: formData
   *         required: false
   *         type: string
   *       - name: webhook_secret
   *         description: Webhook secret
   *         in: formData
   *         required: false
   *         type: string
   *       - name: log_webhook_events
   *         description: If true, webhook requests will be logged
   *         in: formData
   *         required: false
   *         type: string
   *       - name: deactivated
   *         description: If true, the directory connection will be deactivated
   *         in: formData
   *         required: false
   *         type: string
   *       - name: google_domain
   *         description: Google domain
   *         in: formData
   *         required: false
   *         type: string
   *       - name: google_access_token
   *         description: Google access token
   *         in: formData
   *         required: false
   *         type: string
   *       - name: google_refresh_token
   *         description: Google refresh token
   *         in: formData
   *         required: false
   *         type: string
   *     tags: [Directory Sync]
   *     produces:
   *      - application/json
   *     consumes:
   *      - application/x-www-form-urlencoded
   *      - application/json
   *     responses:
   *      200:
   *        description: Success
   *        schema:
   *          $ref:  '#/definitions/Directory'
   */
  public async update(
    id: string,
    param: Omit<Partial<Directory>, 'id' | 'tenant' | 'prodct' | 'scim' | 'type'> & {
      webhook_url?: string;
      webhook_secret?: string;
    }
  ): Promise<Response<Directory>> {
    try {
      if (!id) {
        throw new JacksonError('Missing required parameters.', 400);
      }

      const directory: Directory = await this.store().get(id);
      const toUpdate = {
        ...directory,
      };

      const propertiesToUpdate = [
        'name',
        'log_webhook_events',
        'webhook',
        'deactivated',
        'google_domain',
        'google_access_token',
        'google_refresh_token',
      ];

      for (const property of propertiesToUpdate) {
        if (property in param) {
          toUpdate[property] = param[property];
        }
      }

      if ('webhook_url' in param) {
        toUpdate['webhook']['endpoint'] = param.webhook_url || '';
      }

      if ('webhook_secret' in param) {
        toUpdate['webhook']['secret'] = param.webhook_secret || '';
      }

      await this.store().put(id, toUpdate);

      const updatedDirectory = this.transform(toUpdate);

      if ('deactivated' in param) {
        if (isConnectionActive(updatedDirectory)) {
          await this.eventController.notify('dsync.activated', updatedDirectory);
        } else {
          await this.eventController.notify('dsync.deactivated', updatedDirectory);
        }
      }

      return { data: updatedDirectory, error: null };
    } catch (err: any) {
      return apiError(err);
    }
  }

  /**
   * @swagger
   * /api/v1/dsync:
   *   get:
   *     summary: Get a directory connection by tenant and product
   *     parameters:
   *       - $ref: '#/parameters/tenant'
   *       - $ref: '#/parameters/product'
   *     tags: [Directory Sync]
   *     produces:
   *      - application/json
   *     consumes:
   *      - application/x-www-form-urlencoded
   *      - application/json
   *     responses:
   *      200:
   *        description: Success
   *        schema:
   *          type: array
   *          items:
   *            $ref:  '#/definitions/Directory'
   */
  public async getByTenantAndProduct(tenant: string, product: string): Promise<Response<Directory[]>> {
    metrics.increment('getDsyncConnections');

    try {
      if (!tenant || !product) {
        throw new JacksonError('Missing required parameters.', 400);
      }

      const { data: directories } = await this.store().getByIndex({
        name: IndexNames.TenantProduct,
        value: dbutils.keyFromParts(tenant, product),
      });

      const transformedDirectories = directories.map((directory) => this.transform(directory));

      return { data: transformedDirectories, error: null };
    } catch (err: any) {
      return apiError(err);
    }
  }

  // Get directory connections with pagination
  public async getAll(
    params: PaginationParams = {}
  ): Promise<Response<Directory[]> & { pageToken?: string }> {
    metrics.increment('getDsyncConnections');

    const { pageOffset, pageLimit, pageToken } = params;

    try {
      const { data: directories, pageToken: nextPageToken } = await this.store().getAll(
        pageOffset,
        pageLimit,
        pageToken
      );

      const transformedDirectories = directories
        ? directories.map((directory) => this.transform(directory))
        : [];

      return {
        data: transformedDirectories,
        pageToken: nextPageToken,
        error: null,
      };
    } catch (err: any) {
      return apiError(err);
    }
  }

  /**
   * @swagger
   * /api/v1/dsync/{directoryId}:
   *   delete:
   *     summary: Delete a directory connection by id
   *     parameters:
   *       - name: directoryId
   *         description: Directory ID
   *         in: path
   *         required: true
   *         type: string
   *     tags:
   *       - Directory Sync
   *     produces:
   *       - application/json
   *     responses:
   *       '200':
   *         description: Success
   */
  public async delete(id: string): Promise<Response<null>> {
    metrics.increment('deleteDsyncConnections');

    try {
      if (!id) {
        throw new JacksonError('Missing required parameter.', 400);
      }

      const { data: directory } = await this.get(id);

      if (!directory) {
        throw new JacksonError('Directory configuration not found.', 404);
      }

      const { tenant, product } = directory;

      // Delete the configuration
      await this.store().delete(id);

      // Delete the groups
      await this.groups.setTenantAndProduct(tenant, product).deleteAll(id);

      // Delete the users
      await this.users.setTenantAndProduct(tenant, product).deleteAll(id);

      // Delete the webhook events
      await this.logger.setTenantAndProduct(tenant, product).deleteAll(id);

      await this.eventController.notify('dsync.deleted', directory);

      return { data: null, error: null };
    } catch (err: any) {
      return apiError(err);
    }
  }

  private transform(directory: Directory): Directory {
    if (directory.scim.path) {
      // Add the flag to ensure SCIM compliance when using Azure AD
      if (directory.type === 'azure-scim-v2') {
        directory.scim.path = `${directory.scim.path}/?aadOptscim062020`;
      }

      // Construct the SCIM endpoint
      directory.scim.endpoint = `${this.opts.externalUrl}${directory.scim.path}`;
    }

    if (!('deactivated' in directory)) {
      directory.deactivated = false;
    }

    return directory;
  }

  /**
   * @swagger
   * /api/v1/dsync/product:
   *   get:
   *     summary: Get directory connections by product
   *     parameters:
   *      - $ref: '#/parameters/product'
   *     tags:
   *       - Directory Sync
   *     produces:
   *       - application/json
   *     responses:
   *       '200':
   *         description: Success
   *         schema:
   *           type: array
   *           items:
   *             $ref:  '#/definitions/Directory'
   */
  public async filterBy(
    params: FilterByParams = {}
  ): Promise<Response<Directory[]> & { pageToken?: string }> {
    metrics.increment('getDsyncConnections');

    const { product, provider, pageOffset, pageLimit, pageToken } = params;
    let index: Index | null = null;

    if (product) {
      // Filter by product
      index = {
        name: IndexNames.Product,
        value: product,
      };
    } else if (provider) {
      // Filter by provider
      index = {
        name: storeNamespacePrefix.dsync.providers,
        value: provider,
      };
    }

    try {
      if (!index) {
        throw new JacksonError('Please provider a product or provider.', 400);
      }

      const { data: directories, pageToken: nextPageToken } = await this.store().getByIndex(
        index,
        pageOffset,
        pageLimit,
        pageToken
      );

      return {
        data: directories.map((directory) => this.transform(directory)),
        pageToken: nextPageToken,
        error: null,
      };
    } catch (err: any) {
      return apiError(err);
    }
  }
}
