import { JsonObject, JsonValue } from 'type-fest';

/**
 * Obviously DTOs have to be jsonifiable but this is needed for DTOs
 * implementing models with JsonValue index signatures.
 */
export class JsonifiableDto implements JsonObject {
  [k: string]: JsonValue;
}
