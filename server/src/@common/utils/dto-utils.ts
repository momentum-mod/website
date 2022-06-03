export const DtoUtils = {
    ShapeSafeObjectAssign: (target, source) => {
        for (const key in source) {
            if (key in target) {
                target[key] = source[key];
            }
        }
    }
};
