import { env } from "cloudflare:test";
import { describe, it, beforeAll } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/cf-workers/r2";
import { Zip, type RangeFetcher } from "@/src/index.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";

import { assertZipBasic } from "../shared/zip";

// const network = setupNetwork();

describe("Cloudflare R2", () => {
  let fetcher: RangeFetcher;

  beforeAll(async () => {
    await env.BUCKET.put("test.zip", zipFile);
    fetcher = createFetcher(env.BUCKET);
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip("test.zip", fetcher);
    await zip.open();
    await assertZipBasic(zip);
  });
});
