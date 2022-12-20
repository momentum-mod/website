import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line unused-imports/no-unused-vars
        interface Matchers<R> {
            toBeValidDto: (type: any) => CustomMatcherResult;
            toBeValidPagedDto: (type: any) => CustomMatcherResult;
        }
    }
}

const formatValidationErrors = (errors: ValidationError[], depth = 1): string =>
    errors
        .map((error) => {
            const newLine = '\n' + '\t'.repeat(depth);
            let errorString =
                newLine + 'Property: ' + error.property + newLine + 'Value: ' + JSON.stringify(error.value);
            if (error.constraints)
                errorString +=
                    newLine +
                    'Constraints: ' +
                    Object.entries(error.constraints ?? {})
                        .map(([conName, conMessage]) => `${conName}: ${conMessage}`)
                        .join(newLine + '  ');
            if (error.children?.length > 0)
                errorString += newLine + 'Children:' + formatValidationErrors(error.children, depth + 1);

            return errorString;
        })
        .join('\n');

expect.extend({
    toBeValidDto(received, type) {
        // Use class-transformer to create an instance of the DTO type with the passed in data
        const instance = plainToInstance(type, received);

        // This instance has all the validators attached, so this lets us validate all the *outgoing* DTOs in tests.
        const errors = validateSync(instance, { forbidNonWhitelisted: true });

        const pass = errors.length === 0;

        if (pass) {
            return {
                message: () => `expected DTO data not to validate the ${type.name} DTO`,
                pass: true
            };
        } else {
            const plural = errors.length > 1;
            return {
                message: () =>
                    `expected DTO data ${JSON.stringify(received)} to validate ${type.name}. It threw th${
                        plural ? 'ese' : 'is'
                    } error${plural ? 's' : ''}` + formatValidationErrors(errors),
                pass: false
            };
        }
    },

    toBeValidPagedDto(received, type) {
        if (!received || !received.hasOwnProperty('response') || !Array.isArray(received.response)) {
            return {
                message: () => `expected paged DTO with response array, data was invalid`,
                pass: false
            };
        }

        if (received.response.length === 0) {
            return {
                message: () => `expected paged DTO with populated response array, array was empty`,
                pass: false
            };
        }

        const totalErrors: [any, ValidationError[]][] = [];

        for (const item of received.response) {
            const instance = plainToInstance(type, item);

            const errors = validateSync(instance, {
                forbidNonWhitelisted: true
            });

            if (errors.length > 0) {
                totalErrors.push([item, errors]);
            }
        }

        const pass = totalErrors.length === 0;

        if (pass) {
            return {
                message: () => `expected at least one paged DTO data not to validate the ${type.name} DTO`,
                pass: true
            };
        } else {
            const plural = totalErrors.length > 1;
            return {
                message: () =>
                    `expected paged DTO to contain valid DTOs of type ${type.name}. Th${plural ? 'ese' : 'is'} item${
                        plural ? 's' : ''
                    } errored:\n\t` +
                    totalErrors
                        .map(
                            (error) => `${JSON.stringify(error[0])}\nerrored with: ${formatValidationErrors(error[1])}`
                        )
                        .join('\n\n'),
                pass: false
            };
        }
    }
});
