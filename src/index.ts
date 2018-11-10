import {Command, flags} from '@oclif/command'
import { format } from 'util'
import { dir } from 'tmp'
import { cp, echo, exec, pwd, cd } from 'shelljs' 
const { exec:pkgExec } = require('pkg')

const filenameSafe = (str:string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase()

class QuarkCarlo extends Command {
  static description = 'describe the command here'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'name of application', required: true }),
    url: flags.string({ char: 'u', description: 'url to load in application', required: true }),
    dimensions: flags.string({
      char: 'd',
      description: 'Dimensions of application window as [width]x[height], for example 1280x720',
      default: '1280x720',
    }),
  }

  async run() {
    const { flags } = this.parse(QuarkCarlo)
    const { name, url, dimensions } = flags
    const execPath:string = pwd().valueOf()
    let width:number = 1280
    let height:number = 720
    try {
      if (dimensions === undefined) throw 'dimensions undefined'
      if (dimensions.split('x').length !== 2) throw 'dimensions invalid format'
      const parsedWidth:number = parseInt(dimensions.split('x')[0])
      const parsedHeight:number = parseInt(dimensions.split('x')[1])
      if (isNaN(parsedWidth) || isNaN(parsedHeight)) throw 'dimension is not a number'
      width = parsedWidth
      height = parsedHeight
    } catch (err) {
      this.warn('Invalid dimensions format, using default value')
    }
    const config:string = JSON.stringify({
      name,
      url,
      width,
      height,
    })
    dir({ unsafeCleanup: true }, (err, path) => {
      if (err) throw err
      cp('-R', `${__dirname}/../app/*`, path)
      this.log(`Config options:`)
      echo(config).to(`${path}/config.json`)
      cd(path)
      this.log('Installing dependencies...')
      exec('npm install', { silent: true }, (code) => {
        cd(execPath)
        if (code === 0) {
          this.log('Installing dependencies succeeded...')
          this.log('Building binaries...')
          pkgExec([ path, '--out-path', `${path}` ])
            .then(() => {
              cp(`${path}/quark-carlo-placeholder-linux`, `./${filenameSafe(name)}-linux`)
              cp(`${path}/quark-carlo-placeholder-macos`, `./${filenameSafe(name)}-macos`)
              cp(`${path}/quark-carlo-placeholder-win.exe`, `./${filenameSafe(name)}-win.exe`)
            })
        } else {
          this.error('npm install failed...')
        }
      })
    })
  }
}

export = QuarkCarlo
