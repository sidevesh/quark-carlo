quark-carlo
===========

Turn web apps into lightweight native desktop applications that use chrome as webview, powered by the awesome carlo

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/quark-carlo.svg)](https://npmjs.org/package/quark-carlo)
[![Downloads/week](https://img.shields.io/npm/dw/quark-carlo.svg)](https://npmjs.org/package/quark-carlo)
[![License](https://img.shields.io/npm/l/quark-carlo.svg)](https://github.com/SiDevesh/quark-carlo/blob/master/package.json)

## Usage
```sh-session
$ npm install --global quark-carlo
$ quark-carlo --name Whatsapp --url https://web.whatsapp.com --install
$ quark-carlo (-v|--version|version)
quark-carlo/1.0.15 linux-x64 node-v10.16.2
$ quark-carlo --help [COMMAND]
USAGE
  $ quark-carlo

OPTIONS
  -D, --debug                                                    Create debug app to identify required additional internal hostnames, on encountering navigation to an external hostname the app will show an alert with the hostname value to pass in additionalInternalHostnames
  -a, --additionalInternalHostnames=additionalInternalHostnames  Comma separated list of additional hostnames that are to be opened within the app, for example oauth login page hostnames (for Google: accounts.google.com)
  -d, --dimensions=dimensions                                    [default: 1280x720] Dimensions of application window as [width]x[height], for example 1280x720
  -h, --help                                                     show CLI help
  -i, --install                                                  Install a shortcut so that the app shows up in the application menu
  -n, --name=name                                                (required) name of application
  -p, --platform=platform                                        [default: host] Platform to build the binary for, defaults to the running platform, possible options are linux, macos, win
  -u, --url=url                                                  (required) url to load in application
  -v, --version                                                  show CLI version
```
