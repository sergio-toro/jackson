import { initializeMetrics } from '@boxyhq/metrics';
import packageInfo from '../package.json';

initializeMetrics({ name: packageInfo.name, version: packageInfo.version });
