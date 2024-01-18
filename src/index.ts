import path from 'node:path'
import fs from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import process from 'node:process'
import prompts, { type Choice } from 'prompts'
import FuzzySearch from 'fuzzy-search'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { version } from '../package.json'
import type { configType, folderListType, historyType } from './types';

(async () => {
  const bgGreen = '\x1B[42m%s\x1B[0m'
  const colorRed = '\x1B[31m%s\x1B[0m'
  const home
    = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME
  const defaultRcPath = path.join(home || '~/', '.openvscoderc')
  let config: configType = {}
  let history: historyType = {}
  let folderList: folderListType = []
  try {
    const buffer = await readFile(defaultRcPath)
    const configStr = buffer.toString()
    config = configStr ? JSON.parse(configStr) : {}
  }
  catch (error) {
    writeFile(defaultRcPath, '')
  }
  history = config.history = config.history || {}
  folderList = config.folderList = config.folderList || []

  function setConfig(config: configType) {
    return writeFile(defaultRcPath, JSON.stringify(config))
  }

  async function mian() {
    if (!folderList.length)
      await add()

    const choices: Choice[] = []

    await Promise.all(
      folderList
        .filter((foldPath) => {
          if (!fs.existsSync(foldPath)) {
            console.log(colorRed, `${foldPath} does not exist`)
            return false
          }
          return true
        })
        .map(async (foldPath) => {
          const files = await readdir(foldPath)
          choices.push(
            ...files.map((file) => {
              const folderPath = path.join(foldPath, file)
              return {
                title: file,
                description: folderPath,
                value: {
                  folderPath,
                  fileName: file,
                },
              }
            }),
          )
        }),
    )

    if (!choices.length)
      process.exit(0)

    const searcher = new FuzzySearch(choices, ['title'], {
      caseSensitive: false,
    })
    const response = await prompts([
      {
        type: 'autocomplete',
        name: 'value',
        message: 'which folder do you want to open with vscode?',
        choices,
        suggest: (input) => {
          const res = searcher.search(input)
          // 按照使用频率排序
          res.sort((a, b) => {
            return (
              (history[b.description!] || 0) - (history[a.description!] || 0)
            )
          })
          return Promise.resolve(res)
        },
      },
    ])
    if (!response || !response.value)
      process.exit(0)

    const { value } = response
    const { folderPath } = value
    execSync(`code ${folderPath}`)
    console.log(bgGreen, `open ${folderPath} success`)
    history[folderPath] = history[folderPath] ? history[folderPath]! + 1 : 1
    setConfig(config)
  }

  async function add() {
    const response = await prompts({
      type: 'text',
      name: 'value',
      message: 'Please add the directory of your project collection！',
    })
    if (!response || !response.value)
      process.exit(0)
    folderList.push(response.value.trim())
    await setConfig(config)
    console.log('now you can run oc again to select the project you want to open')
  }

  async function del() {
    if (!folderList.length) {
      console.log('folderList is empty')
      return
    }
    const choices = folderList.map((folderPath) => {
      return {
        title: folderPath,
        value: folderPath,
      }
    })
    const response = await prompts([
      {
        type: 'select',
        name: 'value',
        message: 'which folder do you want to delete?',
        choices,
      },
    ])
    if (!response || !response.value)
      process.exit(0)
    const { value } = response
    const delIndex = folderList.findIndex((item) => {
      return item === value
    })
    folderList.splice(delIndex, 1)
    setConfig(config)
  }

  // eslint-disable-next-line no-unused-expressions
  yargs(hideBin(process.argv))
    .command(
      '*',
      'open a folder with vscode',
      () => {
      },
      async (argv) => {
        if (argv._.length === 0)
          mian()
      },
    )
    .command('add [path]', 'add a folder to the folder list', () => {
      add()
    })
    .command('del', 'delete the useless path from the folderList', async () => {
      del()
    })
    .command('config', 'show config', () => {
      const { history: _, ...restConfig } = config
      console.log(restConfig)
    })
    .showHelpOnFail(false)
    .alias('h', 'help')
    .version('version', version)
    .alias('v', 'version')
    .help()
    .argv
})()
