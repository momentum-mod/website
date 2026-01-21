import { AbstractControl, ValidationErrors } from '@angular/forms';
import { MapZones } from '@momentum/constants';
import { BspHeader, BspReadError } from '@momentum/formats/bsp';
import {
  validateZoneDiff,
  validateZoneFile,
  ZoneDiffValidationError,
  ZoneValidationError
} from '@momentum/formats/zone';
import { vdf, ParseError as VdfParseError } from 'fast-vdf';

/**
 * Stronger version of ValidationErrors wherein each key has an array of
 * errors as values, each containing the file failing validation.
 */
export interface FileValidationErrors extends ValidationErrors {
  [k: string]: Array<{ file: File | unknown; [k: string]: unknown }>;
}

type FileValidatorFn = (
  control: AbstractControl
) => FileValidationErrors | null;

type AsyncFileValidatorFn = (
  control: AbstractControl
) => Promise<FileValidationErrors | null>;

export class FileValidators {
  /**
   * Check a file is actually a file - only needed if not performing any other
   * file validations.
   */
  static isFile(): FileValidatorFn {
    // Silly but `fileValidatorHandler` performs the actual check.
    return FileValidators.fileValidatorHandler(() => null);
  }

  /**
   * Check a file is below a given max size (in bytes)
   * @param maxSize - size in MB
   */
  static maxSize(maxSize: number): FileValidatorFn {
    return FileValidators.fileValidatorHandler(
      (file: File): FileValidationErrors | null =>
        file.size > maxSize
          ? {
              fileMaxSize: [
                { file, requiredSize: maxSize, actualSize: file.size }
              ]
            }
          : null
    );
  }

  /**
   * Check a file is above a given min size (in bytes)
   * @param minSize - size in MB
   */
  static minSize(minSize: number): FileValidatorFn {
    return FileValidators.fileValidatorHandler(
      (file: File): FileValidationErrors | null =>
        file.size < minSize
          ? {
              fileMaxSize: [
                { file, requiredSize: minSize, actualSize: file.size }
              ]
            }
          : null
    );
  }

  static namePattern(match: RegExp): FileValidatorFn {
    return FileValidators.fileValidatorHandler((file: File) => {
      if (!match.test(file.name)) {
        return { fileName: [{ file }] };
      }

      return null;
    });
  }

  /**
   * Check file extension matches a regex or item in array of strings.
   * @param allowed - allowed extensions
   */
  static extension(allowed: string[] | string | RegExp): FileValidatorFn {
    return FileValidators.fileValidatorHandler((file: File) => {
      const extension = FileValidators.getExtension(file.name);
      const isArray = Array.isArray(allowed);

      if (isArray && allowed.length === 0) {
        return null;
      }

      if (
        !extension ||
        !(isArray
          ? allowed.includes(extension)
          : allowed instanceof RegExp
            ? allowed.test(extension)
            : allowed === extension)
      ) {
        return {
          fileExtension: [
            {
              file,
              allowedExtensions: allowed,
              actualExtension: file.type
            }
          ]
        };
      }

      return null;
    });
  }

  static isCompressedBsp(): AsyncFileValidatorFn {
    return FileValidators.asyncFileValidatorHandler(
      async (file: File): Promise<FileValidationErrors | null> => {
        try {
          const header = await BspHeader.fromBlob(file);
          if (!header.isCompressed())
            return {
              bspFileNotCompressed: [{ file, message: 'BSP is not compressed' }]
            };
          return null;
        } catch (error) {
          return error instanceof BspReadError
            ? { bspFileReadError: [{ file, message: error.message }] }
            : { fileReadError: [{ file, message: 'Error reading file' }] };
        }
      }
    );
  }

