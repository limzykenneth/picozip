import type { RangeFetcher } from "@/src/index.ts";
import type { R2Bucket, R2GetOptions, R2ObjectBody } from "@cloudflare/workers-types";

type CreateReturn = (r2Bucket: R2Bucket) => RangeFetcher;

export const createFetcher: CreateReturn = (r2Bucket: R2Bucket) => {
  return async (key, options) => {
    let getOptions: R2GetOptions = {};
    if (options.start < 0) {
      getOptions.range = {
        suffix: -options.start,
      };
    } else {
      getOptions.range = {
        offset: options.start,
        length: options.end ? options.end - options.start + 1 : undefined,
      };
    }

    const file = (await r2Bucket.get(key, getOptions)) as R2ObjectBody;
    return file.body as unknown as ReadableStream;
  };
};
