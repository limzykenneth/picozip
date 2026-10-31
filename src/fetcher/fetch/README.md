# picozip/fetch

A fetcher that uses standard JS `fetch` and [HTTP Range header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests) to fetch partial content of a zip file at the specified URL. The server serving the request must support the range header and return partial content as requested.

This can be used in any JS platform as long as `fetch` is supported which covers all modern JS runtime (browsers, Node.js, Cloudflare Workers, etc).

## Usage

```js
import { Zip } from "picozip";
import { createFetcher } from "picozip/fetcher/fetch";

const fetcher = createFetcher();
const zip = await Zip.open("https://example.com/file.zip", fetcher);
```
