# constants

A collection of enumerations and other constants used throughout the repo.

Some enums are suffixed with "Type" to avoid confusion with DB models and DTOs.

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
