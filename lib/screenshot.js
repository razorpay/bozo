var logger       = require('winston');
var logger       = require('winston');
var BrowserStack = require('node-browserstack');
var browsers     = require('../lib/browsers');
var config       = require('../config');

var BATCH_SIZE = config.batch_size;

function Screenshot(url){
  this.client = BrowserStack.createScreenshotClient(config.browserstack_user, config.browserstack_key);
  this.url = url;
  this.buildSettings();
  return this;
}

Screenshot.prototype.buildSettings = function(){
  var options = JSON.parse(JSON.stringify(config.browserstack_settings));
  options.url = this.url;

  if(browsers.length > BATCH_SIZE){
    options.batching = true;
  }
  options.browsers = this.browserSets();

  logger.debug('options used:', options);
  this.options = options;
}

Screenshot.prototype.browserSets = function(){
  if(browsers <= BATCH_SIZE){
    return browsers;
  }

  var browserSets = [];
  var setCount = Math.ceil(browsers.length / BATCH_SIZE);
  while(setCount > 0){
    var start = (setCount - 1) * BATCH_SIZE;
    var end = setCount * BATCH_SIZE;
    var set = browsers.slice(start, end);
    browserSets.push(set);
    setCount--;
  }
  return browserSets;
}

Screenshot.prototype.batch = function(callback){
  var self = this;
  var subJobs = this.options.browsers.length;
  var requestsSent = 0;
  var errors = [];
  var jobIDSet = [];

  var cb = function(err, job_id){
    if(err){
      logger.error(err);
      errors.push(err);
      return;
    }

    jobIDSet.push(job_id);
    requestsSent++;

    if(requestsSent === subJobs){
      if(typeof callback === 'function'){
        if(errors.length > 0){
          callback(errors);
        }
        else {
          callback(null, jobIDSet);
        }
      }
    }
  }

  for(var i in this.options.browsers){
    var browserSet = this.options.browsers[i];
    this._shootSingleJob(browserSet, cb);
  }
}

Screenshot.prototype._shootSingleJob = function(browserSet, callback){
  var mainOptions = this.options
  var options = JSON.parse(JSON.stringify(mainOptions));
  options.browsers = browserSet;

  if(!config.browserstack_enabled){
    var test_id = 'test_job_id-' + Math.random();
    logger.warn('Browserstack screenshot request not sent. config.browserstack_enabled is false');
    logger.warn('test_job_id:', test_id);
    callback(null, test_id);
    return;
  }

  this.client.createWorker(options, function(err, worker){
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
}

Screenshot.prototype.shoot = function(callback){
  if(this.options.batching === true){
    this.batch(callback);
  }
  else {
    var browserSet = this.options.browsers;
    this._shootSingleJob(browserSet, callback);
  }
  return this;
}

module.exports = Screenshot;
