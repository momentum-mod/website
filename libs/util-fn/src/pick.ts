export function pick<Obj extends object, Keys extends keyof Obj>(
  obj: Obj,
  keys: Keys
): Pick<Obj, Keys>;

export function pick<Obj extends object, Keys extends Array<keyof Obj>>(
  obj: Obj,
  keys: Keys
): Pick<Obj, Keys[number]>;

export function pick<
  Obj extends object,
  Keys extends keyof Obj | Array<keyof Obj>
>(
  obj: Obj,
  keys: Keys
): Pick<Obj, Keys extends Array<keyof Obj> ? Keys[number] : Keys> {
  const result: any = {};

  for (const key of Object.keys(obj) as Array<keyof Obj>) {
    if (Array.isArray(keys)) {
      if (keys.includes(key)) {
        result[key] = obj[key];
      }
    } else {
      if (keys === key) {
        result[key] = obj[key];
      }
    }
  }

  return result;
}
