import path from "node:path";

import { describe, it, beforeAll } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/node/fs.ts";
import { Zip, type RangeFetcher } from "@/src/index.ts";

import { assertZipBasic } from "../shared/zip";

describe("Node fs", () => {
  let fetcher: RangeFetcher;

  beforeAll(() => {
    fetcher = createFetcher();
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip(path.resolve(import.meta.dirname, "../assets/test.zip"), fetcher);
    await zip.open();
    await assertZipBasic(zip);
  });
});
