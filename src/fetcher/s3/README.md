# picozip/s3

_This fetcher is still work in progress and is not recommended for use._

A fetcher that is designed to fetch from an S3 endpoint or any other S3 compatible endpoint. It uses [aws4fetch](https://npmx.dev/package/aws4fetch) to ensure it can work in any JS runtime as long as it supports `fetch` and `SubtleCrypto`, which includes all modern JS environments.

## Usage

```js
import { Zip } from "picozip";
import { createFetcher } from "picozip/fetcher/s3";

const fetcher = createFetcher();
const zip = await Zip.open("file.zip", fetcher);
```
