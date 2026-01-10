// Deno Runtime Wrapper
// Spawns Deno subprocess to run bundle tests
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DenoTestResult {
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

// Check if Deno is available on the system
export async function isDenoAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn('deno', ['--version'], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
    });
}

// Get Deno version
export async function getDenoVersion(): Promise<string | null> {
    return new Promise((resolve) => {
        const proc = spawn('deno', ['--version'], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        let output = '';
        proc.stdout?.on('data', (data) => { output += data.toString(); });
        proc.on('error', () => resolve(null));
        proc.on('close', (code) => {
            if (code === 0) {
                const match = output.match(/deno (\d+\.\d+\.\d+)/);
                resolve(match ? match[1] : output.trim());
            } else {
                resolve(null);
            }
        });
    });
}

export async function runInDeno(bundlePath: string, testCode: string): Promise<DenoTestResult> {
    // Create a temporary file with the test script
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `embedunit-deno-test-${Date.now()}.js`);

    // Read the bundle
    const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

    // Create a Deno-compatible test script
    const denoScript = `
// Bundle code (IIFE that sets globalThis.EmbedUnit)
${bundleCode}

// Test code
async function runTests() {
    try {
        const { describe, it, xit, fit, expect, beforeEach, afterEach, beforeAll, afterAll, resetRegistry, runTests } = EmbedUnit;
        resetRegistry();

        ${testCode}

        const result = await runTests({ silent: true });
        console.log(JSON.stringify(result));
    } catch (e) {
        console.log(JSON.stringify({ error: e.message || String(e) }));
        Deno.exit(1);
    }
}

runTests();
`;

    fs.writeFileSync(tempFile, denoScript, 'utf-8');

    try {
        const result = await runDenoScript(tempFile);
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

function runDenoScript(scriptPath: string): Promise<DenoTestResult> {
    return new Promise((resolve, reject) => {
        const proc = spawn('deno', ['run', '--allow-read', scriptPath], {
            stdio: 'pipe',
            shell: process.platform === 'win32'
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => { stdout += data.toString(); });
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn Deno: ${err.message}`));
        });

        proc.on('close', (code) => {
            if (code !== 0 && !stdout.includes('"summary"')) {
                reject(new Error(`Deno exited with code ${code}: ${stderr || stdout}`));
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

                resolve(parsed as DenoTestResult);
            } catch (e) {
                reject(new Error(`Failed to parse Deno output: ${stdout}`));
            }
        });
    });
}
