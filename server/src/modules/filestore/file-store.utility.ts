import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export const FileStoreUtils = {
    getFileHash: (filePath): Promise<string> =>
        new Promise((resolve, reject) => {
            const hash = createHash('sha1').setEncoding('hex');
            createReadStream(filePath)
                .pipe(hash)
                .on('error', (err) => reject(err))
                .on('finish', () => resolve(hash.read()));
        }),

    getBufferHash: (buf): string => createHash('sha1').update(buf).digest('hex')
};
