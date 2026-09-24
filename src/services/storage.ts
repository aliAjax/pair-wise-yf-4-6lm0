import type { WindowScene, RouteMerges, RouteGroup, MergeHistoryEntry } from '@/types'

const STORAGE_KEY = 'bus_window_scenes'
const MERGES_KEY = 'bus_route_merges'
const MERGE_HISTORY_KEY = 'bus_route_merge_history'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
  } catch {
    return []
  }
}

export function saveScene(scene: WindowScene): void {
  const scenes = getAllScenes()
  scenes.push(scene)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function deleteScene(id: string): void {
  const scenes = getAllScenes().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

/* ---------------- 线路归并关系 ---------------- */

export function getRouteMerges(): RouteMerges {
  try {
    const raw = localStorage.getItem(MERGES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as RouteMerges
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function setRouteMerges(merges: RouteMerges): void {
  localStorage.setItem(MERGES_KEY, JSON.stringify(merges))
}

export function getMergeHistory(): MergeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MERGE_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MergeHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setMergeHistory(history: MergeHistoryEntry[]): void {
  localStorage.setItem(MERGE_HISTORY_KEY, JSON.stringify(history))
}

/**
 * 把线路名解析到根主线路名。
 * 沿父指针向上走；遇到环（数据异常或遗留环）时在重复点截断，保证不无限循环。
 */
export function resolveMaster(name: string, merges: RouteMerges = getRouteMerges()): string {
  let current = name
  const seen = new Set<string>([name])
  for (;;) {
    const parent = merges[current]
    if (!parent || parent === current) return current
    if (seen.has(parent)) return current // 检测到环，停在入环点
    seen.add(parent)
    current = parent
  }
}

/**
 * 把 child 归并到 target 主线路下。
 * - child 与 target 相同（或解析后是同一条主线路）时拒绝
 * - target 若位于 child 子树内会形成环，拒绝
 * 主线路改挂时，其名下已有子线路经父指针传递自动跟随新主线路。
 * 返回 false 表示因自指/成环被拒绝。
 */
export function mergeRoutes(child: string, target: string): boolean {
  const merges = getRouteMerges()
  const trimmedChild = child.trim()
  const trimmedTarget = target.trim()
  if (!trimmedChild || !trimmedTarget || trimmedChild === trimmedTarget) return false
  if (resolveMaster(trimmedChild, merges) === resolveMaster(trimmedTarget, merges)) return false

  // 环检测：沿 target 的父链向上，若能走到 child 则 target 是 child 的后代，禁止
  let ancestor: string | undefined = trimmedTarget
  const guard = new Set<string>()
  while (ancestor !== undefined) {
    if (ancestor === trimmedChild) return false
    if (guard.has(ancestor)) break // 已有数据环，交给 resolveMaster 兜底
    guard.add(ancestor)
    ancestor = merges[ancestor]
  }

  const history = getMergeHistory()
  history.push({
    child: trimmedChild,
    previousParent: merges[trimmedChild],
    timestamp: new Date().toISOString(),
  })
  setMergeHistory(history)

  merges[trimmedChild] = trimmedTarget
  setRouteMerges(merges)
  return true
}

/**
 * 撤销最近一次归并，恢复归并前的分组。
 * 只回退最后一条指针改动（含改挂），没有历史时返回 null；
 * 返回被恢复的那条记录用于界面提示。
 */
export function undoLastMerge(): MergeHistoryEntry | null {
  const history = getMergeHistory()
  const last = history.pop()
  if (!last) return null

  const merges = getRouteMerges()
  if (last.previousParent === undefined) {
    delete merges[last.child]
  } else {
    merges[last.child] = last.previousParent
  }
  setRouteMerges(merges)
  setMergeHistory(history)
  return last
}

/** 是否还有可撤销的归并 */
export function canUndoMerge(): boolean {
  return getMergeHistory().length > 0
}

/* ---------------- 按主线路查询 ---------------- */

/** 取某条主线路下的全部记录（原始 routeName 保持不变），按时间倒序 */
export function getScenesByRoute(masterName: string): WindowScene[] {
  const merges = getRouteMerges()
  return getAllScenes()
    .filter((s) => resolveMaster(s.routeName, merges) === masterName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * 主线路分组列表，按组内最新记录时间倒序（与时间线观感一致）。
 */
export function getRouteGroups(): RouteGroup[] {
  const scenes = getAllScenes()
  const merges = getRouteMerges()

  const aliasSet = new Map<string, Set<string>>()
  const latestAt = new Map<string, number>()
  const ensure = (master: string) => {
    let set = aliasSet.get(master)
    if (!set) {
      set = new Set<string>()
      aliasSet.set(master, set)
    }
    return set
  }

  for (const scene of scenes) {
    const master = resolveMaster(scene.routeName, merges)
    ensure(master).add(scene.routeName)
    const t = new Date(scene.timestamp).getTime()
    latestAt.set(master, Math.max(latestAt.get(master) ?? 0, t))
  }

  return Array.from(aliasSet.entries())
    .map(([master, aliases]) => ({
      master,
      aliases: Array.from(aliases).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
      count: scenes.filter((s) => resolveMaster(s.routeName, merges) === master).length,
    }))
    .sort(
      (a, b) =>
        (latestAt.get(b.master) ?? 0) - (latestAt.get(a.master) ?? 0) ||
        a.master.localeCompare(b.master, 'zh-Hans-CN')
    )
}

/** 兼容旧调用方：返回所有主线路名 */
export function getAllRouteNames(): string[] {
  return getRouteGroups().map((g) => g.master)
}

/** 全部出现过的原始写法（含别名），用于记录页输入联想 */
export function getAllRawRouteNames(): string[] {
  return Array.from(new Set(getAllScenes().map((s) => s.routeName))).sort((a, b) =>
    a.localeCompare(b, 'zh-Hans-CN')
  )
}

/** 主线路 -> 组内别名映射的便捷查询 */
export function getAliasesOf(masterName: string): string[] {
  return getRouteGroups().find((g) => g.master === masterName)?.aliases ?? [masterName]
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}
