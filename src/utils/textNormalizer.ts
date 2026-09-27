export function normalizeQuestion(value: string) {
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[!?！？]{2,}/g, (marks) => marks[0])
    .replace(/[“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
