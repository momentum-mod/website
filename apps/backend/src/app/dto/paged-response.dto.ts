import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsArray, IsInt } from 'class-validator';
import { PagedResponse } from '@momentum/constants';
import { DtoFactory } from './functions';
import { NotificationDto } from './notification/notification.dto';

export const ApiOkPagedResponse = <TModel extends Type>(
  model: TModel,
  schema?: SchemaObject
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        ...schema,
        title: `PagedResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(PagedResponseDto) },
          {
            properties: {
              response: {
                type: 'array',
                items: { $ref: getSchemaPath(model) }
              }
            }
          }
        ]
      }
    })
  );
};

export class PagedResponseDto<T> implements PagedResponse<T> {
  @ApiProperty({
    type: Number,
    description: 'The total number of results found'
  })
  @IsInt()
  readonly totalCount: number;

  @ApiProperty({
    type: Number,
    description: 'The number of results in the response'
  })
  @IsInt()
  readonly returnCount: number;

  @ApiProperty({
    isArray: true,
    description: 'Array of the response type found'
  })
  @IsArray()
  readonly data: T[];

  constructor(c: { new (): T }, [data, totalCount]: [any[], number]) {
    const dtos = data.map((x) => DtoFactory(c, x));

    this.totalCount = totalCount;
    this.returnCount = dtos.length;
    this.data = dtos;
  }
}

// Can't "implements" as it causes collision with DTO type.
export class PagedNotificationResponseDto extends PagedResponseDto<NotificationDto> {
  @ApiProperty({
    type: Number,
    description: 'The number of unread notifications'
  })
  @IsInt()
  readonly totalUnreadCount: number;

  constructor(
    c: { new (): NotificationDto },
    [data, totalCount, totalUnreadCount]: [any[], number, number]
  ) {
    super(c, [data, totalCount]);
    this.totalUnreadCount = totalUnreadCount;
  }
}
