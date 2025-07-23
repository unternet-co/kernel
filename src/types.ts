export { type LanguageModel } from 'ai';

export type JSONValue =
  | string
  | number
  | boolean
  | Record<string, never>
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface JSONSchemaDefinition {
  type:
    | 'object'
    | 'string'
    | 'number'
    | 'integer'
    | 'array'
    | 'boolean'
    | 'null';
  description?: string;
  properties?: {
    [key: string]: JSONSchemaDefinition;
  };
  required?: string[];
  additionalProperties?: boolean;
}
