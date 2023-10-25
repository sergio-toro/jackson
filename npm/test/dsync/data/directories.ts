import { faker } from '@faker-js/faker';
import { Directory, DirectoryType } from '../../../src/typings';

export const getFakeDirectory = () => {
  return {
    name: faker.company.name(),
    tenant: faker.internet.domainName(),
    product: faker.commerce.productName(),
    type: 'okta-scim-v2' as DirectoryType,
    log_webhook_events: false,
  } as Directory;
};
