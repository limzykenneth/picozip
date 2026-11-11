export async function streamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
  const chunks = await Array.fromAsync(stream, (chunk) => chunk);
  const totalSize = chunks.reduce((acc, arr) => {
    acc += arr.length;
    return acc;
  }, 0);

  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}
