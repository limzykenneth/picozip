import { AwsClient } from "aws4fetch";

import type { RangeFetcher } from "@/src/index.ts";

type CreateReturn = (options: CreateOptions) => RangeFetcher;
interface CreateOptions {
  host: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export const createFetcher: CreateReturn = (options: CreateOptions) => {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
  });
  const hostURL = new URL(options.host);
  const url = new URL(`${hostURL.protocol}//${options.bucket}.${hostURL.host}`);

  return async (key, options) => {
    url.pathname = key;

    const res = await client.fetch(url, {
      headers: {
        Range: `bytes=${options.start < 0 ? options.start : `${options.start}-${options.end}`}`,
      },
    });

    if (!res.ok) {
      throw new Error("Server returned non-ok status");
    }

    return res.body as ReadableStream;
  };
};
