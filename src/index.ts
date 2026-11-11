import { FileEntry } from "./FileEntry.ts";
import { Folder } from "./Folder.ts";
import { streamToBuffer } from "./utils.ts";

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

  static async open(key: string, fetcher: RangeFetcher) {
    const zip = new Zip(key, fetcher);
    await zip.open();
    return zip;
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

export { FileEntry, Folder };
