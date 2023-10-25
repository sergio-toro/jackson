import type { IDirectoryConfig, JacksonOption } from '../../../typings';
import { GoogleProvider } from './api';
import { GoogleAuth } from './oauth';

interface NewGoogleProviderParams {
  directories: IDirectoryConfig;
  opts: JacksonOption;
}

export const newGoogleProvider = (params: NewGoogleProviderParams) => {
  const { directories, opts } = params;

  return {
    directory: new GoogleProvider({ opts, directories }),
    oauth: new GoogleAuth({ opts, directories }),
  };
};
