import type { Zip } from "./index.ts";
import { streamToBuffer } from "./utils.ts";

interface FileEntryOptions {
  cdfh: ArrayBuffer;
}

const decoder = new TextDecoder();

export class FileEntry {
  #fetcher;
  #cdfh: ArrayBuffer;
  #cdfhView: DataView;
  // These are data from the central headers, they should match local headers
  #name: string;
  #fileSize: number;
  #compressedFileSize: number;
  #compressionMethod: string;
  #checksum: number;
  #startOfLocalFileHeader: number;

  #localFileHeader: Promise<ArrayBuffer>;

  constructor(fetcher: Zip["fetcher"], options: FileEntryOptions) {
    // this.name = options.name;
    this.#fetcher = fetcher;
    this.#cdfh = options.cdfh;
  }

  get name() {
    if (!this.#name) {
      const filenameLength = this.cdfhView.getUint16(28, true);
      const filenameSlice = this.#cdfh.slice(46, 46 + filenameLength);
      this.#name = decoder.decode(filenameSlice);
    }
    return this.#name;
  }

  get cdfhView() {
    if (!this.#cdfhView) {
      this.#cdfhView = new DataView(this.#cdfh);
    }
    return this.#cdfhView;
  }

  get fileSize() {
    if (!this.#fileSize) {
      this.#fileSize = this.cdfhView.getUint32(24, true);
    }
    return this.#fileSize;
  }

  get compressedFileSize() {
    if (!this.#compressedFileSize) {
      this.#compressedFileSize = this.cdfhView.getUint32(20, true);
    }
    return this.#compressedFileSize;
  }

  get compressionMethod() {
    if (!this.#compressionMethod) {
      const methodBytes = this.cdfhView.getUint16(10, true);
      if (methodBytes === 0) {
        this.#compressionMethod = "uncompressed";
      } else if (methodBytes === 8) {
        this.#compressionMethod = "deflate";
      }
    }
    return this.#compressionMethod;
  }

  get checksum() {
    if (!this.#checksum) {
      this.#checksum = this.cdfhView.getUint32(16, true);
    }
    return this.#checksum;
  }

  get startOfLocalFileHeader() {
    if (!this.#startOfLocalFileHeader) {
      this.#startOfLocalFileHeader = this.cdfhView.getUint32(42, true);
    }
    return this.#startOfLocalFileHeader;
  }

  get localFileHeader() {
    if (!this.#localFileHeader) {
      this.#localFileHeader = this.#fetcher({
        start: this.startOfLocalFileHeader,
        end: this.startOfLocalFileHeader + 30,
      }).arrayBuffer();
    }
    return this.#localFileHeader;
  }

  async #validateLocalFileHeader({ parseOnly } = { parseOnly: false }) {
    const localFileHeader = await this.localFileHeader;
    const lfhView = new DataView(localFileHeader);

    // Check LFH magic number
    const magicNumber = lfhView.getUint32(0, true);
    if (magicNumber !== 67324752) throw new Error("Mismatched file magic number");
    const compressionMethodBytes = lfhView.getUint16(8, true);
    const compressionMethod =
      compressionMethodBytes === 8
        ? "deflate"
        : compressionMethodBytes === 0
          ? "uncompressed"
          : undefined;
    const compressedLength = lfhView.getUint32(18, true);
    const uncompressedLength = lfhView.getUint32(22, true);
    const filenameLength = lfhView.getUint16(26, true);
    const checksum = lfhView.getUint32(14, true);
    const extraFieldLength = lfhView.getUint16(28, true);
    const fileStartOffset = this.startOfLocalFileHeader + 30 + filenameLength + extraFieldLength;

    if (!parseOnly) {
      // Validate against data from CDFH, throw if not match
      if (compressionMethod !== this.compressionMethod)
        throw new Error("Compression method not match");
      if (uncompressedLength !== this.fileSize) throw new Error("File size not match");
      if (compressedLength !== this.compressedFileSize)
        throw new Error("Compressed file size not match");
      if (checksum !== this.checksum) throw new Error("Checksum not match");
    }

    return {
      fileStartOffset,
      compressedLength,
      compressionMethod,
    };
  }

  async getStream() {
    const { fileStartOffset, compressedLength, compressionMethod } =
      await this.#validateLocalFileHeader();

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
}
