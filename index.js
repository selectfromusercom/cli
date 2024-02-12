#!/usr/bin/env node

/**
 * @license
 * Copyright(c) 2021-2023 Selectfromuser Inc.
 * All rights reserved.
 * https://www.selectfromuser.com
 * {team, support, jhlee}@selectfromuser.com, eces92@gmail.com
 * Commercial Licensed. Grant use for paid permitted user only.
 */

console.log('[openselect] selectfromuser.com')

const inquirer = require('inquirer');
const chalk = require('chalk')
const axios = require('axios')
const path = require('path')
const fs = require('fs')
const os = require('os')
const {glob} = require('glob')
const YAML = require('js-yaml')

/**
 * endpoint, configuration
 */
API_BASE_URL = process.env.TEST ? 'http://localhost:9500' : 'https://api.selectfromuser.com'
WEB_BASE_URL = process.env.TEST ? 'http://localhost:5173' : 'https://app.selectfromuser.com'

/**
 * global var
 */
const Package = require('./package.json')
let CONFIG = {}

async function validate(token) {
  const tokens = String(token).split('.')

  // if (tokens.length != 2) {
  //   throw new Error(`인증 실패: 알수없는 토큰 형식 (로그아웃 후 다시 시도해주세요. "slt logout")`)
  // }
  
  const r = await axios.get(`${API_BASE_URL}/api/team/${tokens[0]}/config/openselect/whoami`, {
    headers: {
      Authorization: token,
    }
  })
  if (r?.data?.message != 'ok') {
    throw new Error(`인증 실패: ${r?.data?.message}`)
  }
  console.log(chalk.blue('[INFO]'), '로그인된 상태입니다.')
}

async function link() {

  const check_config_path = path.join(process.env.CWD || process.cwd(), '.select', 'project.json')
  if (fs.existsSync(check_config_path)) {

    const check_config = require(check_config_path)
    CONFIG = check_config

    console.log(chalk.blue('[INFO]'), 'Using editorId at .select/project.json')

    await validate(CONFIG.editorId)
    return
  }


  console.log(chalk.blue('[INFO]'), '편집할 어드민을 입력해주세요. [가이드주소]')
  
  const answer = await inquirer.prompt([
    {
      name: 'token',
      message: 'Project Editor ID',
      default: 'Enter your editor ID',
    }
  ])
  
  TOKEN = answer.token
  // validate
  await validate(TOKEN)


  const config_path = path.join(process.env.CWD || process.cwd(), '.select')
      
  if (!fs.existsSync(config_path)) {
    fs.mkdirSync(config_path)
  }
  CONFIG = {
    editorId: TOKEN,
  }
  fs.writeFileSync(path.join(config_path, 'project.json'), 
    JSON.stringify(CONFIG, null, '  ')
  )
  
  // console.log('')
  // console.log(chalk.blue('[INFO]'), 'Sign in completed.')
  
  const gitignore = path.join(process.env.CWD || process.cwd(), '.gitignore')
  if (fs.existsSync(gitignore)) {
    const data = fs.readFileSync(gitignore)
    if (data.toString().split('\n').map(e => String(e).trim()).filter(e => e == '.select').length == 0) {
      fs.appendFileSync(gitignore, '\n.select')
    }
  }
}


async function init() {
  const files = await glob('**/*.{yml,yaml}', {
    ignore: 'node_modules/**',
  })
  if (files && files.length) {
    console.log(chalk.blue('[INFO]'), 'Files are located already in current directory.')
    const answer = await inquirer.prompt([
      {
        name: 'overwrite',
        message: 'Overwrite',
        default: 'Enter Y to overwrite anyway',
      }
    ])
    if (answer.overwrite.toUpperCase() != 'Y') {
      return console.log('User cancel')
    }
  }

  const samples = require('./sample.js')
  {
    const p = path.join(process.env.CWD || process.cwd(), 'index.yml')
    fs.writeFileSync(p, samples['index.yml'].trim())
    console.log(chalk.blue('[INFO]'), 'File added: index.yml')
  }
  {
    const p = path.join(process.env.CWD || process.cwd(), 'dashboard.yml')
    fs.writeFileSync(p, samples['dashboard.yml'].trim())
    console.log(chalk.blue('[INFO]'), 'File added: dashboard.yml')
  }
  {
    const p = path.join(process.env.CWD || process.cwd(), 'users')
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p)
    }
  }
  {
    const p = path.join(process.env.CWD || process.cwd(), 'users', 'index.yml')
    fs.writeFileSync(p, samples['users/index.yml'].trim())
    console.log(chalk.blue('[INFO]'), 'File added: users/index.yml')
  }
  {
    const p = path.join(process.env.CWD || process.cwd(), 'users', 'payment.yml')
    fs.writeFileSync(p, samples['users/payment.yml'].trim())
    console.log(chalk.blue('[INFO]'), 'File added: users/payment.yml')
  }
}

