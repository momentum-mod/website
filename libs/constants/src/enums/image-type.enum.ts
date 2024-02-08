/**
 * All the image formats we support in different places.
 *
 * We could support more images if we really wanted, but WebP really isn't
 * that impressive vs mozjpeg jpegs, and we use mozjpeg to compress submitted
 * MapImage PNGs, so not much point bothering. Also fuck Google.
 */
export enum ImageType {
  JPG,
  PNG
}
