import {
  loadSettingsImport,
  pickSettingsFile,
  runImportAction,
} from './importSettings';

describe('importSettings', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves cancel to null and enables the import button again', async () => {
    const button = {
      disabled: false,
      setDisabled(disabled: boolean) {
        this.disabled = disabled;
      },
    };

    const pending = runImportAction(
      disabled => button.setDisabled(disabled),
      () => pickSettingsFile(document, window)
    );
    expect(button.disabled).toBe(true);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    input?.dispatchEvent(new Event('cancel'));

    await expect(pending).resolves.toBeNull();
    expect(button.disabled).toBe(false);
  });

  it('reports invalid JSON and leaves settings unchanged', async () => {
    const settings = { periodicMovementInterval: 5 };
    const errors: string[] = [];

    const result = await loadSettingsImport('{', async () => {
      settings.periodicMovementInterval = 99;
    });

    if (result.error) {
      errors.push(result.error);
    }

    expect(result.applied).toBe(false);
    expect(errors[0]).toMatch(/valid JSON/i);
    expect(settings.periodicMovementInterval).toBe(5);
  });
});
