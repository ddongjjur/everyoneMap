const JOSA_MAP: Record<string, [string, string]> = {
  "이/가": ["이", "가"],
  "을/를": ["을", "를"],
  "은/는": ["은", "는"],
  "과/와": ["과", "와"],
};

function hasBatchim(char: string): boolean {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function withJosa(word: string, josa: string): string {
  if (!word) return word;
  const pair = JOSA_MAP[josa];
  if (!pair) return `${word}${josa}`;
  const lastChar = word[word.length - 1];
  return `${word}${hasBatchim(lastChar) ? pair[0] : pair[1]}`;
}
