import { AdminActivity as PrismaAdminActivity } from '@prisma/client';
import { Jsonify } from 'type-fest';

export interface AdminActivity extends PrismaAdminActivity {
  oldData: Jsonify<object>;
  newData: Jsonify<object>;
}
