// Represents a stack frame position
export interface Frame {
    source: string;
    line: number;
    column: number;
    name?: string | null;
}

// Pluggable frame remapper hook
let frameRemapper: ((frame: Frame) => Promise<Frame>) | null = null;

/**
 * Set a custom error remapper function for source map support.
 * This is typically called by @embedunit/plugins-sourcemap on import.
 * @param remapper Function that remaps a frame to its original source position
 */
export function setErrorRemapper(remapper: (frame: Frame) => Promise<Frame>): void {
    frameRemapper = remapper;
}

/**
 * Unset the error remapper, reverting to default (no-op) behavior.
 */
export function unsetErrorRemapper(): void {
    frameRemapper = null;
}

/**
 * Get the currently registered error remapper, if any.
 */
export function getErrorRemapper(): ((frame: Frame) => Promise<Frame>) | null {
    return frameRemapper;
}

// Default no-op remapper (returns frame unchanged)
async function defaultRemapper(frame: Frame): Promise<Frame> {
    return { ...frame };
}

/**
 * @deprecated remapPosition has moved to @embedunit/plugins-sourcemap.
 * Import that package to enable source map support, or import { remapPosition } from '@embedunit/plugins-sourcemap' for direct usage.
 */
export function remapPosition(): never {
    throw new Error(
        'remapPosition has moved to @embedunit/plugins-sourcemap. ' +
        'Import that package to enable source map support.'
    );
}

/**
 * @deprecated remapBrowserStack has moved to @embedunit/plugins-sourcemap.
 * Import that package to enable source map support, or import { remapBrowserStack } from '@embedunit/plugins-sourcemap' for direct usage.
 */
export function remapBrowserStack(): never {
    throw new Error(
        'remapBrowserStack has moved to @embedunit/plugins-sourcemap. ' +
        'Import that package to enable source map support.'
    );
}

export interface SafeError {
    name?: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string[];
}

/**
 * Parses any thrown value and returns a structured SafeError,
 * remapping frames via source maps if a remapper is registered.
 */
export async function parseError(e: unknown): Promise<SafeError> {
    const remapper = frameRemapper || defaultRemapper;

    try {
        if (e instanceof Error) {
            const {name, message, stack} = e;
            const lines = stack ? stack.split('\n').map(l => l.trim()) : [];
            type StackFrame = { file: string; line: number; column: number; isTestFile: boolean };
            const frames: StackFrame[] = [];
            const formattedLines = [];
            for (const rawLine of lines) {
                const regex = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/;
                const match = rawLine.match(regex);
                if (!match) {
                    formattedLines.push(rawLine);
                    continue;
                }
                const [, fn, file, rawLineNum, rawColNum] = match;
                const genFrame = {source: file, line: +rawLineNum, column: +rawColNum, name: fn};
                const remapped = await remapper(genFrame);
                const isTestFile = /\.test\.(js|ts)x?$/.test(remapped.source);
                frames.push({file: remapped.source, line: remapped.line, column: remapped.column, isTestFile});
                formattedLines.push(
                    `    at ${remapped.name || fn} (${remapped.source}:${remapped.line}:${remapped.column})`
                )
            }

            // Prefer test file frames first
            frames.sort((a, b) => (b.isTestFile ? 1 : 0) - (a.isTestFile ? 1 : 0));
            const best = frames[0];
            if (best) {
                return {
                    name,
                    message,
                    file: best.file,
                    line: best.line,
                    column: best.column,
                    stack: formattedLines
                };
            }
            return {name, message, stack: lines};
        }
        return {message: String(e)};
    } catch {
        return {message: `Unknown error (${String(e)})`};
    }
}
