import { assert } from "vite-plus/test";

import type { Zip } from "@/src";
import { FileEntry } from "@/src";
import { Folder } from "@/src";

export const assertZipBasic = async (zip: Zip) => {
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
};
