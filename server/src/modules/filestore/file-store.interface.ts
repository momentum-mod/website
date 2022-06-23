export interface IFileStoreFile {
    fileName: string;
    basePath: string;
    fullPath: string;
    downloadURL: string;
    hash?: string;
}

export interface IFileStoreCloudFile {
    fileName: string;
    downloadURL: string;
    hash: string;
}
