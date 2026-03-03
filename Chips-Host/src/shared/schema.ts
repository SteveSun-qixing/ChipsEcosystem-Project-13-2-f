import { createError } from './errors';

export type SchemaValidator = (input: unknown) => { valid: boolean; errors?: string[] };

class SchemaRegistry {
  private readonly validators = new Map<string, SchemaValidator>();

  public register(schemaId: string, validator: SchemaValidator): void {
    this.validators.set(schemaId, validator);
  }

  public validate(schemaId: string, input: unknown): void {
    const validator = this.validators.get(schemaId);
    if (!validator) {
      return;
    }

    const result = validator(input);
    if (!result.valid) {
      throw createError('SCHEMA_VALIDATION_FAILED', `Schema validation failed: ${schemaId}`, result.errors, false);
    }
  }
}

export const schemaRegistry = new SchemaRegistry();

export const objectWithKeys = (keys: string[]): SchemaValidator => {
  return (input: unknown) => {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be an object'] };
    }

    const record = input as Record<string, unknown>;
    const missing = keys.filter((key) => !(key in record));

    if (missing.length > 0) {
      return { valid: false, errors: missing.map((key) => `Missing key: ${key}`) };
    }

    return { valid: true };
  };
};
