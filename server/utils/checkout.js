export function aggregateCartLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return []

  const quantities = new Map()
  for (const line of lines) {
    const id = String(line?.id || '').trim()
    const quantity = Number(line?.quantity)
    if (!id || !Number.isInteger(quantity) || quantity < 1) return []
    quantities.set(id, (quantities.get(id) || 0) + quantity)
  }

  return [...quantities]
    .map(([id, quantity]) => ({ id, quantity }))
    .sort((left, right) => left.id.localeCompare(right.id))
}
