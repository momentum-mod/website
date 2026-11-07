import { ParseFilePipe, PipeTransform } from '@nestjs/common';
import { UploadedMultipartFile } from '@nestjs/platform-fastify/multipart';

export class ParseFilesPipe implements PipeTransform<UploadedMultipartFile[]> {
  constructor(private readonly pipe: ParseFilePipe) {}

  async transform(
    files:
      | Readonly<UploadedMultipartFile[]>
      | Readonly<Record<string, UploadedMultipartFile>>
  ) {
    if (!files) return [];
    for (const file of typeof files === 'object' ? Object.values(files) : files)
      await this.pipe.transform(file);

    return files;
  }
}
