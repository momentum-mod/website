import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

@Injectable()
export class FileStoreUtilsService {
    public getFileHash(filePath): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = createHash('sha1').setEncoding('hex');
            createReadStream(filePath)
                .pipe(hash)
                .on('error', (err) => reject(err))
                .on('finish', () => {
                    resolve(hash.read());
                });
        });
    }

    public getBufferHash(buf): string {
        const hash = createHash('sha1');
        hash.update(buf);
        return hash.digest('hex');
    }
}
