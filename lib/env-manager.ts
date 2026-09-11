import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env');
const ENV_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

/**
 * Read the raw content of .env or fallback to .env.example
 */
export function getEnvRaw(): string {
  try {
    if (fs.existsSync(ENV_PATH)) {
      return fs.readFileSync(ENV_PATH, 'utf-8');
    }
    if (fs.existsSync(ENV_EXAMPLE_PATH)) {
      return fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    }
  } catch (err) {
    console.error('[env-manager] Error reading .env:', err);
  }
  return '';
}

/**
 * Parse .env file into key-value pairs
 */
export function parseEnv(): Record<string, string> {
  const content = getEnvRaw();
  const envMap: Record<string, string> = {};

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envMap[key] = value;
  }

  return envMap;
}

/**
 * Get sanitized env variables (masking sensitive secrets for UI display)
 */
export function getSanitizedEnv(): Record<string, { value: string; isSecret: boolean }> {
  const envMap = parseEnv();
  const secretKeywords = ['SECRET', 'PASSWORD', 'PASS', 'TOKEN', 'KEY', 'AUTH_TOKEN', 'SID'];

  const result: Record<string, { value: string; isSecret: boolean }> = {};

  for (const [k, v] of Object.entries(envMap)) {
    const isSecret = secretKeywords.some((keyword) => k.toUpperCase().includes(keyword));
    let displayValue = v;

    if (isSecret && v.length > 0) {
      if (v.length > 8) {
        displayValue = `${v.slice(0, 3)}••••••••${v.slice(-3)}`;
      } else {
        displayValue = '••••••••';
      }
    }

    result[k] = {
      value: displayValue,
      isSecret,
    };
  }

  return result;
}

/**
 * Update one or multiple variables in .env file, preserving layout, comments, and structure.
 */
export function updateEnvFile(updates: Record<string, string | number | boolean | null | undefined>): boolean {
  try {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    } else if (fs.existsSync(ENV_EXAMPLE_PATH)) {
      content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    }

    const lines = content.split('\n');
    const remainingUpdates = { ...updates };

    const updatedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return line;

      const key = trimmed.slice(0, eqIndex).trim();
      if (key in remainingUpdates) {
        const rawVal = remainingUpdates[key];
        delete remainingUpdates[key];

        if (rawVal === undefined || rawVal === null) {
          return line;
        }

        // Format value: quote strings if they contain spaces or special chars
        const strVal = String(rawVal);
        const formattedVal =
          typeof rawVal === 'number' || typeof rawVal === 'boolean'
            ? strVal
            : `"${strVal.replace(/"/g, '\\"')}"`;

        return `${key}=${formattedVal}`;
      }

      return line;
    });

    // Append any new keys that were not found in the original file
    for (const [k, v] of Object.entries(remainingUpdates)) {
      if (v === undefined || v === null) continue;
      const strVal = String(v);
      const formattedVal =
        typeof v === 'number' || typeof v === 'boolean' ? strVal : `"${strVal.replace(/"/g, '\\"')}"`;
      updatedLines.push(`${k}=${formattedVal}`);
    }

    fs.writeFileSync(ENV_PATH, updatedLines.join('\n'), 'utf-8');
    console.log(`[env-manager] Updated ${Object.keys(updates).length} variables in .env`);
    return true;
  } catch (err) {
    console.error('[env-manager] Failed to update .env:', err);
    return false;
  }
}
