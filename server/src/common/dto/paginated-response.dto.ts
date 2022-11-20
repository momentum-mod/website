import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { DtoFactory } from '@lib/dto.lib';

export const ApiOkPaginatedResponse = <TModel extends Type>(model: TModel, schema?: SchemaObject) => {
    return applyDecorators(
        ApiOkResponse({
            schema: {
                ...schema,
                title: `PaginatedResponseOf${model.name}`,
                allOf: [
                    { $ref: getSchemaPath(PaginatedResponseDto) },
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

export class PaginatedResponseDto<T> {
    @ApiProperty({
        type: Number,
        description: 'The total number of results found'
    })
    totalCount: number;

    @ApiProperty({
        type: Number,
        description: 'The number of results in the response'
    })
    returnCount: number;

    @ApiProperty({
        isArray: true,
        description: 'Array of the response type found'
    })
    response: T[];

    constructor(c: { new (): T }, [data, count]) {
        const dtos = data.map((x) => DtoFactory(c, x));

        this.totalCount = count;
        this.returnCount = dtos.length;
        this.response = dtos;
    }
}
