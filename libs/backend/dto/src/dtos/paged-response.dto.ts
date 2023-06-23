import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { IsArray, IsInt } from 'class-validator';
import { DtoFactory } from '../functions';

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

export class PagedResponseDto<T> {
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

  constructor(c: { new (): T }, [data, count]: [any[], number]) {
    const dtos = data.map((x) => DtoFactory(c, x));

    this.totalCount = count;
    this.returnCount = dtos.length;
    this.data = dtos;
  }
}
