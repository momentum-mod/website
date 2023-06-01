// Only types work here, not interfaces.
// https://github.com/microsoft/TypeScript/issues/15300#issuecomment-332366024

export type QueryParam = {
  [param: string]:
    | string
    | number
    | boolean
    | ReadonlyArray<string | number | boolean>;
};

export type QueryParamOptional = {
  [param: string]:
    | string
    | number
    | boolean
    | ReadonlyArray<string | number | boolean>
    | undefined;
};
