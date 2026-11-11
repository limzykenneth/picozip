import { http, HttpResponse } from "msw/http";
import { network } from "virtual:msw";
import { describe, it, beforeAll, afterAll } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/fetch/index.ts";
import { Zip, type RangeFetcher } from "@/src/index.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";

import { assertZipBasic } from "../shared/zip";

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
    await assertZipBasic(zip);
  });
});
