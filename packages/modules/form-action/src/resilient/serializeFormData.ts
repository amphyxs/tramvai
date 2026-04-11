export function serializeFormData(formData: FormData): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      entries.push([key, value]);
    }
    // Blob/File entries are skipped — keepalive fetch has 64KB limit,
    // and file uploads are not suitable for offline queuing
  });

  return entries;
}

export function deserializeToBody(entries: Array<[string, string]>): string {
  const obj: Record<string, string> = {};
  for (const [key, value] of entries) {
    obj[key] = value;
  }
  return JSON.stringify(obj);
}
