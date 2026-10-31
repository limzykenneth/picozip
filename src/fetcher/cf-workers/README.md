# picozip/cf-workers

Fetchers that are specifically designed to support relevant bindings in Cloudflare Workers. Currently the only binding supported is [R2 storage](https://developers.cloudflare.com/r2/).

## Usage

```js
import { Zip } from "picozip";
import { createFetcher } from "picozip/fetcher/cf-workers/r2";

const fetcher = createFetcher(env.BUCKET);
const zip = await Zip.open("file.zip", fetcher);
```
