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
import type { aliasConfigType, configType, directoryListType, historyType } from './types';

(async () => {
  const bgGreen = '\x1B[42m%s\x1B[0m'
  const colorRed = '\x1B[31m%s\x1B[0m'
  const home
    = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME
  const defaultRcPath = path.join(home || '~/', '.openvscoderc')
  let config: configType = {}
  let history: historyType = {}
  let directoryList: directoryListType = []
  let aliasConfig: aliasConfigType = {}
  try {
    const buffer = await readFile(defaultRcPath)
    const configStr = buffer.toString()
    config = configStr ? JSON.parse(configStr) : {}
  }
  catch (error) {
    writeFile(defaultRcPath, '')
  }
  history = config.history = config.history || {}
  directoryList = config.directoryList = config.directoryList || []
  aliasConfig = config.aliasConfig = config.aliasConfig || {}

  function setConfig(config: configType) {
    return writeFile(defaultRcPath, JSON.stringify(config))
  }

  async function pickDirectory() {
    if (!directoryList.length)
      await add()

    const choices: Choice[] = []

    await Promise.all(
      directoryList
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
              const directoryPath = path.join(foldPath, file)
              return {
                title: file,
                description: directoryPath,
                value: {
                  directoryPath,
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
        message: 'which directory do you want to open with vscode?',
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
    const { directoryPath } = value
    return Promise.resolve(directoryPath)
  }

  async function mian() {
    const directoryPath = await pickDirectory()
    execSync(`code ${directoryPath}`)
    console.log(bgGreen, `open ${directoryPath} success`)
    history[directoryPath] = history[directoryPath] ? history[directoryPath]! + 1 : 1
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
    directoryList.push(response.value.trim())
    await setConfig(config)
    console.log('now you can run oc again to select the project you want to open')
  }

  async function del() {
    if (!directoryList.length) {
      console.log('directoryList is empty')
      return
    }
    const choices = directoryList.map((directoryPath) => {
      return {
        title: directoryPath,
        value: directoryPath,
      }
    })
    const response = await prompts([
      {
        type: 'select',
        name: 'value',
        message: 'Which directory do you want to delete?',
        choices,
      },
    ])
    if (!response || !response.value)
      process.exit(0)
    const { value } = response
    const delIndex = directoryList.findIndex((item) => {
      return item === value
    })
    directoryList.splice(delIndex, 1)
    setConfig(config)
    console.log(bgGreen, `the directory [${value}] has been deleted`)
  }

  async function alias() {
    const directoryPath = await pickDirectory()

    const directoryAlias = await prompts({
      type: 'text',
      name: 'value',
      message: `Please enter an alias for ---> ${directoryPath}`,
    })
    if (!directoryAlias || !directoryAlias.value)
      process.exit(0)

    aliasConfig[directoryAlias.value] = directoryPath
    setConfig(config)
  }

  function openAlias(directoryPath: string) {
    execSync(`code ${directoryPath}`)
    console.log(bgGreen, `open ${directoryPath} success`)
  }
  // eslint-disable-next-line no-unused-expressions
  yargs(hideBin(process.argv))
    .command(
      '*',
      'open a directory with vscode',
      () => {
      },
      async (argv) => {
        if (argv._.length === 0) {
          mian()
        }
        else {
          const alias = String(argv._[0])
          const openPath = aliasConfig[alias]
          openPath && openAlias(openPath)
        }
      },
    )
    .command('add', 'add a directory to the directory list', () => {
      add()
    })
    .command('alias', 'add an alias for the specified directory', () => {
      alias()
    })
    .command('del', 'delete the useless path from the directoryList', async () => {
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
