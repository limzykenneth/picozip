# picozip/node

Fetchers designed to use specific Node.js API. The only supported method is using the `node:fs` module at the moment. It should work in any environment that has compatibility with `node:fs` API, but this is only tested against Node.js, using another runtime is at your own risk.

## Usage

```js
import { Zip } from "picozip";
import { createFetcher } from "picozip/fetcher/node/fs";

const fetcher = createFetcher();
const zip = await Zip.open("file.zip", fetcher);
```
