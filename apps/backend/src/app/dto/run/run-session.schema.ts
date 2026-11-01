import { type } from 'arktype';

const DateToString = type('Date | string.date.iso').pipe((value) =>
  value instanceof Date ? value.toISOString() : value
);

export const RunSessionSerializerSchema = type({
  'error?': 'never',
  id: 'number.integer',
  userID: 'number.integer',
  mapID: 'number.integer',
  gamemode: 'number.integer',
  trackType: 'number.integer',
  trackNum: 'number.integer',
  createdAt: DateToString,
  timestamps: type({
    majorNum: 'number.integer',
    minorNum: 'number.integer',
    time: 'number',
    createdAt: DateToString,
    '+': 'delete'
  }).array(),
  '+': 'delete'
});

export const RunSessionWsResponseSchema = type({
  event: 'string',
  data: RunSessionSerializerSchema.or(type({ error: 'string', '+': 'delete' })),
  '+': 'delete'
});
