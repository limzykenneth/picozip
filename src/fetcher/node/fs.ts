import type { RangeFetcher } from "@/src/index.ts";
import fs from "node:fs";
import fsPromises, { type FileHandle } from "node:fs/promises";
import { Readable } from "node:stream";

export const createFetcher: () => RangeFetcher = () => {
  let fileHandle: FileHandle;
  let fileSize: number = null;

  const fetcher: RangeFetcher = async (key, options) => {
    fileHandle = await fsPromises.open(key);
    if (fileSize === null) {
      const stats = await fileHandle.stat();
      fileSize = stats.size;
    }

    let readStream: fs.ReadStream;
    if (options.start < 0) {
      readStream = fileHandle.createReadStream({ start: fileSize + options.start });
    } else {
      readStream = fileHandle.createReadStream({ start: options.start, end: options.end });
    }
    return Readable.toWeb(readStream);
  };

  return fetcher;
};
