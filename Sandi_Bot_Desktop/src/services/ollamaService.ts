/**
 * Ollama access for Coach Bot. All generation goes through
 * invoke('ollama_generate') (Rust proxy), never fetch() to localhost.
 */

export const OLLAMA_NOT_READY_USER_MESSAGE =
  'AI engine needs a moment.\nClick AI Ready and try again.';

export async function checkOllamaHealth(): Promise<boolean> {
  const { invoke } = await import(
    '@tauri-apps/api/core'
  );
  try {
    await Promise.race([
      invoke<string>('ollama_generate', {
        model: 'qwen2.5:7b',
        prompt: 'ping',
        system: '',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('timeout')),
          5000
        )
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function withOllamaCheck<T>(
  operation: () => Promise<T>,
  onNotReady: () => void
): Promise<T | null> {
  const healthy = await checkOllamaHealth();
  if (!healthy) {
    onNotReady();
    return null;
  }
  try {
    return await operation();
  } catch {
    onNotReady();
    return null;
  }
}

export async function callOllama(
  prompt: string,
  model: string = 'qwen2.5:7b-instruct-q4_k_m'
): Promise<string> {
  const result = await withOllamaCheck(
    async () => {
      const { invoke } = await import(
        '@tauri-apps/api/core'
      );
      console.log('[OLLAMA] calling via Rust proxy');
      console.log('[OLLAMA] model:', model);
      console.log(
        '[OLLAMA] prompt length:',
        prompt.length
      );

      const response = await invoke<string>(
        'ollama_generate',
        { model, prompt, system: '' }
      );

      console.log(
        '[OLLAMA] response length:',
        response?.length
      );
      return response;
    },
    () => {}
  );

  if (result === null) {
    throw new Error(OLLAMA_NOT_READY_USER_MESSAGE);
  }
  return result;
}

export async function isOllamaRunning():
  Promise<boolean> {
  const { invoke } = await import(
    '@tauri-apps/api/core'
  );
  try {
    return await invoke<boolean>(
      'check_ollama_status'
    );
  } catch {
    return false;
  }
}
