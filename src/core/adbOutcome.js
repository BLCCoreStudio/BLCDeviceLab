function outputOf(result = {}) {
  return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
}

function failureText(text) {
  return /(?:^|\b)(?:failed|failure|unable|cannot|refused|timed out|no route)(?:\b|:)/i.test(text);
}

export function interpretConnectResult(result = {}) {
  const message = outputOf(result);
  if (result.code !== 0 || failureText(message)) {
    return { ok: false, message: message || `adb connect exited with ${result.code}.` };
  }
  if (/\b(?:connected to|already connected to)\b/i.test(message)) {
    return { ok: true, message };
  }
  return { ok: false, message: message || 'ADB did not confirm the wireless connection.' };
}

export function interpretPairResult(result = {}) {
  const message = outputOf(result);
  if (result.code !== 0 || failureText(message)) {
    return { ok: false, message: message || `adb pair exited with ${result.code}.` };
  }
  if (/\b(?:successfully paired to|already paired)\b/i.test(message)) {
    return { ok: true, message };
  }
  return { ok: false, message: message || 'ADB did not confirm pairing.' };
}
