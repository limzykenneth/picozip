import fs from "node:fs/promises";
import path from "node:path";

import { setupServer, type SetupServer } from "msw/node";
import { describe, it, beforeAll, afterAll, afterEach } from "vite-plus/test";

import { createFetcher } from "@/src/fetcher/fetch/index.ts";
import { Zip, type RangeFetcher } from "@/src/index.ts";

import { createHandlers } from "../shared/server-mock";
import { assertZipBasic } from "../shared/zip";

describe("Node fetch", () => {
  let server: SetupServer;
  let fetcher: RangeFetcher;

  beforeAll(async () => {
    const zipFile = (await fs.readFile(path.resolve(import.meta.dirname, "../assets/test.zip")))
      .buffer;
    server = setupServer(...createHandlers({ zipFile }));
    server.listen();

    fetcher = createFetcher();
  });

  afterEach(() => {});

  afterAll(() => {
    server?.close();
  });

  it("should open the zip file and enable files to be read", async () => {
    const zip = new Zip("https://example.com/test.zip", fetcher);
    await zip.open();
    await assertZipBasic(zip);
  });
});
