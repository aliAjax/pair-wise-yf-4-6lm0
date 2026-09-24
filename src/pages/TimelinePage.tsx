import { useEffect, useMemo, useState } from 'react'
import { Search, Route, X, Trash2, Clock, MapPin, GitMerge, Undo2, Tags } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import type { WindowScene } from '@/types'

export default function TimelinePage() {
  const {
    routeGroups,
    selectedRoute,
    currentRouteScenes,
    selectRoute,
    loadAll,
    deleteScene,
    mergeRoutes,
    undoLastMerge,
    undoAvailable,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [customTarget, setCustomTarget] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  // 搜索同时匹配主线路名与其下的旧写法
  const filteredGroups = useMemo(() => {
    const kw = search.trim().toLowerCase()
    if (!kw) return routeGroups
    return routeGroups.filter(
      (g) =>
        g.master.toLowerCase().includes(kw) ||
        g.aliases.some((a) => a !== g.master && a.toLowerCase().includes(kw))
    )
  }, [routeGroups, search])

  const selectedGroup = routeGroups.find((g) => g.master === selectedRoute)
  const selectedAliases = selectedGroup?.aliases.filter((a) => a !== selectedRoute) ?? []

  const sorted = useMemo(
    () =>
      [...currentRouteScenes].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [currentRouteScenes]
  )

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  const doMerge = (target: string) => {
    const child = selectedRoute
    const ok = mergeRoutes(child, target.trim())
    if (!ok) {
      setError('无法归并：目标与当前线路相同，或会绕回自身形成循环')
      return
    }
    setMergeOpen(false)
    setCustomTarget('')
    setError('')
    // 归并后当前主线路被并入目标，分组列表里只会剩目标
    selectRoute(target.trim())
    setToast(`已将「${child}」归入「${target.trim()}」`)
  }

  const handleUndo = () => {
    const entry = undoLastMerge()
    if (!entry) return
    setToast(
      entry.previousParent
        ? `已撤销：「${entry.child}」恢复到「${entry.previousParent}」下`
        : `已撤销：「${entry.child}」恢复为独立线路`
    )
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide text-dusk-400">
            窗景时间线
          </h1>
          <button
            onClick={handleUndo}
            disabled={!undoAvailable}
            title={undoAvailable ? '撤销最近一次线路归并' : '暂无可撤销的归并'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              undoAvailable
                ? 'bg-teal-900 text-mist-200 hover:bg-teal-800'
                : 'cursor-not-allowed bg-teal-900/40 text-mist-600'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            撤销归并
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索线路或旧写法..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectRoute('')}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            {filteredGroups.map((group) => (
              <button
                key={group.master}
                onClick={() => selectRoute(group.master)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === group.master
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="mr-1 inline w-3 h-3" />
                {group.master}
                {group.aliases.length > 1 && (
                  <span className="ml-1 opacity-60">+{group.aliases.length - 1}</span>
                )}
                <span className="ml-1 opacity-60">{group.count}</span>
              </button>
            ))}
          </div>

          {selectedGroup && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-800 bg-teal-900/40 px-3.5 py-2.5">
              <button
                onClick={() => setMergeOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-dusk-400/15 px-3 py-1 text-xs text-dusk-300 transition-colors hover:bg-dusk-400/25"
              >
                <GitMerge className="w-3.5 h-3.5" />
                将「{selectedRoute}」归到其他主线路
              </button>
              {selectedAliases.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-mist-400">
                  <Tags className="w-3.5 h-3.5" />
                  已归并的旧写法：
                  {selectedAliases.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-teal-800/60 px-2 py-0.5 text-[11px] text-mist-300"
                    >
                      {a}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {selectedRoute ? '该路线暂无窗景记录' : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {sorted.map((scene) => (
                <div key={scene.id} className="relative flex gap-4">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                  <div className="w-20 shrink-0 pt-0.5 text-right">
                    <p className="text-xs text-dusk-400">
                      {formatTimestamp(scene.timestamp)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-mist-500">
                      {getTimeOfDay(scene.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailScene(scene)}
                    className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getWeatherIcon(scene.weather)}
                      <span className="text-sm font-semibold text-mist-100">
                        {scene.segment}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mb-1.5 text-mist-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{selectedRoute || scene.routeName}</span>
                      {scene.routeName !== selectedRoute && (
                        <span className="rounded bg-teal-800/60 px-1 py-px text-[10px] text-mist-400">
                          原写法：{scene.routeName}
                        </span>
                      )}
                      <span className="mx-1 text-teal-700">·</span>
                      <span className="text-xs">{scene.seatDirection}侧</span>
                    </div>
                    {scene.note && (
                      <p className="text-xs text-mist-400 line-clamp-2">
                        {scene.note}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {getTreeIcon(scene.treeDensity)}
                      {getPedestrianIcon(scene.pedestrianStatus)}
                      {scene.signText && (
                        <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                          {scene.signText}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 归并弹窗 */}
      {mergeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setMergeOpen(false)
            setError('')
          }}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMergeOpen(false)
                setError('')
              }}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-1 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-dusk-400" />
              <h2 className="text-lg font-bold text-dusk-400">归并线路</h2>
            </div>
            <p className="mb-4 text-xs text-mist-400">
              将「{selectedRoute}」及其名下已归并的旧写法，一起归入下面选择的主线路。归并后旧记录仍保留原始站名写法。
            </p>

            <div className="mb-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {routeGroups
                .filter((g) => g.master !== selectedRoute)
                .map((g) => (
                  <button
                    key={g.master}
                    onClick={() => doMerge(g.master)}
                    className="flex w-full items-center justify-between rounded-xl border border-teal-800 bg-teal-900/60 px-3.5 py-2.5 text-left text-sm text-mist-200 transition-colors hover:border-dusk-400/50 hover:bg-teal-800/60"
                  >
                    <span className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-dusk-400" />
                      {g.master}
                      {g.aliases.length > 1 && (
                        <span className="text-[11px] text-mist-500">
                          含 {g.aliases.length - 1} 个旧写法
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-mist-500">{g.count} 条记录</span>
                  </button>
                ))}
              {routeGroups.length <= 1 && (
                <p className="py-2 text-center text-xs text-mist-500">
                  还没有其他主线路，可在下方输入一个主线路名
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customTarget}
                onChange={(e) => {
                  setCustomTarget(e.target.value)
                  setError('')
                }}
                placeholder="或输入主线路名..."
                className="flex-1 rounded-lg border border-teal-700 bg-teal-950/60 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
              />
              <button
                onClick={() => customTarget.trim() && doMerge(customTarget)}
                className="rounded-lg bg-dusk-400 px-4 py-2 text-sm text-teal-950 transition-opacity hover:opacity-90 disabled:opacity-40"
                disabled={!customTarget.trim()}
              >
                归入
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        </div>
      )}

      {/* 轻提示 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-teal-700 bg-teal-900 px-4 py-2 text-xs text-mist-200 shadow-lg md:bottom-8">
          {toast}
        </div>
      )}

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{selectedRoute || detailScene.routeName}</span>
                {detailScene.routeName !== selectedRoute && (
                  <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[11px] text-mist-400">
                    原写法：{detailScene.routeName}
                  </span>
                )}
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
