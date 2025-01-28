import { ProcessorOptions } from '@asciidoctor/core';
import { MarkdownHeading } from 'astro';

interface InitOptions {
    /**
     * Map of syntax highlighters.
     */
    highlighters?: {
        [name: string]: string | {
            /**
             * Import path for the {@link SyntaxHighlighterFunctions}
             * implementation
             */
            path: string;
            /**
             * If default export is a function it will receive these options as
             * an argument.
             */
            options?: any;
        };
    };
    /**
     * Array of Asciidoctor extensions.
     */
    extensions?: (string | {
        /**
         * Import path for the {@link AsciidoctorExtension}
         * implementation
         */
        path: string;
        /**
         * If default export is a function it will receive these options as
         * an argument.
         */
        options?: any;
    })[];
}
interface InputMessage {
    file: string;
    options?: ProcessorOptions;
}
interface OutputMessage {
    html: string;
    layout?: string;
    frontmatter: {
        title?: string;
        asciidoc: Record<string, any>;
    };
    headings: MarkdownHeading[];
    includes: string[];
}

export type { InitOptions, InputMessage, OutputMessage };
