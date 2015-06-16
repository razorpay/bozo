var logger       = require('winston');
var BrowserStack = require('node-browserstack');
var browsers     = require('../lib/browsers');
var config       = require('../config');

function Screenshot(url){
  this.client = BrowserStack.createScreenshotClient(config.browserstack_user, config.browserstack_key);
  this.url = url;
  this.buildSettings();
  return this;
}

Screenshot.prototype.buildSettings = function(){
  var options = JSON.parse(JSON.stringify(config.browserstack_settings));
  options.url = this.url;
  options.browsers = browsers;
  logger.debug('options used:', options);
  this.options = options;
}

Screenshot.prototype.shoot = function(callback){
  if(!config.browserstack_enabled){
    logger.warn('Browserstack screenshot request not sent. config.browserstack_enabled is false');
    callback(null, 'test_job_id');
    return;
  }
  this.client.createWorker(this.options, function(err, worker){
    if(err){
      logger.error(err);
      if(typeof callback === 'function'){
        callback(err);
      }
    }

    logger.debug('screenshot callback', worker);
    if(typeof callback === 'function'){
      callback(null, worker.job_id);
    }
  })
  return this;
}

module.exports = Screenshot;
