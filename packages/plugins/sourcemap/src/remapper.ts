import {RawSourceMap, SourceMapConsumer} from 'source-map-js';
import type { Frame } from '@embedunit/core';

// Cache for loaded SourceMapConsumer instances
const consumerCache = new Map<string, SourceMapConsumer>();
const SOURCE_MAP_CACHE_LIMIT = 100;
const SOURCE_MAP_FETCH_TIMEOUT_MS = 30000;

/**
 * Clear the source map cache. Useful for testing.
 */
export function clearSourceMapCache(): void {
    consumerCache.clear();
}

/**
 * Fetch and parse a source map for a given URL
 * @param mapUrl URL of the .map file
 */
async function loadSourceMap(mapUrl: string): Promise<SourceMapConsumer> {
    if (consumerCache.has(mapUrl)) {
        return consumerCache.get(mapUrl)!;
    }

    // Check if fetch is available (not present in QuickJS, some game engines, etc.)
    if (typeof fetch !== 'function') {
        throw new Error('fetch is not available in this environment');
    }

    // Set up abort controller for timeout
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), SOURCE_MAP_FETCH_TIMEOUT_MS)
        : null;

    try {
        const response = await fetch(mapUrl, controller ? { signal: controller.signal } : undefined);
        if (!response.ok) {
            throw new Error(`Failed to load source map: ${mapUrl} (status ${response.status})`);
        }

        const rawMap: string = await response.text();
        const consumer = new SourceMapConsumer(JSON.parse(rawMap) as RawSourceMap);

        // Enforce cache size limit by removing oldest entry if at capacity
        if (consumerCache.size >= SOURCE_MAP_CACHE_LIMIT) {
            const oldestKey = consumerCache.keys().next().value;
            if (oldestKey !== undefined) {
                consumerCache.delete(oldestKey);
            }
        }

        consumerCache.set(mapUrl, consumer);
        return consumer;
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Remap a generated frame position back to its original source, with safe fallback
 * @param frame generated code frame
 */
export async function remapPosition(frame: Frame): Promise<Frame> {
    try {
        const mapUrl = `${frame.source}.map`;
        const consumer = await loadSourceMap(mapUrl);
        const orig = consumer.originalPositionFor({line: frame.line, column: frame.column});

        return {
            source: orig.source || frame.source,
            line: orig.line || frame.line,
            column: orig.column || frame.column,
            name: orig.name || frame.name
        };
    } catch {
        // On any error (fetch fail, parse fail, missing source map), return original frame
        return {...frame};
    }
}

/**
 * Parse and remap a browser Error.stack string
 * @param stackStr original stack string
 */
export async function remapBrowserStack(stackStr: string): Promise<string> {
    const lines = stackStr.split('\n');
    const mappedLines = await Promise.all(
        lines.map(async line => {
            const regex = /^\s*at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/;
            const match = line.match(regex);
            if (!match) return line;
            const [, fnName, url, rawLine, rawCol] = match;
            const frame: Frame = {source: url, line: parseInt(rawLine, 10), column: parseInt(rawCol, 10), name: fnName};
            const remapped = await remapPosition(frame);
            return `    at ${remapped.name || fnName} (${remapped.source}:${remapped.line}:${remapped.column})`;
        })
    );
    return mappedLines.join('\n');
}
