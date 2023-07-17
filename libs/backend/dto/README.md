# backend-dto

DTOs used by the backend, plus utility functions and types for manipulating
them.

Typescript's `strict` is disabled in this package, as we use a
class-validator-based pattern where classes are declared with properties not set
in constructors or initializers - they are set by class-transformer's
`plainToInstance` when they are instantiated.

The layers of Prisma > Models > Validators/Transformers is quite ugly, and
class-validator is slow, so this will likely be significantly refactored in the
future.
