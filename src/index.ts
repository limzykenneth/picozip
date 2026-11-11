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
    const endOfCentralDirectoryRecord = await this.fetcher({
      start: -22,
    }).arrayBuffer();

    const view = new DataView(endOfCentralDirectoryRecord);
    const magicNumber = view.getUint32(0, true);

    // Check magic number
    if (magicNumber !== 101010256) {
      // Read comments length, retry reading CDFH
      throw new Error("Comments in zip file not supported yet");
    }

    const numberOfCDFH = view.getUint16(10, true);
    const startOfCDFH = view.getUint32(16, true);
    const cdfhLength = view.getUint32(12, true);
    const cdfh = await this.fetcher({
      start: startOfCDFH,
      end: startOfCDFH + cdfhLength,
    }).arrayBuffer();

    let startOffset = 0;
    const cdfhView = new DataView(cdfh);
    const decoder = new TextDecoder();
    for (let i = 0; i < numberOfCDFH; i++) {
      // Read each CDFH and build the file tree
      const magicNumber = cdfhView.getUint32(startOffset, true);
      if (magicNumber !== 33639248) throw new Error("Mismatched CDFH magic number");

      const filenameLength = cdfhView.getUint16(startOffset + 28, true);
      const extraFieldLength = cdfhView.getUint16(startOffset + 30, true);
      const fileCommentLength = cdfhView.getUint16(startOffset + 32, true);
      const currentCDFHLength = 46 + filenameLength + extraFieldLength + fileCommentLength;

      const currentCDFH = cdfh.slice(startOffset, startOffset + currentCDFHLength);
      const filenameSlice = currentCDFH.slice(46, 46 + filenameLength);
      const filename = decoder.decode(filenameSlice);

      if (!filename.endsWith("/")) {
        const startOfLocalFileHeader = cdfhView.getUint32(startOffset + 42, true);

        const file = new FileEntry(this.fetcher, {
          name: filename,
          startOfLocalFileHeader,
          cdfh: currentCDFH,
        });
        this.entries.push(file);
      } else {
        const folder = new Folder(filename);
        this.entries.push(folder);
      }

      startOffset = startOffset + currentCDFHLength;
    }
  }

  file(path: string): FileEntry {
    return this.entries.find((entry) => {
      return entry instanceof FileEntry && entry.name === path;
    }) as FileEntry;
  }
}

export { FileEntry, Folder };
