export interface IFileStoreFile {
    fileKey: string;
    basePath: string;
    fullPath: string;
    downloadURL: string;
    hash?: string;
}

export interface IFileStoreCloudFile {
    fileKey: string;
    hash: string;
}
