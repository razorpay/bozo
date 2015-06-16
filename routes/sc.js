var BrowserStackTunnel = require('./lib/browserstacktunnel.js');
var logger             = require('winston');
var BrowserStack       = require('node-browserstack');
var browsers = require('./lib/browsers.js');

logger.cli();
logger.level = 'debug';

var config = {
  key: 'R1H6dxWzzzz7C7R1z3NF',
  username: 'shashankmehta1'
}

var tunnel = new BrowserStackTunnel(config);

tunnel.start();

tunnel.on('error', function(err){
  console.log(err);
})

tunnel.on('ready', function(){
  logger.debug('Local Testing Ready');
  var screenshot = BrowserStack.createScreenshotClient(config.username, config.key);
  screenshot.createWorker(browsers, function(err, worker){
    if(err){
      logger.error(err);
      tunnel.stop();
      return;
    }

    logger.debug('screenshot callback', worker);
    setTimeout(function(){
      tunnel.stop();
    }, 60000);
  })
})

tunnel.on('stopped', function(){
  console.log('stopped');
})
