# types

A library for type definitions used throughout the repo - in particular for
models provided by the backend.

The overall structure for this and related libraries works like this:
- `@momentum/types`: *Only* type definitions such as type aliases and
  interfaces. Essentially, only stuff compiled out during Typescript
  compilation.
- `@momentum/backend/dto`: DTO layer of the backend containing Typescript
  *classes* which implement the models in `@momentum/types` and perform
  runtime transformation and validation.
- `@momentum/constants`: Similar to `@momentum/types` in that it contain
  no significant logic, but rather contains literal values, rather than 
  types.
