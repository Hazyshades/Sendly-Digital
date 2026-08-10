import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [requestedMode = 'legacy', ...playwrightArgs] = process.argv.slice(2);
const modes = requestedMode === 'all' ? ['legacy', 'escrow_v2'] : [requestedMode];
const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));

for (const mode of modes) {
  if (mode !== 'legacy' && mode !== 'escrow_v2') {
    throw new Error(`Unsupported E2E direct-send mode: ${mode}`);
  }

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'test', ...playwrightArgs], {
      stdio: 'inherit',
      env: { ...process.env, E2E_DIRECT_SEND_CLAIM_MODE: mode },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });

  if (exitCode !== 0) process.exit(exitCode);
}
