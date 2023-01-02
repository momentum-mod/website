import { Transform } from 'class-transformer';

const optionalBooleanMapper = new Map([
    ['undefined', undefined],
    ['true', true],
    ['false', false]
]);

export const BooleanFixer = () => Transform(({ value }) => optionalBooleanMapper.get(value));
