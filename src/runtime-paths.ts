import { register } from 'tsconfig-paths';

register({
  baseUrl: __dirname,
  paths: {
    '@modules/*': ['modules/*'],
    '@shared/*': ['shared/*'],
    '@infra/*': ['infrastructure/*'],
    '@config/*': ['config/*'],
  },
});
