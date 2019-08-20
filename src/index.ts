import {Command, flags} from '@oclif/command'
import { platform as osPlatform } from 'os'
import { open, writeFile, close } from 'fs'
import { format } from 'util'
import { dir as tempDir } from 'tmp'
import { cp, echo, exec, pwd, cd, ls, cat, mkdir, test } from 'shelljs' 
const { exec:pkgExec } = require('pkg')
import pageIcon = require('page-icon')
const probeSize = require('probe-image-size')
import sharp = require('sharp')

const placeholderAppName = 'quark-carlo-placeholder'
const linuxIconSizes = [16, 24, 32, 48, 64, 72, 96, 128, 256]

const isLinux = () => osPlatform() === 'linux'
const isWindows = () => osPlatform() === 'win32'
const isMac = () => osPlatform() === 'darwin'
const getPlatform = () => {
  switch (osPlatform()) {
    case 'win32':
      return 'win'
    case 'darwin':
      return 'macos'
    case 'linux':
      return 'linux'
    default:
      return osPlatform()
  }
}

const execPath:string = pwd().valueOf()

const getLinuxInstallationDesktopFilesPath = () => {
  cd()
  const homePath:string = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/applications`
}

const getLinuxInstallationDesktopFilesIconFilesPath = (dimension:number, tillDimension:boolean = false) => {
  cd()
  const homePath:string = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/icons/hicolor/${dimension}x${dimension}${tillDimension ? '' : '/apps'}`
}

const filenameSafe = (str:string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase()

class QuarkCarlo extends Command {
  static description = 'Create native app from any web app, optionally install a shortcut so that the app shows up in the application menu'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'name of application', required: true }),
    url: flags.string({ char: 'u', description: 'url to load in application', required: true }),
    platform: flags.string({ char: 'p', description: 'Platform to build the binary for, defaults to the running platform, possible options are linux, macos, win', default: 'host' }),
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
    let { platform } = flags
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
    try {
      if (!['host', 'linux', 'win', 'macos'].includes(platform)) throw 'supplied platform invalid'
    } catch (err) {
      platform = 'host'
      this.warn('Invalid platform value, building for running platform')
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
          pkgExec([ tempDirPath, '--out-path', tempDirPath, '--targets', `node10-${platform !== 'host' ? platform : getPlatform()}` ])
            .then(() => {
              ls(tempDirPath)
                .filter((fileName) => {
                  if (platform === 'win') {
                    return fileName === `${placeholderAppName}.exe`;
                  }

                  return fileName === placeholderAppName;
                })
                .forEach(fileName => cp(`${tempDirPath}/${fileName}`, `${execPath}/${binaryName}${platform === 'win' ? '.exe' : ''}`))
              this.log('Generated binary successfully...')
              if (install) {
                if (platform === 'host' || platform === getPlatform()) {
                  this.log('Installing shortcut...')
                  if (isLinux()) {
                    this.log('Looking for appropriate icon image...')
                    pageIcon(url)
                      .then((icon) => {
                        if (icon === undefined) throw 'icon fetch failed'
                        if (icon.ext.toLowerCase() !== '.png') throw 'icon not png'
                        probeSize(icon.source)
                          .then((result:any) => {
                            if (result.width !== result.height) throw 'icon dimensions not equal'
                            this.log('Appropriate icon file fetched...')
                            const iconGenerationPromises:Array<Promise<string>> = linuxIconSizes.map((size) => new Promise((resolve, reject) => {
                              sharp(icon.data)
                                .resize(size, size)
                                .toBuffer()
                                .then((resizedIconData:any) => {
                                  if (!test('-d', getLinuxInstallationDesktopFilesIconFilesPath(size, true))) {
                                    mkdir(getLinuxInstallationDesktopFilesIconFilesPath(size, true))
                                  }
                                  if (!test('-d', getLinuxInstallationDesktopFilesIconFilesPath(size))) {
                                    mkdir(getLinuxInstallationDesktopFilesIconFilesPath(size))
                                  }
                                  writeFile(
                                    `${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}${icon.ext}`,
                                    resizedIconData,
                                    { mode: 0o666, flag: 'w' },
                                    (err) => {
                                      if (err) {
                                        reject(err)
                                      } else {
                                        this.log(`Icon file of ${size}x${size} generated...`)
                                        resolve(`${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}${icon.ext}`)
                                      }
                                    }
                                  )
                                })
                                .catch((err:any) => {
                                  reject(err)
                                })
                            }))
                            Promise.all(iconGenerationPromises)
                              .then((iconPaths) => {
                                cat(`${__dirname}/../installation/linux/app.desktop`)
                                  .sed('@@NAME@@', name)
                                  .sed('@@PATH@@', `${execPath}/${binaryName}`)
                                  .sed('@@FILENAME@@', `${binaryName}`)
                                  .to(`${getLinuxInstallationDesktopFilesPath()}/${binaryName}.desktop`)
                                this.log('Desktop file generated...')
                                this.log('Shortcut installation complete...')
                                this.log('To remove installation of shortcut, remove following files:')
                                this.log(`${getLinuxInstallationDesktopFilesPath()}/${binaryName}.desktop`)
                                iconPaths.forEach((iconPath) => {
                                  this.log(iconPath)
                                })
                              })
                              .catch((err:any) => {
                                throw err
                              })
                          })
                          .catch((err:any) => {
                            throw err
                          })
                      })
                      .catch((err:any) => this.error(err))
                  } else if (isWindows()) {
                    this.log('Creating shortcut for windows isn\'t supported yet')
                  } else if (isMac()) {
                    this.log('Creating shortcut for mac os isn\'t supported yet')
                  } else {
                    this.log(`Creating shortcut for ${getPlatform()} isn\'t supported yet`)
                  }
                } else {
                  this.error('Shortcut can only be installed if the platform is the same as the running platform')
                }
              }
            })
        } else {
          this.error('npm install failed')
        }
      })
    })
  }
}

export = QuarkCarlo