  static isValidZones(): AsyncFileValidatorFn {
    return FileValidators.asyncFileValidatorHandler(
      async (file: File): Promise<FileValidationErrors | null> => {
        if (!file) return null;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          validateZoneFile(parsed);
          return null;
        } catch (error) {
          switch (error?.constructor) {
            case ZoneValidationError:
              return {
                zoneFileValidationError: [
                  { file, message: (error as ZoneValidationError).message }
                ]
              };
            case SyntaxError:
              return { zonFileNotJsonError: [{ file }] };
            default:
              return { fileReadError: [{ file }] };
          }
        }
      }
    );
  }

  static hasZonesChange(
    zonesGet: () => MapZones,
    allowCreation = false
  ): AsyncFileValidatorFn {
    return FileValidators.asyncFileValidatorHandler(
      async (file: File): Promise<FileValidationErrors | null> => {
        const oldZones = zonesGet();
        if (!file) return null;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          validateZoneDiff(parsed, oldZones, allowCreation);
          return null;
        } catch (error) {
          switch (error?.constructor) {
            case ZoneDiffValidationError:
              return {
                approvedZoneFileValidationError: [
                  {
                    file,
                    message: error.message
                  }
                ]
              };
            case SyntaxError:
              return { zonFileNotJsonError: [{ file }] };
            default:
              return { fileReadError: [{ file }] };
          }
        }
      }
    );
  }

  static isValidVdf(): AsyncFileValidatorFn {
    return FileValidators.asyncFileValidatorHandler(
      async (file: File): Promise<FileValidationErrors | null> => {
        try {
          const text = await file.text();
          vdf.parse(text);
          return null;
        } catch (error) {
          switch (error?.constructor) {
            case VdfParseError:
              return { vdfFileValidationError: [{ file }] };
            default:
              return { fileReadError: [{ file }] };
          }
        }
      }
    );
  }

  static imageDimensions(
    dimensions: Array<{ width: number; height: number }>
  ): AsyncFileValidatorFn {
    return FileValidators.asyncFileValidatorHandler(
      (file: File): Promise<FileValidationErrors | null> =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.addEventListener('loadend', () => {
            const image = new Image();
            image.addEventListener('load', () => {
              resolve(
                dimensions.some(
                  ({ width, height }) =>
                    image.naturalWidth !== width ||
                    image.naturalHeight !== height
                )
                  ? { imageFileDimensionsError: [{ file }] }
                  : null
              );
            });
            image.addEventListener('error', () =>
              resolve({ imageFileReadError: [{ file }] })
            );
            image.src = reader.result as string;
          });
          reader.addEventListener('error', () =>
            resolve({ fileReadError: [{ file }] })
          );
          reader.readAsDataURL(file);
        })
    );
  }

  private static getExtension(filename: string): string | undefined {
    if (!filename.includes('.')) return undefined;

    return filename.slice(filename.lastIndexOf('.') + 1);
  }

  private static fileValidatorHandler(
    validatorFn: (_: File) => FileValidationErrors | null
  ): FileValidatorFn {
    return (control: AbstractControl): FileValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const errors: FileValidationErrors = {};

      const validate = (file: File): void => {
        if (file instanceof File) {
          const error = validatorFn(file);
          if (!error) return;

          for (const [k, v] of Object.entries(error)) {
            errors[k] = [...(errors[k] ?? []), ...v];
          }
        } else {
          errors['fileIsFile'] = [...errors['fileIsFile'], { file }];
        }
      };

      if (Array.isArray(control.value)) {
        for (const file of control.value) {
          validate(file);
        }
      } else {
        validate(control.value);
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  private static asyncFileValidatorHandler(
    validatorFn: (_: File) => Promise<FileValidationErrors | null>
  ): AsyncFileValidatorFn {
    return async (
      control: AbstractControl
    ): Promise<FileValidationErrors | null> => {
      if (!control.value) {
        return null;
      }

      const errors: FileValidationErrors = {};

      const validate = async (file: File): Promise<void> => {
        if (file instanceof File) {
          const error = await validatorFn(file);
          if (!error) return;

          for (const [k, v] of Object.entries(error)) {
            errors[k] = [...(errors[k] ?? []), ...v];
          }
        } else {
          errors['fileIsFile'] = [...errors['fileIsFile'], { file }];
        }
      };

      if (Array.isArray(control.value)) {
        await Promise.all(
          control.value.map(async (val) => await validate(val))
        );
      } else {
        await validate(control.value);
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }
}
