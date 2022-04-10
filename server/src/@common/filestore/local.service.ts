import { Injectable } from '@nestjs/common';
import { appConfig } from 'config/config';
import { FileStoreUtilsService } from './utils.service';
import { IFileStoreFile } from './fileStore.interface';
import { writeFile, stat, unlink } from 'fs';

@Injectable()
export class FileStoreLocalService {
    constructor(private fsUtil: FileStoreUtilsService) {}

    // fileName is most likely 'maps/mapID'
    public async storeMapFileLocal(mapFileBuffer, fileName): Promise<IFileStoreFile> {
        const basePath = __dirname + '/../../public/';
        const fullPath = basePath + fileName;
        const downloadURL = `${appConfig.baseURL_API}/api/${fileName}/download`;

        const hash = this.fsUtil.getBufferHash(mapFileBuffer);
        return new Promise((res, rej) => {
            writeFile(fullPath, mapFileBuffer, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res({
                        fileName: fileName,
                        basePath: basePath,
                        fullPath: fullPath,
                        downloadURL: downloadURL,
                        hash: hash
                    });
                }
            });
        });
    }

    // fileName is most likely 'img/imgID-<size>.jpg'
    public async storeImageFileLocal(imageFileBuffer, fileName): Promise<IFileStoreFile> {
        const basePath = __dirname + '/../../public/';
        const fullPath = basePath + fileName;
        const downloadURL = appConfig.baseURL + '/' + fileName;

        return new Promise((res, rej) => {
            writeFile(fullPath, imageFileBuffer, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res({
                        fileName: fileName,
                        basePath: basePath,
                        fullPath: fullPath,
                        downloadURL: downloadURL
                    });
                }
            });
        });
    }

    // fileName is most likely 'runs/runID'
    public async storeRunFileLocal(resultObj, fileName): Promise<IFileStoreFile> {
        const basePath = __dirname + '/../../public/';
        const fullPath = basePath + fileName;
        const downloadURL = `${appConfig.baseURL_API}/api/maps/${resultObj.map.id}/${fileName}/download`;

        return new Promise((res, rej) => {
            writeFile(fullPath, resultObj.bin.buf, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res({
                        fileName: fileName,
                        basePath: basePath,
                        fullPath: fullPath,
                        downloadURL: downloadURL
                    });
                }
            });
        });
    }

    public async deleteLocalFile(fileLocation): Promise<void> {
        return new Promise((resolve, reject) => {
            stat(fileLocation, (err) => {
                if (err) {
                    if (err.code === 'ENOENT') return resolve();
                    else return reject(err);
                }
                unlink(fileLocation, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    }
}
