import { Environment } from './config.interface';
import {
    IsDefined,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Length,
    MinLength,
    validateSync
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsOptionalWithEmptyString } from '@common/validators/is-optional-with-empty-string.validator';

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(ConfigValidation, config, { enableImplicitConversion: true });

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) throw new Error(errors.toString());

    return validatedConfig;
}

export class ConfigValidation {
    @IsEnum(Environment, {
        message: 'A valid (dev, prod, test) NODE_ENV environment variable must be set'
    })
    @IsDefined()
    NODE_ENV: Environment;

    @IsDefined()
    @IsInt()
    NODE_PORT: number;

    @IsOptional()
    @IsUrl({ require_tld: false })
    URL: string;

    @IsString({
        message:
            'A Steam API key is required to run this application, can be acquired from https://steamcommunity.com/dev/apikey. See README.md for more information.'
    })
    STEAM_WEB_API_KEY: string;

    @IsString()
    @MinLength(20)
    JWT_SECRET: string;

    @IsUrl()
    @IsOptionalWithEmptyString()
    SENTRY_DSN: string;

    @IsString()
    POSTGRES_USER: string;

    @IsString()
    POSTGRES_PASSWORD: string;

    @IsString()
    POSTGRES_DB: string;

    @IsString()
    STORAGE_REGION: string;

    @IsUrl({ require_tld: false })
    STORAGE_ENDPOINT_URL: string;

    @IsString()
    STORAGE_BUCKET_NAME: string;

    @IsString()
    STORAGE_ACCESS_KEY_ID: string;

    @IsString()
    STORAGE_SECRET_ACCESS_KEY: string;

    @IsString()
    @Length(32, 32)
    SESSION_SECRET: string;
}
