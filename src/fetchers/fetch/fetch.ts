import type { RangeFetcher } from "@/src/index.ts";

export const createFetcher: () => RangeFetcher = () => {
  return async (key, options) => {
    const res = await fetch(key, {
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
