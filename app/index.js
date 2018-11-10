const carlo = require('carlo');
const config = require('./config.json');

(async () => {
  const app = await carlo.launch({
    width: config.width,
    height: config.height
  });
  app.on('exit', () => process.exit());
  // dummy since we are loading external web app
  app.serveOrigin(config.url);
  await app.load('');
})();
