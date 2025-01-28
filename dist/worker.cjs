'use strict';

const asciidoctor = require('@asciidoctor/core');
const node_url = require('node:url');
const node_worker_threads = require('node:worker_threads');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const asciidoctor__default = /*#__PURE__*/_interopDefaultCompat(asciidoctor);

function getHeadings(doc) {
  const tocLevels = doc.getAttribute("toclevels", 2);
  return doc.findBy({ context: "section" }, (b) => b.getLevel() > 0 && b.getLevel() <= tocLevels).map((b) => {
    const section = b;
    return {
      text: section.isNumbered() ? `${section.getSectionNumber()} ${section.getName()}` : section.getName(),
      slug: section.getId(),
      depth: section.getLevel()
    };
  });
}
function getIncludes(file, catalog) {
  const includes = [];
  for (let include of catalog.includes.$$keys) {
    if (!include.endsWith(".adoc")) {
      include = `${include}.adoc`;
    }
    const fileUrl = new node_url.URL(include, node_url.pathToFileURL(file));
    const filePath = node_url.fileURLToPath(fileUrl);
    includes.push(filePath);
  }
  return includes;
}
async function loadModule(path, opts) {
  const { default: mod } = await import(path);
  return mod instanceof Function || typeof mod === "function" ? mod.apply(mod, typeof opts === "undefined" ? [] : [opts]) : mod;
}
async function registerHighlighters(registry, highlighters) {
  for await (const [name, f] of Object.entries(highlighters ?? {})) {
    const hl = await loadModule(
      typeof f === "string" ? f : f.path,
      typeof f === "object" ? f.options : undefined
    );
    registry.register(name, hl);
  }
}
async function registerExtensions(registry, extensions) {
  for await (const ext of extensions ?? []) {
    const mod = await loadModule(
      typeof ext === "string" ? ext : ext.path,
      typeof ext === "object" ? ext.options : undefined
    );
    registry.register(mod);
  }
}
async function worker(opts) {
  const converter = asciidoctor__default();
  await registerHighlighters(converter.SyntaxHighlighter, opts?.highlighters);
  await registerExtensions(converter.Extensions, opts?.extensions);
  node_worker_threads.parentPort?.on("message", (data) => {
    const doc = converter.loadFile(data.file, data.options);
    const layout = doc.getAttribute("layout");
    const html = doc.convert({
      standalone: !layout,
      ...data.options
    });
    const result = {
      html,
      layout,
      frontmatter: {
        title: doc.getTitle(),
        asciidoc: doc.getAttributes()
      },
      headings: getHeadings(doc),
      includes: getIncludes(data.file, doc.getCatalog())
    };
    node_worker_threads.parentPort?.postMessage(result);
  });
}
worker(node_worker_threads.workerData);
