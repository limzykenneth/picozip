import { http, HttpResponse } from "msw";

export const createHandlers = ({ zipFile }: { zipFile: ArrayBuffer }) => {
  const handlers = [
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
  ];

  return handlers;
};
