/**
 * Diff de líneas simple (LCS) para snippets .stones.
 * @returns {{ type: 'same'|'add'|'del', text: string }[]}
 */
export function diffLines(beforeText, afterText) {
  const a = String(beforeText || "").replace(/\r\n/g, "\n").split("\n");
  const b = String(afterText || "").replace(/\r\n/g, "\n").split("\n");

  // Trim trailing empty lines for cleaner compare
  while (a.length && a[a.length - 1] === "") a.pop();
  while (b.length && b[b.length - 1] === "") b.pop();

  const n = a.length;
  const m = b.length;
  // LCS DP — OK for stone/task snippets (usually < 80 lines)
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      out.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    out.push({ type: "del", text: a[i++] });
  }
  while (j < m) {
    out.push({ type: "add", text: b[j++] });
  }
  return out;
}

/** true si hay al menos una línea add/del */
export function hasLineChanges(beforeText, afterText) {
  if (normBlock(beforeText) === normBlock(afterText)) return false;
  return diffLines(beforeText, afterText).some((l) => l.type !== "same");
}

function normBlock(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
