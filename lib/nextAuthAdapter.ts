import { Storable } from '@boxyhq/saml-jackson';
import type { AdapterUser, VerificationToken } from 'next-auth/adapters';
import DB from 'npm/src/db/db';
import defaultDb from 'npm/src/db/defaultDb';
import { jacksonOptions } from './env';

const g = global as any;

export async function initNextAuthDB(): Promise<Storable> {
  if (!g.adminAuthStore) {
    const _opts = defaultDb(jacksonOptions);
    const db = await DB.new(_opts.db);
    g.adminAuthStore = db.store('admin:auth');
  }
  return g.adminAuthStore as Storable;
}

/** @return { import("next-auth/adapters").Adapter } */
export default function Adapter() {
  const store = (async () => await initNextAuthDB())();
  return {
    async createUser(user) {
      return user;
    },
    async getUser() {
      return;
    },
    async getUserByEmail(email) {
      return email
        ? ({
            id: email,
            name: email.split('@')[0],
            email,
            role: 'admin',
            emailVerified: new Date(),
          } as AdapterUser)
        : null;
    },
    async getUserByAccount() {
      return;
    },
    async updateUser(user: AdapterUser) {
      if (!user.id) {
        return null;
      }
      const email = user.id;
      return {
        id: email,
        name: email.split('@')[0],
        email,
        role: 'admin',
        emailVerified: new Date(),
      } as AdapterUser;
    },
    // will be required in a future release, but are not yet invoked
    async deleteUser() {
      return;
    },
    async linkAccount() {
      return;
    },
    // will be required in a future release, but are not yet invoked
    async unlinkAccount() {
      return;
    },
    async createSession() {
      return;
    },
    async getSessionAndUser() {
      return;
    },
    async updateSession() {
      return;
    },
    async deleteSession() {
      return;
    },
    async createVerificationToken(data: VerificationToken) {
      await (await store).put(data.identifier, data);
    },
    async useVerificationToken({ identifier, token }) {
      const tokenInStore = await (await store).get(identifier);
      if (tokenInStore.token === token) {
        await (await store).delete(identifier);
      }
      return tokenInStore ?? null;
    },
  };
}
