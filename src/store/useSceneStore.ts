import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteMerge } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'
import {
  getMerges,
  addMerge,
  removeLastMerge,
  resolveRouteName,
  type MergeResult,
} from '@/services/routeMerges'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  merges: RouteMerge[]

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
  mergeRoute: (target: string) => MergeResult
  undoLastMerge: () => RouteMerge | null
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,
  merges: [],

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const merges = getMerges()
    set({ scenes, routeNames, merges })
  },

  saveScene: (data: SceneFormData) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => {
      const currentRouteScenes =
        state.selectedRoute ? getScenesByRoute(state.selectedRoute) : []
      return { scenes, routeNames, currentRouteScenes }
    })
  },

  deleteScene: (id: string) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    set((state) => {
      const currentRouteScenes =
        state.selectedRoute ? getScenesByRoute(state.selectedRoute) : []
      return { scenes, routeNames, currentRouteScenes }
    })
  },

  selectRoute: (routeName: string) => {
    const resolved = routeName ? resolveRouteName(routeName) : ''
    const currentRouteScenes = resolved ? getScenesByRoute(resolved) : []
    set({ selectedRoute: resolved, currentRouteScenes })
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },

  mergeRoute: (target: string) => {
    const { selectedRoute } = get()
    const result = addMerge(selectedRoute, target)
    if (result.ok === false) return result
    const merges = getMerges()
    const routeNames = getAllRouteNames()
    // 归并后当前线路并入主线路，选中态跟随到主线路
    const resolved = resolveRouteName(selectedRoute)
    set({
      merges,
      routeNames,
      selectedRoute: resolved,
      currentRouteScenes: resolved ? getScenesByRoute(resolved) : [],
    })
    return result
  },

  undoLastMerge: () => {
    const removed = removeLastMerge()
    if (!removed) return null
    const merges = getMerges()
    const routeNames = getAllRouteNames()
    set((state) => {
      // 撤销后优先展示被恢复出来的分组；不存在则保留仍有效的选中线路
      const restored = resolveRouteName(removed.alias)
      let selectedRoute = routeNames.includes(restored) ? restored : ''
      if (!selectedRoute && routeNames.includes(state.selectedRoute)) {
        selectedRoute = state.selectedRoute
      }
      return {
        merges,
        routeNames,
        selectedRoute,
        currentRouteScenes: selectedRoute ? getScenesByRoute(selectedRoute) : [],
      }
    })
    return removed
  },
}))
