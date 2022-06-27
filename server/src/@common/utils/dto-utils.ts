export const DtoUtils = {
    Factory<Type>(t: { new (): Type }, input: Record<string, unknown>, nullReturnsEmptyObject = false): Type {
        if (!input) {
            if (nullReturnsEmptyObject) return {} as Type;
            return;
        }

        const dto: Type = new t();

        for (const key in input) {
            if (key && key in dto && dto[key] === undefined) {
                dto[key] = input[key];
            }
        }

        return dto;
    }
};
