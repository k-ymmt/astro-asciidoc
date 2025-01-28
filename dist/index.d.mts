import { ProcessorOptions } from '@asciidoctor/core';
import { AstroIntegration } from 'astro';
import { InitOptions } from './worker.mjs';

/**
 * Options for AsciiDoc conversion.
 */
interface Options extends InitOptions {
    /**
     * Options passed to Asciidoctor document load and document convert.
     */
    options?: ProcessorOptions;
}
declare function asciidoc(opts?: Options): AstroIntegration;

export { type Options, asciidoc as default };
