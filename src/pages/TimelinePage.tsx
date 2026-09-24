import { useEffect, useMemo, useState } from 'react'
import { Search, Route, X, Trash2, Clock, MapPin, Merge, Undo2 } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { buildMergeMap, resolveRouteName } from '@/services/routeMerges'
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
    routeNames,
    selectedRoute,
    currentRouteScenes,
    selectRoute,
    loadAll,
    deleteScene,
    merges,
    mergeRoute,
    undoLastMerge,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergeError, setMergeError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const mergeMap = useMemo(() => buildMergeMap(merges), [merges])
  const mainNameOf = (name: string) => resolveRouteName(name, mergeMap)

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const mergeCandidates = routeNames.filter((r) => r !== selectedRoute)

  const sorted = [...currentRouteScenes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  const openMergeModal = () => {
    setMergeTarget('')
    setMergeError('')
    setMergeOpen(true)
  }

  const handleMergeConfirm = () => {
    const result = mergeRoute(mergeTarget)
    if (result.ok === false) {
      setMergeError(result.error)
      return
    }
    setMergeOpen(false)
    setToast(`已归并:「${result.merge.alias}」→「${result.merge.target}」`)
  }

  const handleUndoMerge = () => {
    const removed = undoLastMerge()
    if (removed) setToast(`已撤销归并，恢复「${removed.alias}」的分组`)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索路线..."
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
            {filteredRoutes.map((name) => (
              <button
                key={name}
                onClick={() => selectRoute(name)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === name
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="mr-1 inline w-3 h-3" />
                {name}
              </button>
            ))}
          </div>
          {(selectedRoute || merges.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedRoute && (
                <button
                  onClick={openMergeModal}
                  className="flex items-center gap-1 rounded-full bg-teal-900 px-3 py-1.5 text-xs text-mist-300 transition-colors hover:bg-teal-800"
                >
                  <Merge className="w-3 h-3" />
                  将「{selectedRoute}」归并到其他线路
                </button>
              )}
              {merges.length > 0 && (
                <button
                  onClick={handleUndoMerge}
                  className="flex items-center gap-1 rounded-full bg-teal-900 px-3 py-1.5 text-xs text-mist-300 transition-colors hover:bg-teal-800"
                >
                  <Undo2 className="w-3 h-3" />
                  撤销最近归并（{merges.length}）
                </button>
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
                    <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{mainNameOf(scene.routeName)}</span>
                      {mainNameOf(scene.routeName) !== scene.routeName && (
                        <span className="text-[10px] text-mist-500">
                          原:{scene.routeName}
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
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{mainNameOf(detailScene.routeName)}</span>
                {mainNameOf(detailScene.routeName) !== detailScene.routeName && (
                  <span className="text-xs text-mist-500">
                    原记录:{detailScene.routeName}
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

      {mergeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setMergeOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMergeOpen(false)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="mb-2 text-lg font-bold text-dusk-400">归并线路</h2>
            <p className="mb-4 text-xs leading-relaxed text-mist-400">
              将「{selectedRoute}」归并到另一条主线路。归并后筛选、详情与灵感都按主线路展示，记录里的原写法会保留，之后用旧写法记录也会自动归入。
            </p>

            <label className="mb-1 block text-xs text-mist-300">归并到主线路</label>
            <input
              list="merge-candidates"
              value={mergeTarget}
              onChange={(e) => {
                setMergeTarget(e.target.value)
                setMergeError('')
              }}
              placeholder="选择或输入主线路名称"
              className="w-full rounded-lg border border-teal-800 bg-teal-950/60 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
            <datalist id="merge-candidates">
              {mergeCandidates.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {mergeError && <p className="mt-2 text-xs text-red-300">{mergeError}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setMergeOpen(false)}
                className="flex-1 rounded-lg bg-teal-800/60 py-2.5 text-sm text-mist-300 transition-colors hover:bg-teal-800"
              >
                取消
              </button>
              <button
                onClick={handleMergeConfirm}
                className="flex-1 rounded-lg bg-dusk-400 py-2.5 text-sm font-medium text-teal-950 transition-colors hover:bg-dusk-300"
              >
                确认归并
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-dusk-400/40 bg-teal-900 px-4 py-2 text-xs text-mist-100 shadow-lg shadow-black/30">
          {toast}
        </div>
      )}
    </div>
  )
}
