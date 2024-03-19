import { ImageFileValidator } from './image-file.validator';

// Bastard to mock, see https://stackoverflow.com/a/46160818
import sharp from 'sharp';
import { ImageType } from '@momentum/constants';
jest.mock('sharp', () => jest.fn());

describe('ImageFileValidator', () => {
  let metadata: jest.Mock;
  beforeEach(() => {
    metadata = jest.fn();
    (sharp as any).mockImplementation(() => ({ metadata }));
  });
  afterEach(() => jest.resetAllMocks());

  it('isValid should return true for a valid image file', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'jpeg'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(true);

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'jpg'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(true);

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'png'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/png',
        buffer: Buffer.from('')
      } as any)
    ).toBe(true);

    // honestly don't care if file and sharp mimetypes dont match
  });

  it('isValid should return true for an valid image file without a mimetype', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'jpeg'
    });

    expect(await validator.isValid({ buffer: Buffer.from('') } as any)).toBe(
      true
    );
  });

  it('isValid should return false for an image file with invalid mimetype on the file', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'jpeg'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/cary-grant-eating-a-seagull',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it('isValid should return false for an image file with invalid format reported by sharp', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'sausage'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it("isValid should return false for an image file with format that doesn't match format given in options", async () => {
    const validator = new ImageFileValidator({
      format: ImageType.PNG,
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({ width: 100, height: 100, format: 'jpeg' });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it("isValid should return false for an image file with mimetype that doesn't match format given in options", async () => {
    const validator = new ImageFileValidator({
      format: ImageType.PNG,
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({ width: 100, height: 100, format: 'png' });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it('isValid should return false if the mimetype and type reported by sharp dont match', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 100,
      format: 'jpg'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/png',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it('isValid should return false for an image file with too small dimensions', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 5,
      height: 100,
      format: 'sausage'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 5,
      format: 'sausage'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });

  it('isValid should return false for an image file with too large dimensions', async () => {
    const validator = new ImageFileValidator({
      minWidth: 10,
      maxWidth: 1000,
      minHeight: 10,
      maxHeight: 1000
    });

    metadata.mockResolvedValueOnce({
      width: 2000,
      height: 100,
      format: 'sausage'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);

    metadata.mockResolvedValueOnce({
      width: 100,
      height: 2000,
      format: 'jpeg'
    });

    expect(
      await validator.isValid({
        mimetype: 'image/jpeg',
        buffer: Buffer.from('')
      } as any)
    ).toBe(false);
  });
});
