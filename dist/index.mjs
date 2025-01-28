import EventEmitter from 'node:events';
import { Worker } from 'node:worker_threads';

class AsciidocConverter extends EventEmitter {
  worker;
  constructor(opts) {
    super({ captureRejections: true });
    const url = new URL("./worker.cjs", import.meta.url);
    this.worker = new Worker(url, {
      workerData: opts
    });
    this.worker.on("exit", (code) => {
      this.emit("exit", { code });
    });
  }
  async convert(input) {
    return new Promise((resolve, reject) => {
      this.worker.removeAllListeners("message").removeAllListeners("error").on("message", resolve).on("error", reject).postMessage(input);
    });
  }
  async terminate() {
    return this.worker.terminate();
  }
}

function asciidoc(opts) {
  const asciidocFileExt = ".adoc";
  const { options: documentOptions, highlighters } = opts ?? {};
  const converter = new AsciidocConverter({
    highlighters
  });
  let server;
  function watchIncludes(file, includes) {
    server.watcher.on("change", async (f) => {
      if (!includes.includes(f)) return;
      const m = server.moduleGraph.getModuleById(file);
      m && await server.reloadModule(m);
    });
    server.watcher.add(includes);
  }
  return {
    name: "asciidoc",
    hooks: {
      "astro:config:setup": (params) => {
        const { addPageExtension, addRenderer, updateConfig, addWatchFile } = params;
        addRenderer({
          name: "astro:jsx",
          serverEntrypoint: "@astrojs/mdx/server.js"
        });
        addPageExtension(asciidocFileExt);
        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-asciidoc",
                configureServer(s) {
                  server = s;
                },
                async transform(_code, id) {
                  if (!id.endsWith(asciidocFileExt)) return;
                  const doc = await converter.convert({
                    file: id,
                    options: documentOptions
                  });
                  watchIncludes(id, doc.includes);
                  return {
                    code: `import { Fragment, jsx as h } from "astro/jsx-runtime";
${doc.layout ? `import Layout from ${JSON.stringify(doc.layout)};` : ""}
export const file = ${JSON.stringify(id)};
export const title = ${JSON.stringify(doc.frontmatter.title)};
export const frontmatter = ${JSON.stringify(doc.frontmatter)};
export const headings = ${JSON.stringify(doc.headings)};
export async function getHeadings() { return headings; }
export async function Content() {
  const content = h(Fragment, { "set:html": ${JSON.stringify(doc.html)} });
  ${doc.layout ? `return h(Layout, { title, headings, frontmatter, children: content });` : `return content;`}
}
export default Content;`,
                    meta: {
                      vite: {
                        lang: "ts"
                      }
                    },
                    map: null
                  };
                }
              }
            ]
          }
        });
        addWatchFile(new URL(import.meta.url));
      },
      "astro:server:done": async () => {
        await converter.terminate();
      },
      "astro:build:done": async () => {
        await converter.terminate();
      }
    }
  };
}

export { asciidoc as default };