const build_v2_spec = (item) => {
  let json = {
    menus: [],
    pages: [],
  }
  const docs = YAML.loadAll(item.json.yml) || []
  const $$path = path.parse(item.name)
  const $path = $$path.dir + '/' + $$path.name
  if (docs.length == 1) {

  }
  for (const doc of docs) {
    json.pages.push({
      path: $path,
      ...doc,
    })
  }
  if ($$path.name != 'index') {
    json.menus.push({
      path: $path,
      default: true,
      orderBy: $$path.name, 
    })
  }
  item.json.yml = YAML.dump(json)
}

async function draft(event, path) {
  // TODO: json, js
  const files = await glob('**/*.{yml,yaml}', {
    ignore: 'node_modules/**',
  })

  const items = []
  for (const file of files) {
    if (file.startsWith('_')) {
      continue 
    }
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      const item = {
        name: file,
        json: {
          yml: fs.readFileSync(file, 'utf8'),
        }
      }
      if (file.includes('/')) {
        build_v2_spec(item)
      }
      items.push(item)
    } 
    // else if (file.endsWith('.json2')) {
    //   items.push({
    //     name: file,
    //     json: {
    //       json: fs.readFileSync(file, 'utf8'),
    //     }
    //   })
    // }
  }

  // console.log(items)

  try {
    const tokens = CONFIG.editorId.split('.')
    const r = await axios.post(`${API_BASE_URL}/api/team/${tokens[0]}/config/openselect/drafts`, {
      items,
    }, {
      headers: {
        Authorization: CONFIG.editorId,
      }
    })
    console.log(chalk.green('[INFO]'), `저장했습니다.`)
  } catch (error) {
    console.log(error)
  }
  console.log(event, path)
}

async function dev() {
  try {
    const files = await glob('**/*.{yml,yaml}', {
      ignore: 'node_modules/**',
    })
    
    if (files && files.length === 0) {
      const answer = await inquirer.prompt([
        {
          name: 'init',
          message: '설정 파일이 비어있습니다. 샘플을 추가할까요? (y)',
          default: 'no',
        }
      ])
      
      if (answer.init == 'y') {
        await init()
      }
    }

    const watch = () => {
      const chokidar = require('chokidar')
    
      chokidar.watch(path.join(process.env.CWD || process.cwd(), '**/*.(yml|yaml)'), {
        ignored: 'node_modules/**',
        ignoreInitial: true,
      })
      .on('all', (event, path) => {
        console.log(chalk.blue('[INFO]'), `Reload from ${path} ${event}.`)
        draft(event, path)
      })
    }

    watch()

    // at first, upload all
    draft()

    const tokens = CONFIG.editorId.split('.')
    console.log('✨ Preview URL:\n  ', chalk.underline(`${WEB_BASE_URL}/admin/${tokens[0]}#deployment-preview`))
    
  } catch (error) {
    console.error(chalk.red('[ERROR]'), error.message)
    console.debug(error.stack)
  }  
}  


/**
 * check update
 */

setTimeout(async () => {
  try {
    const boxen = (await import('boxen')).default
    const chalk = require('chalk')
    const pj = (await import('package-json')).default
    const latest = await pj('@selectfromuser/cli')
		const semver = require('semver')
    if (semver.lt(Package.version, latest.version)) {
      console.log(boxen(`새로운 업데이트 가능 ${Package.version} -> ${ chalk.bold(latest.version)}\nRun ${ chalk.cyan('npm i -g selectfromuser') } to update`, {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        title: 'NEW',
        titleAlignment: 'center',
      }))
    }
  } catch (error) {
    console.error(error)
  }
}, 0)


/**
 * program
 */

if (process.argv.length == 2) {
  process.argv.push('dev')
}

const { program } = require('commander');

program
.name('openselect')
.version(Package.version, '-v, --version, -version')
// .option('-w, --watch, -watch', 'watch config yaml files')
// .option('-f, --force, -force', 'force create config yaml')

program.command('logout').action(() => {
  let config_path = path.join(process.env.CWD || process.cwd(), '.select')
  
  if (!fs.existsSync(config_path)) {
    fs.mkdirSync(config_path)
  }
  let config = {}
  if (fs.existsSync(path.join(config_path, 'project.json'))) {
    config = require(path.join(config_path, 'project.json'))
  }
  if (!config.editorId) {
    return console.log(chalk.blue('[INFO]'), '이미 로그아웃 되어 있습니다.')  
  }
  fs.unlinkSync(path.join(config_path, 'project.json')) 

  // config.editorId = undefined

  // fs.writeFileSync(path.join(config_path, 'project.json'), 
  //   JSON.stringify(config, null, '  ')
  // )
  console.log(chalk.blue('[INFO]'), '로그아웃 했습니다.')
})

program.command('login').action(() => {
  try {
    link()
  } catch (error) {
    console.log(chalk.yellow('[ERROR]'), error.message)
  }
})

// todo
// program.command('whoami').action(async () => {})

program.command('dev').action(async () => {
  try {
    await link()
    dev()
  } catch (error) {
    console.log(chalk.yellow('[ERROR]'), error.message)
  }
})
program.command('init').action(() => {
  init()
})


const parsed = program.parse()
const commands = parsed.args
const opts = program.opts()
	