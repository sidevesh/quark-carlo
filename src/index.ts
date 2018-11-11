import {Command, flags} from '@oclif/command'
import { platform as osPlatform } from 'os'
import { format } from 'util'
import { dir as tempDir } from 'tmp'
import { cp, echo, exec, pwd, cd, ls, cat } from 'shelljs' 
const { exec:pkgExec } = require('pkg')

const placeholderAppName = 'quark-carlo-placeholder'

const platform = osPlatform()
const isLinux = () => platform === 'linux'
const isWIndows = () => platform === 'win32'
const isMac = () => platform === 'darwin'

const linuxInstallationDesktopFilesPath:string = '~/.local/share/applications'
const linuxInstallationDesktopFilesIconFilesPath:string = '~/.local/share/icons/hicolor/128x128/apps'

const filenameSafe = (str:string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase()

class QuarkCarlo extends Command {
  static description = 'Create native app from any web app, optionally install a shortcut so that the app shows up in the application menu'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'name of application', required: true }),
    url: flags.string({ char: 'u', description: 'url to load in application', required: true }),
    install: flags.boolean({ char: 'i', description: 'Install a shortcut so that the app shows up in the application menu', default: false }),
    dimensions: flags.string({
      char: 'd',
      description: 'Dimensions of application window as [width]x[height], for example 1280x720',
      default: '1280x720',
    }),
  }

  async run() {
    const { flags } = this.parse(QuarkCarlo)
    const { name, url, dimensions, install } = flags
    const execPath:string = pwd().valueOf()
    const binaryName:string = `${filenameSafe(name)}-quark`

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
    tempDir({ unsafeCleanup: true }, (err, tempDirPath) => {
      if (err) throw err
      cp('-R', `${__dirname}/../app/*`, tempDirPath)
      this.log(`Config options:`)
      echo(config).to(`${tempDirPath}/config.json`)
      cd(tempDirPath)
      this.log('Installing dependencies...')
      exec('npm install', { silent: true }, (code) => {
        cd(execPath)
        if (code === 0) {
          this.log('Installing dependencies succeeded...')
          this.log('Building binaries...')
          pkgExec([ tempDirPath, '--out-path', tempDirPath, '--targets', 'host' ])
            .then(() => {
              ls(tempDirPath)
                .filter(fileName => fileName === placeholderAppName)
                .forEach(fileName => cp(`${tempDirPath}/${fileName}`, `${execPath}/${binaryName}`))
              if (install) {
                this.log('Installing shortcut...')
                if (isLinux()) {
                  cat(`${__dirname}/../installation/linux/app.desktop`)
                    .sed('@@NAME@@', name)
                    .sed('@@PATH@@', `${execPath}/${binaryName}`)
                    .sed('@@FILENAME@@', `${binaryName}`)
                    .to(`${linuxInstallationDesktopFilesPath}/${binaryName}.desktop`)
                }
              }
            })
        } else {
          this.error('npm install failed...')
        }
      })
    })
  }
}

export = QuarkCarlo
