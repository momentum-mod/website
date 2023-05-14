# types

A library for type definitions used throughout the repo - in particular for
models of the backend's DTOs.

Typically our rule for types vs. interfaces is to use interfaces whenever
either is sufficient (great design, thanks Microsoft). In some cases (like HTTP
queries) we use types due to more permissive inference around index signatures:
https://github.com/microsoft/TypeScript/issues/15300

The overall structure for this and related libraries works like this:

- `@momentum/types`: _Only_ type definitions such as type aliases and
  interfaces. Essentially, only stuff compiled out during Typescript
  compilation.
- `@momentum/backend/dto`: DTO layer of the backend containing Typescript
  _classes_ which implement the models in `@momentum/types` and perform
  runtime transformation and validation.
- `@momentum/constants`: Similar to `@momentum/types` in that it contain
  no significant logic, but rather contains literal values, rather than
  types.
