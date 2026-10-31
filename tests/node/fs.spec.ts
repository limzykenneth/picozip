import { describe, it, beforeAll, assert } from "vite-plus/test";
import { Zip, FileEntry, Folder, type RangeFetcher } from "@/src/index.ts";
import path from "node:path";
import { createFetcher } from "@/src/fetchers/node-fs/node-fs.ts";

describe("Node fs", () => {
  let fetcher: RangeFetcher;

  beforeAll(() => {
    fetcher = createFetcher();
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip(path.resolve(import.meta.dirname, "../assets/test.zip"), fetcher);
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
