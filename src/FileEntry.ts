import type { Zip } from "./index.ts";
import { streamToBuffer } from "./utils.ts";

interface FileEntryOptions {
  name: string;
  startOfLocalFileHeader: number;
  cdfh: ArrayBuffer;
}

export class FileEntry {
  name: string;
  startOfLocalFileHeader: number;
  #fetcher;
  #cdfh: ArrayBuffer;
  // These are data from the central headers, they should match local headers
  #fileSize: number;
  #compression: string;
  #checksum: number;

  constructor(fetcher: Zip["fetcher"], options: FileEntryOptions) {
    this.name = options.name;
    this.startOfLocalFileHeader = options.startOfLocalFileHeader;
    this.#fetcher = fetcher;
    this.#cdfh = options.cdfh;
  }

  async getStream() {
    const localFileHeader = await this.#fetcher({
      start: this.startOfLocalFileHeader,
      end: this.startOfLocalFileHeader + 30,
    }).arrayBuffer();
    const lfhView = new DataView(localFileHeader);

    // Check LFH magic number
    const magicNumber = lfhView.getUint32(0, true);
    if (magicNumber !== 67324752) throw new Error("Mismatched file magic number");
    const compressionMethodBytes = lfhView.getUint16(8, true);
    const compressionMethod = compressionMethodBytes === 8 ? "deflate" : "none";
    const compressedLength = lfhView.getUint32(18, true);
    const filenameLength = lfhView.getUint16(26, true);
    const extraFieldLength = lfhView.getUint16(28, true);
    const fileStartOffset = this.startOfLocalFileHeader + 30 + filenameLength + extraFieldLength;

    const compressedFileStream = await this.#fetcher({
      start: fileStartOffset,
      end: fileStartOffset + compressedLength - 1,
    }).stream;

    let fileStream;
    if (compressionMethod === "deflate") {
      const ds = new DecompressionStream("deflate-raw");
      fileStream = compressedFileStream.pipeThrough(ds);
    } else {
      fileStream = compressedFileStream;
    }

    return fileStream;
  }

  async getArrayBuffer() {
    const stream = await this.getStream();
    const file = await streamToBuffer(stream);
    return file;
  }

  getLocalFileHeader() {}
}
