import {Command, flags} from '@oclif/command'
import { platform as osPlatform } from 'os'
import { writeFile } from 'fs'
import { dir as tempDir } from 'tmp'
import { cp, echo, exec, pwd, cd, cat, mkdir, test } from 'shelljs'
import fetch from 'node-fetch'
import pageIcon = require('page-icon')
import sharp = require('sharp')
import pngToIco = require('png-to-ico')
import icoToPng = require('ico-to-png')
import dedent = require('dedent-js')
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

const getWindowsInstallationStartMenuShortcutFilesPath = () => {
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
      resolve(icon)
    })
    .catch(() => {
      return reject('size calculation failed')
    })
})

const getIconFiles = (
  url:string,
  log:Function,
  isIcoNeeded = true,
  {
    tempPngOutPath = null,
    tempIcoOutPath = null,
    pngOutPath = null,
    icoOutPath = null,
  }:{
    tempPngOutPath:string|null,
    tempIcoOutPath:string|null,
    pngOutPath:string|null,
    icoOutPath:string|null,
  },
) => new Promise((resolve, reject) => {
  log('Looking for appropriate icon image...')
  if (tempPngOutPath=== null || tempIcoOutPath === null) {
    return reject('tempPngOutPath and tempIcoOutPath not supplied')
  }
  if (pngOutPath === null) {
    return reject('pngOutPath not supplied')
  }
  getProperPageIcon(url)
    .then((icon) => {
      fetch(icon.source)
        .then(response => response.buffer())
        .then((pngBuf) => {
          writeFile(
            tempPngOutPath,
            pngBuf,
            (err) => {
              if (err) {
                reject('writing png file failed')
              } else {
                cp(tempPngOutPath, pngOutPath)
                log('Appropriate icon file saved...')
                if (isIcoNeeded) {
                  pngToIco(icon.source)
                    .then((icoBuf:any) => {
                      writeFile(
                        tempIcoOutPath,
                        icoBuf,
                        (err) => {
                          if (err) {
                            reject('writing ico file failed')
                          } else {
                            if (icoOutPath === null) {
                              reject('icoOutPath not supplied')
                            } else {
                              cp(tempIcoOutPath, icoOutPath)
                              log('Ico file generated...')
                              resolve()
                            }
                          }
                        },
                      )
                    })
                    .catch((err:any) => reject(err))
                } else {
                  resolve()
                }
              }
            },
          )
        })
        .catch((err:any) => reject(err))
    })
    .catch((err) => {
      log('Ico generation failed, falling back to using favicon.ico...')
      fetch(`${url}/favicon.ico`)
        .then(response => response.buffer())
        .then((icoBuf) => {
          writeFile(
            tempIcoOutPath,
            icoBuf,
            (err) => {
              if (err) {
                reject('writing ico file failed')
              } else {
                if (isIcoNeeded) {
                  if (icoOutPath === null) {
                    return reject('icoOutPath not supplied')
                  } else {
                    cp(tempIcoOutPath, icoOutPath)
                    log('Ico file saved...')
                  }
                }
                icoToPng(icoBuf, iconSizes[iconSizes.length - 1], { scaleUp: true })
                  .then((pngBuf) => {
                    writeFile(
                      tempPngOutPath,
                      pngBuf,
                      (err) => {
                        if (err) {
                          reject('writing png file failed')
                        } else {
                          cp(tempPngOutPath, pngOutPath)
                          log('Png icon file saved...')
                          resolve()
                        }
                      },
                    )
                  })
                  .catch(() => reject('Converting favicon.ico into png failed'))
              }
            },
          )
        })
        .catch(() => reject('Saving favicon.ico failed'))
    })
})

