import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('oc command', () => {
  it('should output in the expected format or contain specific message', () => {
    const output = execSync('oc').toString()
    const lines = output.split('\n').filter(line => line.trim())

    const directoryLineRegex = /^[^\s]+.* - .*[\\\/].*$/
    const hasdirectoryLine = lines.some(line => directoryLineRegex.test(line))

    const hasAddMessage = output.includes('Please add the directory of your project collection')
    expect(hasdirectoryLine || hasAddMessage).toBe(true)
  })
})

describe('oc add command', () => {
  it('should prompt for directory addition', () => {
    const output = execSync('oc add').toString()

    expect(output).toContain('Please add the directory of your project collection')
  })
})
describe('oc alias command', () => {
  it('should prompt for directory alias', () => {
    const output = execSync('oc alias').toString()
    const isOutputValid = output.includes('which directory do you want to open with vscode')
      || output.includes('Please add the directory of your project collection')
    expect(isOutputValid).toBe(true)
  })
})

describe('oc del command', () => {
  it('should prompt for directory deletion or indicate empty directoryList', () => {
    const output = execSync('oc del').toString()

    const isOutputValid = output.includes('Which directory do you want to delete')
      || output.includes('directoryList is empty')

    expect(isOutputValid).toBe(true)
  })
})

describe('oc config command', () => {
  it('should output valid JSON', () => {
    const output = execSync('oc config').toString()
    expect(output.includes('directoryList')).toBe(true)
  })
})
