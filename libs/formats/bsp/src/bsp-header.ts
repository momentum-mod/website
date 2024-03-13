import { arrayFrom } from '@momentum/util-fn';

interface Lump {
  offset: number;
  length: number;
  version: number;
  fourCC: number;
}

export class BspReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BspReadError';
  }
}

/**
 * Simple BSP header reader. Could add more functionality if desired, for now I
 * just need to parse the header to determine the BSP is compressed or not.
 */
export class BspHeader {
  static readonly HEADER_LUMPS = 64;
  static readonly HEADER_SIZE = 1036;
  static readonly UNCOMPRESSED_LUMP_TYPES = [35, 40];

  ident?: string;
  version?: number;
  lumps?: Lump[];

  private constructor() {}

  static async fromBlob(blob: Blob): Promise<BspHeader> {
    const reader = blob.stream().getReader();

    const headerBytes = new Uint8Array(BspHeader.HEADER_SIZE);
    let headerIndex = 0;

    // Node/browsers will almost certainly read the 1036 bytes we need in one
    // go, but just to be safe, this can read multiple.
    while (headerIndex < headerBytes.length) {
      const { done, value } = await reader.read();
      const leftToRead = headerBytes.length - headerIndex;

      if (!value || (done && value.length < leftToRead)) {
        throw new BspReadError('Invalid BSP file');
      }

      headerBytes.set(value.slice(0, leftToRead), headerIndex);
      headerIndex = value.length;
    }

    // Don't need stream anymore once header is read
    void reader.cancel();

    const header = new BspHeader();

    // https://developer.valvesoftware.com/wiki/BSP_(Source)#Lump_structure
    header.ident = String.fromCodePoint(...headerBytes.slice(0, 4));
    if (header.ident !== 'VBSP') {
      throw new BspReadError('Invalid ident');
    }

    const view = new DataView(headerBytes.buffer);

    header.version = view.getInt32(4, true);

    header.lumps = arrayFrom(BspHeader.HEADER_LUMPS, (i) => {
      const offset = 8 + i * 16;
      return {
        offset: view.getInt32(offset, true),
        length: view.getInt32(offset + 4, true),
        version: view.getInt32(offset + 8, true),
        fourCC: view.getInt32(offset + 12, true)
      };
    });

    return header;
  }

  /**
   * If it's zipped then every lump containing data will have a non-zero fourCC
   */
  isCompressed(): boolean {
    return this.lumps.every(
      ({ length, fourCC }, index) =>
        BspHeader.UNCOMPRESSED_LUMP_TYPES.includes(index) ||
        length === 0 ||
        fourCC > 0
    );
  }
}
