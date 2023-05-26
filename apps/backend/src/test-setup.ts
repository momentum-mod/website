import { toBeValidDto, toBeValidPagedDto } from '@momentum/backend/test-utils';

expect.extend({ toBeValidDto, toBeValidPagedDto });

BigInt.prototype['toJSON'] = function () {
  return this.toString();
};
