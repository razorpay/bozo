var logger = require('winston');
var dirty = require('dirty');
var BrowserStack = require('node-browserstack');
var config       = require('../config');
var db = require('../lib/db');
var resemble = require('node-resemble');
var request = require('request').defaults({encoding: null});
var slack = require('../lib/slack');

function Regression(job_id, data){
  logger.info('Beginning regression test for ' + job_id);

  data.id = job_id;
  this.currentJobData = data;

  var prevJob = this._getPrevJob();
  if(!prevJob){
    logger.warn('This is the first task. No analysis to be done');
    db.set('last', job_id);
    return;
  }
  if(prevJob.status !== 'completed'){
    logger.info('Last job ' + prevJob.id + ' wasn\'t complete. Aborting regression test');
    return;
  }

  this._getPrevJobData(prevJob.id, function(){
    var data = this._indexData();
    this.analyze(data);
  });
}

Regression.prototype._getPrevJob = function(){
  var id = db.get('last');
  if(!id){
    return null;
  }
  var data = db.get(id);
  data.id = id;
  return data;
}

Regression.prototype._getPrevJobData = function(id, callback){
  var self = this;
  var client = BrowserStack.createScreenshotClient(config.browserstack_user, config.browserstack_key);
  client.getWorker(id, function(err, worker){
    if(err){
      logger.error('Error in retrieving prev job data', err);
      return
    }

    self.prevJobData = worker;

    if(typeof callback === 'function'){
      callback.apply(self, worker);
    }
  })
}

Regression.prototype._indexData = function(){
  var currentJobData = this.currentJobData;
  var prevJobData = this.prevJobData;

  if(!currentJobData || !prevJobData){
    logger.error('Job Data is missing. Aborting regression test');
    return;
  }

  var data = {
    current: this._indexDataHelper(currentJobData),
    prev: this._indexDataHelper(prevJobData)
  }

  return data;
}

Regression.prototype._indexDataHelper = function(data){
  var indexed = {};
  for(var i in data.screenshots){
    var shot = data.screenshots[i];

    if(shot.state === 'pending'){
      continue;
    }

    var signature = [shot.os, shot.os_version, shot.browser, shot.browser_version];
    signature = signature.join('_');
    indexed[signature] = shot;
  }

  return indexed;
}

Regression.prototype.analyze = function(data){
  logger.info('Beginning analysis');

  this.count = {
    skipped: 0,
    match: 0,
    noMatch: 0,
    total: Object.keys(data.current).length
  }

  for(var i in data.current){
    if(!data.prev[i]){
      this.count.skipped++;
      continue;
    }

    var self = this;
    var url1 = data.current[i].image_url;
    var url2 = data.prev[i].image_url;
    this._loadImages(url1, url2, this._checkSimilarity);
  }
}

Regression.prototype._checkSimilarity = function(img1, img2){
  var self = this;
  resemble(img1).compareTo(img2).onComplete(function(data){
    delete data.getImageDataUrl;
    logger.info(data);
    if(data.misMatchPercentage < 5){
      self.count.match++;
    }
    else {
      self.count.noMatch++;
    }
    self._checkForEnd();
  })
}

Regression.prototype._checkForEnd = function(){
  var count = this.count;
  logger.info(count);
  if(count.skipped + count.match + count.noMatch === count.total){
    this.handleEndOfAnalysis();
  }
}

Regression.prototype._loadImages = function(url1, url2, cb){
  var self = this;
  request.get(url1, function(err, res, img1){
    request.get(url2, function(err, res, img2){
      if(typeof cb === 'function'){
        cb.call(self, img1, img2);
      }
    })
  })
}

Regression.prototype.handleEndOfAnalysis = function(){
  logger.info('Analysis complete of ' + this.currentJobData.id + ' and ' + this.prevJobData.id);
  var job = db.get(this.currentJobData.id);
  var data = this.count;
  var job_id = this.currentJobData.id;

  db.set('last', this.currentJobData.id);

  var stats = 'Tested: ' + data.total + ', match: ' + data.match + ', noMatch: ' + data.noMatch + ', skipped: ' + data.skipped;
  var shortStats = [data.total, data.match, data.noMatch].join('/');

  slack.sendEndMsg({
    app: job.app,
    job_id: job_id,
    branch: job.branch,
    stats: stats,
    shortStats: shortStats
  });
}

module.exports = Regression;
