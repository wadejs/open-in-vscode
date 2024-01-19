export type directoryListType = string[]
export interface configType {
  directoryList?: directoryListType
  history?: historyType
  aliasConfig?: aliasConfigType
}
export interface historyType {
  [key: string]: number | undefined
}
export interface aliasConfigType {
  [key: string]: string | undefined
}
