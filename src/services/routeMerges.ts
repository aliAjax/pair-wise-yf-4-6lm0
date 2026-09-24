import type { RouteMerge } from '@/types'

const MERGE_STORAGE_KEY = 'bus_route_merges'

export function getMerges(): RouteMerge[] {
  try {
    const raw = localStorage.getItem(MERGE_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RouteMerge[]
  } catch {
    return []
  }
}

function saveMerges(merges: RouteMerge[]): void {
  localStorage.setItem(MERGE_STORAGE_KEY, JSON.stringify(merges))
}

/** 按记录顺序构建 别名→目标 映射，同一线路后写的归并覆盖先写的 */
export function buildMergeMap(merges: RouteMerge[] = getMerges()): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of merges) map.set(m.alias, m.target)
  return map
}

/** 沿归并链解析出最终主线路名；只用于展示归组，记录里的原写法不动 */
export function resolveRouteName(
  name: string,
  map: Map<string, string> = buildMergeMap()
): string {
  let current = name
  const seen = new Set<string>([name])
  while (map.has(current)) {
    const next = map.get(current)!
    if (seen.has(next)) return current // 防御：数据异常成环时停住
    seen.add(next)
    current = next
  }
  return current
}

export type MergeResult = { ok: true; merge: RouteMerge } | { ok: false; error: string }

export function addMerge(alias: string, target: string): MergeResult {
  const from = alias.trim()
  const to = target.trim()
  if (!from) return { ok: false, error: '请先选择要归并的线路' }
  if (!to) return { ok: false, error: '请选择要归并到的主线路' }
  if (from === to) return { ok: false, error: '不能归并到自己' }

  const merges = getMerges()
  const map = buildMergeMap(merges)
  const resolvedTarget = resolveRouteName(to, map)
  if (resolvedTarget === from) {
    return { ok: false, error: `「${to}」已归并到当前线路，不能绕回自己` }
  }

  const merge: RouteMerge = {
    id: crypto.randomUUID(),
    alias: from,
    target: resolvedTarget,
    createdAt: new Date().toISOString(),
  }
  saveMerges([...merges, merge])
  return { ok: true, merge }
}

export function removeLastMerge(): RouteMerge | null {
  const merges = getMerges()
  if (merges.length === 0) return null
  const removed = merges[merges.length - 1]
  saveMerges(merges.slice(0, -1))
  return removed
}
