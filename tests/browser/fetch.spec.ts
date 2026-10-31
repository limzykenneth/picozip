import { describe, it, beforeAll, afterAll, assert } from "vite-plus/test";
import { Zip, FileEntry, Folder, type RangeFetcher } from "@/src/index.ts";
import { network } from "virtual:msw";
import { http, HttpResponse } from "msw/http";
import { createFetcher } from "@/src/fetchers/fetch/fetch.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";

describe("Node fetch", () => {
  let fetcher: RangeFetcher;

  beforeAll(async () => {
    network.configure({
      handlers: [
        http.get<{}, {}, ArrayBuffer | string>("https://example.com/test.zip", ({ request }) => {
          const data = new Uint8Array(zipFile);
          let range = request.headers.get("Range");
          if (!range) {
            return HttpResponse.arrayBuffer(zipFile);
          } else if (range.startsWith("bytes")) {
            range = range.replace(/^bytes=/, "");
          } else {
            return HttpResponse.text("Not supported", {
              status: 400,
            });
          }

          if (range.startsWith("-")) {
            const slice = data.slice(parseInt(range));
            return HttpResponse.arrayBuffer(slice.buffer, {
              status: 206,
            });
          } else {
            const [start, end] = range.split("-");
            const slice = data.slice(parseInt(start), end ? parseInt(end) + 1 : undefined);
            return HttpResponse.arrayBuffer(slice.buffer, {
              status: 206,
            });
          }
        }),
      ],
    });

    await network.enable();

    fetcher = createFetcher();
  });

  afterAll(async () => {
    await network.disable();
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip("https://example.com/test.zip", fetcher);

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
