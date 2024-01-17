export type folderListType = string[]
export interface configType {
  folderList?: folderListType
  history?: historyType
}
export interface historyType {
  [key: string]: number | undefined
}
