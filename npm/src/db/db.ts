import {
  DatabaseDriver,
  DatabaseOption,
  Encrypted,
  EncryptionKey,
  Index,
  Records,
  SortOrder,
  Storable,
} from '../typings';
import dynamodb from './dynamoDb';
import * as encrypter from './encrypter';
import mem from './mem';
import mongo from './mongo';
import { JacksonIndex as JacksonIndexPlanetscale } from './planetscale/entity/JacksonIndex';
import { JacksonStore as JacksonStorePlanetscale } from './planetscale/entity/JacksonStore';
import { JacksonTTL as JacksonTTLPlanetscale } from './planetscale/entity/JacksonTTL';
import redis from './redis';
import { JacksonIndex } from './sql/entity/JacksonIndex';
import { JacksonStore } from './sql/entity/JacksonStore';
import { JacksonTTL } from './sql/entity/JacksonTTL';
import { JacksonIndex as JacksonIndexMariaDB } from './sql/mariadb/entity/JacksonIndex';
import { JacksonStore as JacksonStoreMariaDB } from './sql/mariadb/entity/JacksonStore';
import { JacksonTTL as JacksonTTLMariaDB } from './sql/mariadb/entity/JacksonTTL';
import { JacksonIndex as JacksonIndexMSSQL } from './sql/mssql/entity/JacksonIndex';
import { JacksonStore as JacksonStoreMSSQL } from './sql/mssql/entity/JacksonStore';
import { JacksonTTL as JacksonTTLMSSQL } from './sql/mssql/entity/JacksonTTL';
import sql from './sql/sql';
import store from './store';

const decrypt = (res: Encrypted, encryptionKey: EncryptionKey): unknown => {
  if (res.iv && res.tag) {
    return JSON.parse(encrypter.decrypt(res.value, res.iv, res.tag, encryptionKey));
  }

  return JSON.parse(res.value);
};

class DB implements DatabaseDriver {
  private db: DatabaseDriver;
  private encryptionKey: EncryptionKey;
  constructor(db: DatabaseDriver, encryptionKey: EncryptionKey) {
    this.db = db;
    this.encryptionKey = encryptionKey;
  }

  async get(namespace: string, key: string): Promise<unknown> {
    const res = await this.db.get(namespace, key);

    if (!res) {
      return null;
    }

    return decrypt(res, this.encryptionKey);
  }

  async getAll(
    namespace: string,
    pageOffset?: number,
    pageLimit?: number,
    pageToken?: string,
    sortOrder?: SortOrder
  ): Promise<Records> {
    const res = await this.db.getAll(namespace, pageOffset, pageLimit, pageToken, sortOrder);
    const encryptionKey = this.encryptionKey;
    return {
      data: res.data.map((r) => {
        return decrypt(r, encryptionKey);
      }),
      pageToken: res.pageToken,
    };
  }

  async getByIndex(
    namespace: string,
    idx: Index,
    pageOffset?: number,
    pageLimit?: number,
    pageToken?: string
  ): Promise<Records> {
    const res = await this.db.getByIndex(namespace, idx, pageOffset, pageLimit, pageToken);
    const encryptionKey = this.encryptionKey;
    return {
      data: res.data.map((r) => {
        return decrypt(r, encryptionKey);
      }),
      pageToken: res.pageToken,
    };
  }

  // ttl is in seconds
  async put(namespace: string, key: string, val: unknown, ttl = 0, ...indexes: Index[]): Promise<unknown> {
    if (ttl > 0 && indexes && indexes.length > 0) {
      throw new Error('secondary indexes not allowed on a store with ttl');
    }

    const dbVal = this.encryptionKey
      ? encrypter.encrypt(JSON.stringify(val), this.encryptionKey)
      : { value: JSON.stringify(val) };

    return await this.db.put(namespace, key, dbVal, ttl, ...indexes);
  }

  async delete(namespace: string, key: string): Promise<unknown> {
    return await this.db.delete(namespace, key);
  }

  async deleteMany(namespace: string, keys: string[]): Promise<void> {
    return await this.db.deleteMany(namespace, keys);
  }

  store(namespace: string, ttl = 0): Storable {
    return store.new(namespace, this, ttl);
  }
}

export default {
  new: async (options: DatabaseOption) => {
    const encryptionKey = options.encryptionKey ? Buffer.from(options.encryptionKey, 'latin1') : null;

    switch (options.engine) {
      case 'redis':
        return new DB(await redis.new(options), encryptionKey);
      case 'sql':
        switch (options.type) {
          case 'mssql':
            return new DB(
              await sql.new(options, {
                JacksonStore: JacksonStoreMSSQL,
                JacksonIndex: JacksonIndexMSSQL,
                JacksonTTL: JacksonTTLMSSQL,
              }),
              encryptionKey
            );
          case 'mariadb':
          case 'mysql':
            return new DB(
              await sql.new(options, {
                JacksonStore: JacksonStoreMariaDB,
                JacksonIndex: JacksonIndexMariaDB,
                JacksonTTL: JacksonTTLMariaDB,
              }),
              encryptionKey
            );
          default:
            return new DB(
              await sql.new(options, {
                JacksonStore,
                JacksonIndex,
                JacksonTTL,
              }),
              encryptionKey
            );
        }
      case 'planetscale':
        return new DB(
          await sql.new(options, {
            JacksonStore: JacksonStorePlanetscale,
            JacksonIndex: JacksonIndexPlanetscale,
            JacksonTTL: JacksonTTLPlanetscale,
          }),
          encryptionKey
        );
      case 'mongo':
        return new DB(await mongo.new(options), encryptionKey);
      case 'mem':
        return new DB(await mem.new(options), encryptionKey);
      case 'dynamodb':
        return new DB(await dynamodb.new(options), encryptionKey);
      default:
        throw new Error('unsupported db engine: ' + options.engine);
    }
  },
};
