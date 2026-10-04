// eSpeak NG compiled to WebAssembly: runs the espeak-ng command line, with an in-memory file system.
declare module "espeak-ng" {
  interface ESpeakInstance {
    FS: { readFile(path: string, opts: { encoding: "utf8" }): string };
  }
  export default function ESpeakNg(opts: { arguments: string[] }): Promise<ESpeakInstance>;
}
