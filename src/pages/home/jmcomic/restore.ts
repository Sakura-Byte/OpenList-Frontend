export function restoreMoves(height: number, segments: number) {
  if (segments <= 1) return [{ source: 0, target: 0, height }]
  const base = Math.floor(height / segments)
  const remainder = height % segments
  return Array.from({ length: segments }, (_, i) => ({
    source: height - base * (i + 1) - remainder,
    target: base * i + (i === 0 ? 0 : remainder),
    height: base + (i === 0 ? remainder : 0),
  }))
}
