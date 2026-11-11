import { network } from "virtual:msw";
import { describe, it, beforeAll, afterAll } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/fetch/index.ts";
import { Zip, type RangeFetcher } from "@/src/index.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";

import { createHandlers } from "../shared/server-mock";
import { assertZipBasic } from "../shared/zip";

describe("Node fetch", () => {
  let fetcher: RangeFetcher;

  beforeAll(async () => {
    network.configure({
      handlers: createHandlers({ zipFile }),
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