class QuarkCarlo extends Command {
  static description = 'Create native app from any web app, optionally install a shortcut so that the app shows up in the application menu'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'name of application', required: true }),
    url: flags.string({ char: 'u', description: 'url to load in application', required: true }),
    platform: flags.string({
      char: 'p',
      description: 'Platform to build the binary for, defaults to the running platform, possible options are linux, macos, win',
      default: 'host',
    }),
    install: flags.boolean({
      char: 'i',
      description: 'Install a shortcut so that the app shows up in the application menu',
      default: false,
    }),
    dimensions: flags.string({
      char: 'd',
      description: 'Dimensions of application window as [width]x[height], for example 1280x720',
      default: '1280x720',
    }),
    additionalInternalHostnames: flags.string({
      char: 'a',
      description: 'Comma separated list of additional hostnames that are to be opened within the app, for example oauth login page hostnames (for Google: accounts.google.com)',
      default: '',
    }),
    debug: flags.boolean({
      char: 'D',
      description: 'Create debug app to identify required additional internal hostnames, on encountering navigation to an external hostname the app will show an alert with the hostname value to pass in additionalInternalHostnames',
      default: false,
    }),
  }

  async installShortcut(
    binaryName:string,
    platform:string,
    pngOutPath:string,
    {
      url = null,
      binaryPath = null,
      shortcutFilePath = null,
      shortcutName = null,
    }:{
      url:string|null,
      binaryPath:string|null,
      shortcutFilePath:string|null,
      shortcutName:string|null,
    }
  ) {
    if (platform === 'host' || platform === getPlatform()) {
      this.log('Installing shortcut...')
      if (isLinux()) {
        if (url === null) throw 'no url supplied'
        if (binaryPath === null) throw 'no binary path supplied'
        const iconGenerationPromises:Array<Promise<string>> = iconSizes.map((size) => new Promise((resolve, reject) => {
          sharp(pngOutPath)
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
                `${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}.png`,
                resizedIconData,
                { mode: 0o666, flag: 'w' },
                (err) => {
                  if (err) {
                    return reject(err)
                  } else {
                    this.log(`Icon file of ${size}x${size} generated...`)
                    resolve(`${getLinuxInstallationDesktopFilesIconFilesPath(size)}/${binaryName}.png`)
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
              .sed('@@PATH@@', binaryPath)
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
      } else if (isWindows()) {
        if (shortcutFilePath === null) throw 'no shortcut file path supplied'
        if (shortcutName === null) throw 'no shortcut name supplied'
        const windowsInstallationStartMenuShortcutFilesPath = `${getWindowsInstallationStartMenuShortcutFilesPath()}/${shortcutName}.lnk`
        this.log('Copying shortcut to Start Menu...')
        cp(shortcutFilePath, windowsInstallationStartMenuShortcutFilesPath)
        this.log('Shortcut added to Start Menu...')
        this.log('Shortcut installation complete...')
        this.log('To remove installation of shortcut, remove following files:')
        this.log(windowsInstallationStartMenuShortcutFilesPath)
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
    const { name, url, dimensions, install, additionalInternalHostnames, debug } = flags
    let { platform } = flags
    const directoryOrShortcutName = filenameSafe(name)
    const binaryName = `${directoryOrShortcutName}-quark`
    const outPkgDirectoryPath = `${execPath}/${directoryOrShortcutName}`

    let width = 1280
    let height = 720
    let parsedAdditionalInternalHostnames = <string[]>[]

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
    try {
      if (additionalInternalHostnames.length !== 0) {
        const hostnames = additionalInternalHostnames.split(',')
        .map(hostname => hostname.trim())
        .map(hostname => new URL(`https://${hostname}`).hostname)
        parsedAdditionalInternalHostnames = parsedAdditionalInternalHostnames.concat(hostnames)
      }
    } catch (err) {
      this.warn('Invalid additional internal hostnames supplied, make sure you pass a comma separated list of hostnames')
    }
    const config = JSON.stringify({
      name,
      url,
      width,
      height,
      iconPath: 'icon.png',
      additionalInternalHostnames: parsedAdditionalInternalHostnames,
      debug,
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
              const outPkgBinaryPath = `${outPkgDirectoryPath}/${outPkgBinaryName}`
              mkdir(outPkgDirectoryPath)
              if (!test('-f', tempPkgBinaryPath)) {
                throw 'Binary packaging failed'
              }
              this.log('Generated binary successfully...')
              cp(tempPkgBinaryPath, outPkgBinaryPath)
              const icoOutPath = `${outPkgDirectoryPath}/icon.ico`
              const pngOutPath = `${outPkgDirectoryPath}/icon.png`
              getIconFiles(
                url,
                (msg:any) => this.log(msg),
                platform === 'win',
                {
                  tempIcoOutPath: `${tempDirPath}/icon.ico`,
                  icoOutPath,
                  tempPngOutPath: `${tempDirPath}/icon.png`,
                  pngOutPath,
                },
              )
                .then(() => {
                  if (platform === 'win') {
                    this.log('Making binary silent on launch...')
                     createNodeAppWithoutTerminal({
                       src: outPkgBinaryPath,
                       dst: outPkgBinaryPath,
                     })
                    if (isWindows()) {
                      const shortcutOutPath = `${execPath}/${filenameSafe(name)}.lnk`
                      this.log('Creating shortcut for the app...')
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
                              this.installShortcut(
                                binaryName,
                                platform,
                                pngOutPath,
                                {
                                  shortcutName: directoryOrShortcutName,
                                  shortcutFilePath: shortcutOutPath,
                                  binaryPath: null,
                                  url: null,
                                },
                              )
                            } else {
                              this.log('Application created successfully')
                            }
                          } else {
                            this.error('Creating shortcut file failed')
                          }
                        },
                      )
                    } else {
                      this.log(dedent(`
                        Shortcut can only be ${install ? 'installed' : 'created'} on Windows,
                        Please create a shortcut of the binary manually,
                        and assign icon.ico to the shortcut manually on Windows.
                      `))
                      this.log('Binary created successfully')
                    }
                  } else {
                    if (install) {
                      this.installShortcut(binaryName, platform, pngOutPath, { url, binaryPath: outPkgBinaryPath, shortcutFilePath: null, shortcutName: null })
                    } else {
                      this.log('Binary created successfully')
                    }
                  }
                })
                .catch(err => this.error(err))
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
