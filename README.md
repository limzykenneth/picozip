# picozip

A truly cross platform zip library designed for memory limited environment, fully written in JS using modern standard JS APIs. The core library has no dependencies and uses no Node.js modules.

This is still a work in progress and breaking API change is very likely until stable release.

## Usage

The core part of the library is the `Zip` class.

```js
import { Zip } from "picozip";
```

The Zip class can be created with the constructor or with the static `open()` method.

```js
const zip1 = new Zip("file.zip", fetcher);
await zip1.open();

const zip2 = await Zip.open("file.zip", fetcher);
```

The difference between the two is that the former does not make any request on creation and will wait until `open()` is called on the object while the latter both create the object and call `open()` on it in one pass.

`fetcher` is a function that matches the signature defined by the `RangeFetcher` export.

```ts
type RangeFetcher = (
  key: string,
  options: { start: number; end?: number },
) => Promise<ReadableStream>;
```

`key` is the path to the zip file as interpreted by the `fetcher` and options is the range in which to fetch the partial content. `start` can be either positive or negative while `end` is optional. The range works in the same way as [HTTP Range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range) header, meaning they represent bytes, is zero-index, and both indexes are inclusive (ie. in the range of [start, end], not [start, end) as is typical of array slice operations).

Once the zip file has been opened, the `entries` property will consist of an array of all files and folders stored in the zip file. A better way of navigating the zip file will be implemented in the future. To get a specific file from the zip file:

```js
const file = zip.file("content.txt");
```

To read the contents of the file, you can obtain either a `ReadableStream` or an `ArrayBuffer` from it:

```js
const stream = await file.getStream();

// OR

const buffer = await file.getArrayBuffer();
```

Either method will consume the underlying `ReadableStream` so you cannot call both together.

## Limitations

Currently only unzip operation is supported. Zip functionality will be implemented later.

CRC32 checksums are currently not checked as part of the unzipping process.

The process of opening and reading from a zip file will cause several requests being made through the fetcher for partial data. If requests count is a significant bottleneck for you (because of limitation on number of request or latency), you can either buffer the entire file for a fetcher if memory is not a limitation, or you may need to find another solution.

## Why

The initial motivation for this library is to have an unzip utility that can work in Cloudflare Workers that can selectively stream files from a very large zip files. Cloudflare workers only have 128MB of RAM, a worker exceeding that could be evicted and exit. This means it cannot load the whole zip file into memory or load file out of it into memory if either exceeds 128MB. Using a streaming API is the recommended way to work with large files.

However, existing libraries either expect to work off a zip buffer that is fully loaded into memory already or if they do have streaming API, is designed to work in Node.js only or only read and write files to the file system.

Zip itself is not a very complex format and it is fairly simple to implement something that can read the internal file records and since each file is compressed and stored separately, they can be extracted on their own without needing to read any other file that is not needed. Two aspects of the zip format probably contributes to the shortcomings of existing implementations:

#### 1. The central directory where canonical data about what is in the zip file is stored at the end of the zip file.

This is sturctured this way because it enables the zip format to add or remove files from the zip file by just appending to the end of the file while not editing any other parts of the file. However if one does not have a way to read from the end of the zip file, then they will have to read from the start all the way to the end to find the central directory.

#### 2. For a time JS did not have a standard way of decompressing data from zip file.

Node.js provides the `node:zlib` built-in package to help handle this and the assumption is thus made that other environments like the browser either need a from scratch implementation of the decompression algorithm or have no way of decompressing. It doesn't help that many of the existing libraries were written quite some time ago and has not received updates for years.

Modern JS however already have all the tools required to solved these problems. Reading data from the end of the files have always been possible with HTTP Range header, Node.js `fs.createReadStream`, S3 API, etc. Unless there is a risk of the file changing in the original source mid-decompression, this should not be an issue.

Decompressing data is now also possible with the [`DecompressionStream`](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream) API. It is supported by practically all modern browsers and all modern JS runtime. This means that rather than using `node:zlib`, bundling a WASM bundle, or use a pure JS implementation, the JS runtime itself will have the tools to decompress data within a zip file already, implemented with native performance.

Add all these with the standard [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) API, we have something that can load parts of a zip file, decompress data from it, and pipe it all through streams without needing to buffer anything in our limited RAM.

## Development

- Install dependencies:

```bash
vp install
```

- Run the unit tests:

```bash
vp test
```

- Build the library:

```bash
vp pack
```
