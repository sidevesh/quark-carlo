import {Command, flags} from '@oclif/command'
import { platform as osPlatform } from 'os'
import { open, writeFile, close } from 'fs'
import { format } from 'util'
import { dir as tempDir } from 'tmp'
import { cp, echo, exec, pwd, cd, ls, cat, mkdir, test } from 'shelljs'
import fetch from 'node-fetch'
import pageIcon = require('page-icon')
import sharp = require('sharp')
import pngToIco = require('png-to-ico')
const probeSize = require('probe-image-size')
const createNodeAppWithoutTerminal = require('create-nodew-exe')
const windowsShortcut = require('windows-shortcuts')

const { exec: pkgExec } = require('pkg')

const placeholderAppName = 'quark-carlo-placeholder'
const iconSizes = [16, 24, 32, 48, 64, 72, 96, 128, 256]

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

const execPath = pwd().valueOf()

const getLinuxInstallationDesktopFilesPath = () => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/applications`
}

const getLinuxInstallationDesktopFilesIconFilesPath = (dimension:number, tillDimension:boolean = false) => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/.local/share/icons/hicolor/${dimension}x${dimension}${tillDimension ? '' : '/apps'}`
}

const getWIndowsInstallationStartMenuShortcutFilesPath = () => {
  cd()
  const homePath = pwd().valueOf()
  cd(execPath)
  return `${homePath}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs`
}

