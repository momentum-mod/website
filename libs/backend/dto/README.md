# backend-dto

DTOs used by the backend, plus utility functions and types for manipulating them.

Typescript's `strict` is disabled in this package, as we use a
class-validator-based pattern where classes are declared with properties not
set in constructors or initializers - they are set by class-transformer's
`plainToInstance` when they are instantiated.

The layers of Prisma > Models > Validators/Transformers is quite ugly, and class-validator is slow,
so this will likely be significantly refactored in the future.

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
