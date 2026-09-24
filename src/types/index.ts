export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/**
 * 线路归并关系：别名（旧写法） -> 主线路名。
 * 主线路自身也可能被归到别处，解析时沿父指针向上走到根。
 */
export type RouteMerges = Record<string, string>

/** 撤销归并所需的快照：被归并线路在操作前的父线路（undefined 表示当时是独立主线路） */
export interface MergeHistoryEntry {
  child: string
  previousParent?: string
  timestamp: string
}

/** 时间线筛选用的线路分组（主线路 + 其下所有写法） */
export interface RouteGroup {
  /** 根主线路名 */
  master: string
  /** 归入该主线路的全部写法（含主线路自身） */
  aliases: string[]
  /** 组内记录数 */
  count: number
}
