import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteGroup, MergeHistoryEntry } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getRouteGroups,
  getAllRawRouteNames,
  getRandomScene,
  mergeRoutes as storageMergeRoutes,
  undoLastMerge as storageUndoLastMerge,
  canUndoMerge,
} from '@/services/storage'

interface SceneState {
  scenes: WindowScene[]
  routeGroups: RouteGroup[]
  rawRouteNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  undoAvailable: boolean

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
  mergeRoutes: (child: string, target: string) => boolean
  undoLastMerge: () => MergeHistoryEntry | null
}

export const useSceneStore = create<SceneState>((set, get) => {
  /** 重新从 localStorage 汇总，并让选中线路仍指向有效的主线路 */
  const refresh = () => {
    const scenes = getAllScenes()
    const routeGroups = getRouteGroups()
    const rawRouteNames = getAllRawRouteNames()

    let { selectedRoute } = get()
    if (selectedRoute && !new Set(routeGroups.map((g) => g.master)).has(selectedRoute)) {
      // 选中的主线路在归并/撤销后消失，回退到全部
      selectedRoute = ''
    }
    const currentRouteScenes = selectedRoute ? getScenesByRoute(selectedRoute) : []

    set({
      scenes,
      routeGroups,
      rawRouteNames,
      selectedRoute,
      currentRouteScenes,
      undoAvailable: canUndoMerge(),
    })
  }

  return {
    scenes: [],
    routeGroups: [],
    rawRouteNames: [],
    currentRouteScenes: [],
    selectedRoute: '',
    randomScene: null,
    undoAvailable: false,

    loadAll: () => {
      refresh()
    },

    saveScene: (data: SceneFormData) => {
      const scene: WindowScene = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      storageSaveScene(scene)
      refresh()
    },

    deleteScene: (id: string) => {
      storageDeleteScene(id)
      refresh()
    },

    selectRoute: (routeName: string) => {
      const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
      set({ selectedRoute: routeName, currentRouteScenes })
    },

    refreshRandom: () => {
      const randomScene = getRandomScene()
      set({ randomScene })
    },

    mergeRoutes: (child, target) => {
      const ok = storageMergeRoutes(child, target)
      if (ok) refresh()
      return ok
    },

    undoLastMerge: () => {
      const entry = storageUndoLastMerge()
      if (entry) refresh()
      return entry
    },
  }
})
