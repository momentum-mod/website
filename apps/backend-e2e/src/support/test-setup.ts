import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
process.env['NODE_ENV'] = 'test';
faker.seed(1);
