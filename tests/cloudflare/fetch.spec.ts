import { setupNetwork } from "@msw/cloudflare";
import { describe, it, beforeAll, afterAll, afterEach } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/fetch/index.ts";
import { Zip, type RangeFetcher } from "@/src/index.ts";
import zipFile from "@/tests/assets/test.zip?arraybuffer";

import { createHandlers } from "../shared/server-mock";
import { assertZipBasic } from "../shared/zip";

const network = setupNetwork();

describe("Cloudflare fetch", () => {
  let fetcher: RangeFetcher;

  beforeAll(() => {
    network.enable();
    network.use(...createHandlers({ zipFile }));

    fetcher = createFetcher();
  });

  afterEach(() => {
    network.resetHandlers();
  });

  afterAll(() => {
    network.disable();
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip("https://example.com/test.zip", fetcher);
    await zip.open();
    await assertZipBasic(zip);
  });
});
