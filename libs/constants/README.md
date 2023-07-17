# constants

A collection of types, enums and various constants used throughout the monorepo.
These are tend to reference one-another so need to live together to avoid
circularity. It's split up as followed:

- types:
  - models: Types for data emitted by the backend (@momentum/backend/dto
    contains class-validator-based implementations of these). Typically derived
    from Prisma types, but with any modifications made with backend service
    logic/transformers.
  - queries: Types for valid queries accepted by the backend.
  - utils: Utility types and some type aliases. We tend to use
    [type-fest](https://github.com/sindresorhus/type-fest) for utility types
    whenever possible
  - _Note_: As a general policy, we use interfaces over types when possible. But
    whenever a type is needed/just more convenient types are completely fine.
- consts: Actual constant _values_, that we want to separate out from specific
  TS files, but don't want to be configurable without Git commits.
- enums: Enums. Some are suffixed with "Type" to avoid confusion with DB models
  and DTOs.
- maps: Readonly `Map`s and `Object`s.
- Some enums are suffixed with "Type" to avoid confusion with DB models and
  DTOs.
