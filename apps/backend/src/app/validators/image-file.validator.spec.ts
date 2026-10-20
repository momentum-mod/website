import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import {
  ImageFileValidator,
  ImageFileValidatorOptions
} from './image-file.validator';
import { ImageType } from '@momentum/constants';

describe('ImageFileValidator', () => {
  let metadata: any;
  beforeEach(() => {
    metadata = mock.fn<(...args: any[]) => any>();
  });
  afterEach(() => mock.restoreAll());

  const createValidator = (options: ImageFileValidatorOptions) =>
    new ImageFileValidator(options, () => metadata());

  it('isValid should return true for a valid image file', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'jpeg'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      true
    );

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'jpg'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpg',
        buffer: Buffer.from('')
      } as any),
      true
    );

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'png'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/png',
        buffer: Buffer.from('')
      } as any),
      true
    );

    // honestly don't care if file and sharp mimetypes dont match
  });

  it('isValid should return true for an valid image file without a mimetype', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'jpeg'
      })
    );

    assert.strictEqual(
      await validator.isValid({ buffer: Buffer.from('') } as any),
      true
    );
  });

  it('isValid should return false for an image file with invalid mimetype on the file', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'jpeg'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/cary-grant-eating-a-seagull',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it('isValid should return false for an image file with invalid format reported by sharp', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'sausage'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it("isValid should return false for an image file with format that doesn't match format given in options", async () => {
    const validator = createValidator({
      format: ImageType.PNG,
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({ width: 100, height: 100, format: 'jpeg' })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it("isValid should return false for an image file with mimetype that doesn't match format given in options", async () => {
    const validator = createValidator({
      format: ImageType.PNG,
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({ width: 100, height: 100, format: 'png' })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it('isValid should return false if the mimetype and type reported by sharp dont match', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 100,
        format: 'jpg'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/png',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it('isValid should return false for an image file with too small dimensions', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 5,
        height: 100,
        format: 'sausage'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 5,
        format: 'sausage'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });

  it('isValid should return false for an image file with too large dimensions', async () => {
    const validator = createValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 2000,
        height: 100,
        format: 'sausage'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );

    metadata.mock.mockImplementationOnce(() =>
      Promise.resolve({
        width: 100,
        height: 2000,
        format: 'jpeg'
      })
    );

    assert.strictEqual(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any),
      false
    );
  });
});
