import { ParseFilePipe, PipeTransform } from '@nestjs/common';
import * as Multer from '@nest-lab/fastify-multer';

export class ParseFilesPipe implements PipeTransform<Multer.File[]> {
  constructor(private readonly pipe: ParseFilePipe) {}

  async transform(
    files: Readonly<Multer.File[]> | Readonly<Record<string, Multer.File>>
  ) {
    if (!files) return [];
    for (const file of typeof files === 'object' ? Object.values(files) : files)
      await this.pipe.transform(file);

    return files;
  }
}
