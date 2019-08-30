const carlo = require('carlo');
const path = require('path');
const config = require('./config.json');

(async () => {
  const app = await carlo.launch({
    width: config.width,
    height: config.height,
    title: config.name,
    url: config.url,
    icon: path.join(path.dirname(process.argv[0]), config.iconPath),
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
  await app.load(new URL(config.url).pathname);
})();
