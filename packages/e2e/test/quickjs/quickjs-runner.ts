// QuickJS Runtime Wrapper
// Spawns native QuickJS (qjs) subprocess to run bundle tests
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface QuickJSTestResult {
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
    };
    failures?: Array<{
        suite: string;
        test: string;
        error: string;
    }>;
}

// Check if native QuickJS (qjs) is available on the system
export async function isQuickJSAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn('qjs', ['--help'], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
    });
}

// Get QuickJS version
export async function getQuickJSVersion(): Promise<string | null> {
    return new Promise((resolve) => {
        const proc = spawn('qjs', ['--help'], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        let output = '';
        proc.stdout?.on('data', (data) => { output += data.toString(); });
        proc.stderr?.on('data', (data) => { output += data.toString(); });
        proc.on('error', () => resolve(null));
        proc.on('close', (code) => {
            if (code === 0) {
                // QuickJS doesn't have --version, extract from help output
                const match = output.match(/version\s+(\d[\d.-]+)/i);
                resolve(match ? match[1] : 'unknown');
            } else {
                resolve(null);
            }
        });
    });
}

export async function runInQuickJS(bundlePath: string, testCode: string): Promise<QuickJSTestResult> {
    // Create a temporary file with the test script
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `embedunit-quickjs-test-${Date.now()}.js`);

    // Read the bundle
    const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

    // Create a QuickJS-compatible test script
    // QuickJS has globalThis, but needs std module for print
    const qjsScript = `
// Polyfill performance.now if not available
if (typeof performance === 'undefined') {
    globalThis.performance = {
        now: function() { return Date.now(); }
    };
}

// Bundle code (IIFE that sets globalThis.EmbedUnit)
${bundleCode}

// Test code
async function runTests() {
    try {
        const { describe, it, xit, fit, expect, beforeEach, afterEach, beforeAll, afterAll, resetRegistry, runTests } = EmbedUnit;
        resetRegistry();

        ${testCode}

        const result = await runTests({ silent: true });
        print(JSON.stringify(result));
    } catch (e) {
        print(JSON.stringify({ error: e.message || String(e) }));
        std.exit(1);
    }
}

runTests();
`;

    fs.writeFileSync(tempFile, qjsScript, 'utf-8');

    try {
        const result = await runQJSScript(tempFile);
        return result;
    } finally {
        // Clean up temp file
        try {
            fs.unlinkSync(tempFile);
        } catch {
            // Ignore cleanup errors
        }
    }
}

function runQJSScript(scriptPath: string): Promise<QuickJSTestResult> {
    return new Promise((resolve, reject) => {
        // Use --std to enable std module for std.exit()
        const proc = spawn('qjs', ['--std', scriptPath], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => { stdout += data.toString(); });
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn QuickJS: ${err.message}`));
        });

        proc.on('close', (code) => {
            if (code !== 0 && !stdout.includes('"summary"')) {
                reject(new Error(`QuickJS exited with code ${code}: ${stderr || stdout}`));
                return;
            }

            try {
                // Find the JSON output (last line that looks like JSON)
                const lines = stdout.trim().split('\n');
                let jsonLine = '';
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].startsWith('{')) {
                        jsonLine = lines[i];
                        break;
                    }
                }

                if (!jsonLine) {
                    reject(new Error(`No JSON output found: ${stdout}`));
                    return;
                }

                const parsed = JSON.parse(jsonLine);
                if (parsed.error) {
                    reject(new Error(parsed.error));
                    return;
                }

                resolve(parsed as QuickJSTestResult);
            } catch (e) {
                reject(new Error(`Failed to parse QuickJS output: ${stdout}`));
            }
        });
    });
}
