import { describe, it, beforeAll, assert } from "vite-plus/test";

import { Zip, FileEntry, Folder, type RangeFetcher } from "@/src/index.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";
import { env } from "cloudflare:test";
import { createFetcher } from "@/src/fetcher/cf-workers/r2";

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

    const decoder = new TextDecoder();
    for (const entry of zip.entries) {
      if (entry instanceof FileEntry) {
        const data = await entry.getArrayBuffer();

        if (entry.name === "file1.txt") {
          assert.equal(decoder.decode(data), "This is a test file.");
        } else if (entry.name === "folder1/file2.txt") {
          assert.equal(decoder.decode(data), "Nostrum rerum eaque vero.");
        } else {
          assert.fail("Unexpected file entry");
        }
      } else if (entry instanceof Folder) {
        assert.equal(entry.name, "folder1/");
      } else {
        assert.fail("Unexpected entry");
      }
    }
  });
});
