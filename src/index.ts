export type RangeFetcher = (
  key: string,
  options: { start: number; end?: number },
) => Promise<ReadableStream>;

export class Zip {
  fetcher;
  key: string;
  entries: (FileEntry | Folder)[] = [];

  constructor(key: string, fetcher: RangeFetcher) {
    this.key = key;

    this.fetcher = (options: { start: number; end?: number }) => {
      const stream = fetcher(this.key, options);
      return {
        stream,
        arrayBuffer: async () => {
          return await streamToBuffer(await stream);
        },
      };
    };
  }

  async open() {
    // Read the central directory record to get the directory structure
    const endOfCentralRecordDirectory = await this.fetcher({
      start: -22,
    }).arrayBuffer();

    const view = new DataView(endOfCentralRecordDirectory);
    const magicNumber = view.getUint32(0, true);

    // Check magic number
    if (magicNumber !== 101010256) {
      // Read comments length, retry reading CRD
      throw new Error("Comments in zip file not supported yet");
    }

    const numberOfCRD = view.getUint16(10, true);
    const startOfCRD = view.getUint32(16, true);
    const crdLength = view.getUint32(12, true);
    const crd = await this.fetcher({
      start: startOfCRD,
      end: startOfCRD + crdLength,
    }).arrayBuffer();

    let startOffset = 0;
    const crdArray = new Uint8Array(crd);
    const crdView = new DataView(crd);
    const decoder = new TextDecoder();
    for (let i = 0; i < numberOfCRD; i++) {
      // Read each CRD and build the file tree
      const magicNumber = crdView.getUint32(startOffset, true);
      if (magicNumber !== 33639248) throw new Error("Mismatched CRD magic number");

      const filenameLength = crdView.getUint16(startOffset + 28, true);
      const filenameSlice = crdArray.slice(startOffset + 46, startOffset + 46 + filenameLength);
      const filename = decoder.decode(filenameSlice);

      if (!filename.endsWith("/")) {
        const startOfLocalFileHeader = crdView.getUint32(startOffset + 42, true);

        const file = new FileEntry(this.fetcher, {
          name: filename,
          startOfLocalFileHeader,
        });
        this.entries.push(file);
      } else {
        const folder = new Folder(filename);
        this.entries.push(folder);
      }

      const extraFieldLength = crdView.getUint16(startOffset + 30, true);
      const fileCommentLength = crdView.getUint16(startOffset + 32, true);

      startOffset = startOffset + 46 + filenameLength + extraFieldLength + fileCommentLength;
    }
  }

  file(path: string): FileEntry {
    return this.entries.find((entry) => {
      return entry instanceof FileEntry && entry.name === path;
    }) as FileEntry;
  }
}

export class Folder {
  name: string;
  entries: Map<string, FileEntry | Folder> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  addEntry(name: string, entry: FileEntry | Folder) {
    this.entries.set(name, entry);
  }
}

interface FileEntryOptions {
  name: string;
  startOfLocalFileHeader: number;
}

export class FileEntry {
  name: string;
  startOfLocalFileHeader: number;
  #fetcher;

  constructor(fetcher: Zip["fetcher"], options: FileEntryOptions) {
    this.name = options.name;
    this.startOfLocalFileHeader = options.startOfLocalFileHeader;
    this.#fetcher = fetcher;
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
}

async function streamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
  const chunks = await Array.fromAsync(stream, (chunk) => chunk);
  const totalSize = chunks.reduce((acc, arr) => {
    acc += arr.length;
    return acc;
  }, 0);

  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}
