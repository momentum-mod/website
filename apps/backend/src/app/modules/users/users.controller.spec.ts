import {
  ClassSerializerInterceptor,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
  ValidationPipe
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MapDto } from '../../dto/map/map.dto';
import { VALIDATION_PIPE_CONFIG } from '../../dto/validation-pipe-config';

describe('UsersController schema validation and serialization', () => {
  let app: NestFastifyApplication;
  const getRaw = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: { getRaw } }]
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalPipes(
      new ValidationPipe(VALIDATION_PIPE_CONFIG),
      new StandardSchemaValidationPipe()
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new StandardSchemaSerializerInterceptor(app.get(Reflector))
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('validates the query and serializes the selected user', async () => {
    getRaw.mockResolvedValue({
      id: 1,
      steamID: 76561198000000000n,
      alias: 'A user',
      avatar: 'avatar-hash',
      country: null,
      roles: 0,
      bans: 0,
      createdAt: new Date('2024-01-02T03:04:05.000Z'),
      profile: { userID: 1, bio: 'Hello', socials: null },
      secret: 'not for clients'
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/1?expand=profile'
    });
    expect(response.statusCode).toBe(200);
    expect(getRaw).toHaveBeenCalledWith(1, ['profile']);
    expect(response.json()).toEqual({
      id: 1,
      steamID: '76561198000000000',
      alias: 'A user',
      avatarURL:
        'https://avatars.cloudflare.steamstatic.com/avatar-hash_full.jpg',
      country: null,
      roles: 0,
      bans: 0,
      createdAt: '2024-01-02T03:04:05.000Z',
      profile: { userID: 1, bio: 'Hello', socials: null }
    });
  });

  it('rejects unknown query parameters before calling the service', async () => {
    getRaw.mockClear();
    const response = await app.inject({
      method: 'GET',
      url: '/users/1?unexpected=value'
    });
    expect(response.statusCode).toBe(400);
    expect(getRaw).not.toHaveBeenCalled();
  });

  it('generates the public response schema in OpenAPI', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setOpenAPIVersion('3.1.0').build(),
      {
        extraModels: [MapDto]
      }
    );
    const schema =
      doc.paths['/users/{userID}'].get.responses['200'].content[
        'application/json'
      ].schema;
    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        avatarURL: { type: 'string' },
        steamID: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      }
    });
    expect(schema).not.toHaveProperty('properties.avatar');
  });
});
