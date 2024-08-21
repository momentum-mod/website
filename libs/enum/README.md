# enum

Utility functions for working with TypeScript enums.

# TL;DR

Enums suck. If you want to iterate over an enum, use fastValuesNumeric or
fastValuesString.

# Long explanation

TypeScript enums at runtime are _basically_ objects, however _numeric_ enums
have a weird reverse mapping behaviour. This enum produces TypeScript code
that's functionally equivalent to the object below it:

```ts
enum TSEnum {
  Bar = 1,
  Baz = 2
}

const JSObject = {
  '1': 'Bar',
  '2': 'Baz',
  Bar: 1,
  Baz: 2
};
```

Note that the keys on JSObject have been stringified, as per all JS objects.

For string enums they're effectively just objects, e.g.

```ts
enum TSEnum {
  Foo = 'foo',
  Bar = 'bar'
}

const JSObject = {
  Foo: 'foo',
  Bar: 'bar'
};
```

For enums containing both strings and numbers, the numbers are reverse mapped,
strings are not. Horrible!

This property makes iterating over enums at runtime very annoying. Enums are
sometimes twice the size you expect, and iterating using
Object.keys/values/entries will contain undesired cases.

This library provides methods akin to Object.length, Object.keys, Object.values
and Object.entries for enums. Whilst you _can_ use Object.keys etc. for string
enums, I'd recommend using these functions explicitly.

The fast variants of the functions here are safe to use, but note that they rely
on the exact structure of the object the TypeScript compiler produces, and that
V8 preserves the order of properties on an Object (afaik not required by
ECMAScript spec). There's a small chance in the future that upgrading the
`typescript` dependency or using a different TypeScript compiler would break
these functions.

Partially based on https://github.com/UselessPickles/ts-enum-util; I didn't want
it as a dependency.
