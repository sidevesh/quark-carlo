const os = require('os');
const fs = require('fs');
const carlo = require('carlo-quark-fork');
const notifier = require('node-notifier');
const path = require('path');
const config = require('./config.json');
const polyRideNotification = require('./notification_polyride');

const generateProfilePath = (platform, dirName) => {
  if (platform === 'win') {
    if (!fs.existsSync(path.join(os.homedir(), 'AppData', 'Local', dirName))) {
      fs.mkdirSync(path.join(os.homedir(), 'AppData', 'Local', dirName));
    }
    return path.join(os.homedir(), 'AppData', 'Local', dirName, 'profile');
  } else if (platform === 'macos') {
    if (!fs.existsSync(path.join(os.homedir(), 'Library', 'Application Support', dirName))) {
      fs.mkdirSync(path.join(os.homedir(), 'Library', 'Application Support', dirName));
    }
    return path.join(os.homedir(), 'Library', 'Application Support', dirName, 'profile');
  } else if (platform === 'linux') {
    if (!fs.existsSync(path.join(os.homedir(), '.config', dirName))) {
      fs.mkdirSync(path.join(os.homedir(), '.config', dirName));
    }
    return path.join(os.homedir(), '.config', dirName, 'profile');
  } else {
    return path.join(path.dirname(process.argv[0]), 'profile');
  }
};

(async () => {
  const app = await carlo.launch({
    width: config.width,
    height: config.height,
    title: config.name,
    url: config.url,
    icon: config.platform === 'macos' ? path.join(path.dirname(path.dirname(process.argv[0])), 'Resources', config.iconPath) : path.join(path.dirname(process.argv[0]), config.iconPath),
    userDataDir: generateProfilePath(config.platform, config.dirName),
    bgcolor: '#eeeeee',
  });
  app.on('exit', () => process.exit());
  app.mainWindow().pageForTest().setBypassCSP(true);
  app.serveHandler((req) => {
    if (
      req.params_.isNavigationRequest &&
      req.params_.frameId === app.mainWindow().pageForTest().mainFrame()._id &&
      (
        new URL(req.url()).hostname !== new URL(config.url).hostname &&
        !config.additionalInternalHostnames.includes(new URL(req.url()).hostname)
      )
    ) {
      req.abort();
      if (config.debug) {
        app.evaluate(url => window.alert(url), `Attempted to open external url: ${req.url()}\nHostname to enter in cli: ${new URL(req.url()).hostname}`);
      }
      app.evaluate(url => window.open(url), req.url());
    } else {
      req.continue();
    }
  });
  app.serveOrigin(new URL(config.url).origin);

  let notifierInstance = notifier;
  if (config.platform === 'macos') {
    notifierInstance = new notifier.NotificationCenter({
      customPath: path.join(path.dirname(path.dirname(process.argv[0])), 'Resources', 'terminal-notifier.app', 'Contents', 'MacOS', 'terminal-notifier'),
    });
  }

  notifierInstance.on('click', () => {
    app.mainWindow().bringToFront();
    app.evaluate(`window.Notification.getLastNotification().dispatchEvent(new Event('click'))`);
  });
  notifierInstance.on('timeout', () => {
    app.evaluate(`window.Notification.getLastNotification().dispatchEvent(new Event('close'))`);
  });

  await app.exposeFunction('notify', (serializedOpts) => {
    const opts = JSON.parse(serializedOpts);
    notifierInstance.notify({
      title: opts.title,
      message: opts.message,
      sound: opts.sound,
      icon: os.type() === 'Linux' && process.env.DESKTOP_SESSION === 'pantheon' ? config.appName : path.join(path.dirname(process.argv[0]), config.iconPath),
      // Internally used in place of appID for Windows,
      // more apt name as it shows the app's name on notification as whatever is given here,
      // no uniqueness or pre register constraints of appID seem to apply,
      // and appName for Windows is display name, not tokenized name
      appName: config.appName,
      wait: true,
    });
    app.evaluate(`window.Notification.notifyNotificationInstances['${opts.uniqueId}'].dispatchEvent(new Event('show'))`);
  });
  await app.load(new URL(config.url).pathname);
  await app.evaluate(polyRideNotification);
})();
