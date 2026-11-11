import type { FileEntry } from "./FileEntry.ts";

export class Folder {
  name: string;
  entries: Map<string, FileEntry | Folder> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  addEntry(name: string, entry: FileEntry | Folder) {
    this.entries.set(name, entry);
  }
}
