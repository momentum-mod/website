import { Environment } from './config.interface';
import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MinLength,
  validateSync
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsOptionalWithEmptyString } from '@momentum/backend/validators';

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(ConfigValidation, config, {
    enableImplicitConversion: true
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false
  });

  if (errors.length > 0) throw new Error(errors.toString());

  return validatedConfig;
}

export class ConfigValidation {
  @IsEnum(Environment, {
    message:
      'A valid (dev, prod, test) NODE_ENV environment variable must be set'
  })
  @IsDefined()
  readonly NODE_ENV?: Environment;

  @IsDefined()
  readonly NODE_PORT?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  readonly ROOT_URL?: string;

  @IsString({
    message:
      'A Steam API key is required to run this application, can be acquired from https://steamcommunity.com/dev/apikey. See README.md for more information.'
  })
  readonly STEAM_WEB_API_KEY?: string;

  @IsString()
  @MinLength(20)
  readonly JWT_SECRET?: string;

  @IsUrl()
  @IsOptionalWithEmptyString()
  readonly SENTRY_DSN?: string;

  @IsUrl({ require_tld: false, protocols: ['postgresql'] })
  readonly DATABASE_URL?: string;

  @IsString()
  readonly STORAGE_REGION?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  readonly STORAGE_ENDPOINT_URL?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  readonly STORAGE_ENDPOINT_URL_DOCKERIZED?: string;

  @IsString()
  readonly STORAGE_BUCKET_NAME?: string;

  @IsString()
  readonly STORAGE_ACCESS_KEY_ID?: string;

  @IsString()
  readonly STORAGE_SECRET_ACCESS_KEY?: string;

  @IsString()
  @Length(32, 32)
  readonly SESSION_SECRET?: string;
}
