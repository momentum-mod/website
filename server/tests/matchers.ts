import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

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
        .map((err) => {
            const newLine = '\n' + '\t'.repeat(depth);
            let str = newLine + 'Property: ' + err.property + newLine + 'Value: ' + JSON.stringify(err.value);
            if (err.constraints)
                str +=
                    newLine +
                    'Constraints: ' +
                    Object.entries(err.constraints ?? {})
                        .map(([conName, conMessage]) => `${conName}: ${conMessage}`)
                        .join(newLine + '  ');
            if (err.children?.length > 0)
                str += newLine + 'Children:' + formatValidationErrors(err.children, depth + 1);

            return str;
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
                        .map((err) => `${JSON.stringify(err[0])}\nerrored with: ${formatValidationErrors(err[1])}`)
                        .join('\n\n'),
                pass: false
            };
        }
    }
});
