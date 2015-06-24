var logger = require('winston');
var dirty = require('dirty');
var BrowserStack = require('node-browserstack');
var config       = require('../config');
var db = require('../lib/db');
var resemble = require('node-resemble');
var request = require('request').defaults({encoding: null});
var slack = require('../lib/slack');

function Regression(parentJob){
  logger.info('Beginning regression test for ' + parentJob);

  this.currentJobData = db.getJobData(parentJob);
  this.prevJobData = this._getPrevJobData();

  if(!this.prevJobData){
    logger.warn('This is the first task. No analysis to be done');
    db.set('last', parentJob);
    return;
  }

  if(this.prevJobData.id === this.currentJobData.id){
    logger.warn('Last analysis was complete');
    return;
  }

  if(this.prevJobData.state !== 'completed'){
    logger.info('Last job ' + this.prevJobData.id + ' wasn\'t complete. Aborting regression test');
    return;
  }

  var data = this._indexData();
  this.analyze(data);
}

Regression.prototype._getPrevJobData = function(){
  var parentJobID = db.get('last');
  if(!parentJobID){
    return null;
  }

  return db.getJobData(parentJobID);
}

Regression.prototype._indexData = function(){
  var currentJobData = this.currentJobData;
  var prevJobData = this.prevJobData;

  if(!currentJobData || !prevJobData){
    logger.error('Job Data is missing. Aborting regression test');
    return;
  }

  var data = {
    current: db.indexJobData(currentJobData),
    prev: db.indexJobData(prevJobData)
  }

  return data;
}

Regression.prototype.analyze = function(data){
  logger.info('Beginning analysis');

  this.count = {
    skipped: 0,
    match: 0,
    noMatch: 0,
    total: Object.keys(data.current).length,
    noMatchData: []
  }

  for(var i in data.current){
    if(!data.prev[i]){
      this.count.skipped++;
      continue;
    }

    var self = this;
    var url1 = data.current[i].image_url;
    var url2 = data.prev[i].image_url;
    this._loadImages(url1, url2, i, this._checkSimilarity);
  }
}

Regression.prototype._checkSimilarity = function(img1, img2, signature){
  var self = this;
  resemble(img1).compareTo(img2).onComplete(function(data){
    delete data.getImageDataUrl;
    logger.info(data);
    if(data.misMatchPercentage < 5){
      self.count.match++;
    }
    else {
      self.count.noMatch++;
      self.count.noMatchData.push(signature);
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

Regression.prototype._loadImages = function(url1, url2, signature, cb){
  var self = this;
  if(url1.indexOf('.png') === -1){
    this.count.skipped++;
    return;
  }
  request.get(url1, function(err, res, img1){
    request.get(url2, function(err, res, img2){
      if(typeof cb === 'function'){
        cb.call(self, img1, img2, signature);
      }
    })
  })
}

Regression.prototype.handleEndOfAnalysis = function(){
  logger.info('Analysis complete of ' + this.currentJobData.id + ' and ' + this.prevJobData.id);
  var job = db.get(this.currentJobData.id);
  var data = this.count;
  var job_id = this.currentJobData.id;

  job.stats = data;
  job.last = db.get('last');
  db.set(this.currentJobData.id, job);
  db.set('last', this.currentJobData.id);

  var stats = 'Tested: ' + data.total + ', match: ' + data.match + ', noMatch: ' + data.noMatch + ', skipped: ' + data.skipped;
  var shortStats = [data.total, data.match, data.noMatch, data.skipped].join('/');

  slack.sendEndMsg({
    app: job.app,
    job_id: job_id,
    branch: job.branch,
    stats: stats,
    shortStats: shortStats
  });
}

module.exports = Regression;