const filenameSafe = (str:string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase()

const getProperPageIcon = (url:string):Promise<PageIcon.Icon> => new Promise((resolve, reject) => {
  pageIcon(url)
    .then((icon) => {
      if (icon === undefined) {
        return reject('icon fetch failed')
      }
      if (icon.ext.toLowerCase() !== '.png') {
        return reject('icon not png')
      }
      probeSize(icon.source)
        .then((result:any) => {
          if (result.width !== result.height) {
            return reject('icon dimensions not equal')
          }
          resolve(icon)
        })
        .catch(() => {
          return reject('size calculation failed')
        })
    })
    .catch(() => {
      return reject('size calculation failed')
    })
})


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

  async installShortcut(binaryName:string, platform:string, { url = null, shortcutFilePath = null }:{ url:string|null, shortcutFilePath:string|null }) {
    if (platform === 'host' || platform === getPlatform()) {
      this.log('Installing shortcut...')
      if (isLinux()) {
        if (url === null) throw 'no url supplied'
        this.log('Looking for appropriate icon image...')
        getProperPageIcon(url)
          .then((icon) => {
            this.log('Appropriate icon file fetched...')
            const iconGenerationPromises:Array<Promise<string>> = iconSizes.map((size) => new Promise((resolve, reject) => {
              sharp(icon.data)
                .resize(size, size)
                .toBuffer()
                .then((resizedIconData) => {
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
                        return reject(err)
                      } else {
                        this.log(`Icon file of ${size}x${size} generated...`)
                        resolve(`${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}${icon.ext}`)
                      }
                    }
                  )
                })
                .catch((err) => {
                  return reject(err)
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
              .catch((err) => {
                throw err
              })
          })
          .catch((err) => {
            this.error('Icon generation failed')
          })
      } else if (isWindows()) {
        if (shortcutFilePath === null) throw 'no shortcut file path supplied'
        this.log('Copying shortcut to Start Menu...')
        cp(shortcutFilePath, `getWIndowsInstallationStartMenuShortcutFilesPath()/${filenameSafe(name)}.lnk`)
        this.log('Shortcut added to Start Menu...')
        this.log('Shortcut installation complete...')
        this.log('To remove installation of shortcut, remove following files:')
        this.log(`getWIndowsInstallationStartMenuShortcutFilesPath()/${filenameSafe(name)}.lnk`)
      } else if (isMac()) {
        this.log('Creating shortcut for mac os isn\'t supported yet')
      } else {
        this.log(`Creating shortcut for ${getPlatform()} isn\'t supported yet`)
      }
    } else {
      this.error('Shortcut can only be installed if the platform is the same as the running platform')
    }
  }

  async run() {
    const { flags } = this.parse(QuarkCarlo)
    const { name, url, dimensions, install } = flags
    let { platform } = flags
    const binaryName = `${filenameSafe(name)}-quark`

    let width = 1280
    let height = 720

    try {
      if (dimensions === undefined) throw 'dimensions undefined'
      if (dimensions.split('x').length !== 2) throw 'dimensions invalid format'
      const parsedWidth = parseInt(dimensions.split('x')[0])
      const parsedHeight = parseInt(dimensions.split('x')[1])
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
    const config = JSON.stringify({
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
          this.log('Successfully installed dependencies...')
          this.log('Building binaries...')
          pkgExec([ tempDirPath, '--out-path', tempDirPath, '--targets', `node10-${platform !== 'host' ? platform: getPlatform()}` ])
            .then(() => {
              const tempPkgBinaryName = platform === 'win' ? `${placeholderAppName}.exe` : placeholderAppName
              const outPkgBinaryName = platform === 'win' ? `${binaryName}.exe` : binaryName
              const tempPkgBinaryPath = `${tempDirPath}/${tempPkgBinaryName}`
              const outPkgBinaryPath = `${execPath}/${outPkgBinaryName}`
              if (!test('-f', tempPkgBinaryPath)) {
                throw 'Binary packaging failed'
              }
              this.log('Generated binary successfully...')
              cp(tempPkgBinaryPath, outPkgBinaryPath)
              if (platform === 'win') {
                this.log('Making binary silent on launch...')
                createNodeAppWithoutTerminal({
                  src: outPkgBinaryPath,
                  dst: outPkgBinaryPath,
                })
                this.log('Creating shortcut for the app...')
                const tempIcoOutPath = `${tempDirPath}/icon.ico`
                const icoOutPath = `${execPath}/icon.ico`
                const shortcutOutPath = `${execPath}/${filenameSafe(name)}.lnk`
                this.log('Looking for appropriate icon image...')
                getProperPageIcon(url)
                  .then((icon) => {
                    this.log('Appropriate icon file fetched...')
                    pngToIco(icon.source)
                      .then((buf:any) => {
                        writeFile(
                          tempIcoOutPath,
                          buf,
                          (err) => {
                            if (err) {
                              throw 'writing ico file failed'
                            } else {
                              cp(tempIcoOutPath, icoOutPath)
                              this.log('Ico file generated...')
                              this.log('Creating shortcut file...')
                              windowsShortcut.create(
                                shortcutOutPath,
                                {
                                  target: outPkgBinaryPath,
                                  icon: icoOutPath,
                                },
                                (err:string) => {
                                  if (err === null) {
                                    this.log('Shortcut file created...')
                                    if (install) {
                                      this.installShortcut(binaryName, platform, { shortcutFilePath: shortcutOutPath, url: null })
                                    } else {
                                      this.log('Binary created successfully')
                                    }
                                  } else {
                                    this.error('Creating shortcut file failed')
                                  }
                                },
                              )
                            }
                          },
                        )
                      })
                      .catch((err:any) => {
                        throw err
                      })
                  })
                  .catch((err) => {
                    this.log('Ico generation failed, falling back to using favicon.ico...')
                    fetch(`${url}/favicon.ico`)
                      .then(response => response.buffer())
                      .then((buf) => {
                        writeFile(
                          tempIcoOutPath,
                          buf,
                          (err) => {
                            if (err) {
                              throw err
                            } else {
                              cp(tempIcoOutPath, icoOutPath)
                              this.log('Ico file generated...')
                              this.log('Creating shortcut file...')
                              windowsShortcut.create(
                                shortcutOutPath,
                                {
                                  target: outPkgBinaryPath,
                                  icon: icoOutPath,
                                },
                                (err:string) => {
                                  if (err === null) {
                                    this.log('Shortcut file created...')
                                    if (install) {
                                      this.installShortcut(binaryName, platform, { shortcutFilePath: shortcutOutPath, url: null })
                                    } else {
                                      this.log('Binary created successfully')
                                    }
                                  } else {
                                    this.error('Creating shortcut file failed')
                                  }
                                },
                              )
                            }
                          },
                        )
                      })
                      .catch(() => {
                        this.error('Saving favicon.ico failed')
                      })
                  })
              } else if (install) {
                this.installShortcut(binaryName, platform, { url, shortcutFilePath: null })
              } else {
                this.log('Binary created successfully')
              }
            })
            .catch(() => this.error('Binary packaging failed'))
        } else {
          this.error('npm install failed')
        }
      })
    })
  }
}

export = QuarkCarlo
