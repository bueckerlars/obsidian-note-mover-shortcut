import * as v from 'valibot';
import { PluginDataRootSchema } from '../infrastructure/persistence/plugin-settings-schema';

export function pickSettingsFile(
  doc: Document,
  view: Window
): Promise<File | null> {
  const input = doc.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.className = 'advancedNoteMover-hidden-file-input';
  doc.body.append(input);

  return new Promise(resolve => {
    let settled = false;
    let focusTimer: ReturnType<Window['setTimeout']> | null = null;
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (focusTimer !== null) {
        view.clearTimeout(focusTimer);
      }
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener('cancel', () => {
      finish(null);
    });
    view.addEventListener(
      'focus',
      () => {
        focusTimer = view.setTimeout(() => {
          if (!input.isConnected || (input.files && input.files.length > 0)) {
            return;
          }
          finish(null);
        }, 300);
      },
      { once: true }
    );
    input.click();
  });
}

export function parseSettingsImport(
  text: string
): { ok: true; value: unknown } | { ok: false; message: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: 'Invalid file format. Please select a valid JSON file.',
    };
  }

  const parsed = v.safeParse(PluginDataRootSchema, data);
  if (!parsed.success) {
    const detail =
      parsed.issues[0]?.message ?? 'The file is not settings JSON.';
    return {
      ok: false,
      message: `Settings validation failed: ${detail}`,
    };
  }
  return { ok: true, value: parsed.output };
}

export async function loadSettingsImport(
  text: string,
  apply: (data: unknown) => Promise<void>
): Promise<{ applied: boolean; error: string | null }> {
  const parsed = parseSettingsImport(text);
  if (!parsed.ok) {
    return { applied: false, error: parsed.message };
  }
  await apply(parsed.value);
  return { applied: true, error: null };
}

export async function runImportAction<T>(
  setDisabled: (disabled: boolean) => void,
  action: () => Promise<T>
): Promise<T> {
  setDisabled(true);
  try {
    return await action();
  } finally {
    setDisabled(false);
  }
}
