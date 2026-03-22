export async function callOllama(
  prompt: string,
  model: string = 'qwen2.5:7b-instruct-q4_k_m'
): Promise<string> {
  const { invoke } = await import(
    '@tauri-apps/api/core'
  );
  console.log('[OLLAMA] calling via Rust proxy');
  console.log('[OLLAMA] model:', model);
  console.log('[OLLAMA] prompt length:', prompt.length);

  const response = await invoke<string>(
    'ollama_generate',
    { model, prompt }
  );

  console.log('[OLLAMA] response length:',
    response?.length);
  return response;
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
