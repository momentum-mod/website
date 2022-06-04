import { PagedResponseDto } from '../dto/common/api-response.dto';

export const DtoUtils = {
    Factory<Type>(t: { new (): Type }, input: Record<string, unknown>): Type {
        if (!input) return;

        const dto: Type = new t();

        for (const key in input) {
            if (key && key in dto) {
                dto[key] = input[key];
            }
        }

        return dto;
    },

    MapPaginatedResponse<Type>(c: { new (): Type }, [data, count]): PagedResponseDto<Type[]> {
        const dtos = data.map((x) => this.Factory(c, x));

        return {
            totalCount: count,
            returnCount: dtos.length,
            response: dtos
        };
    }
};
