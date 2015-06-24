var dirty = require('dirty');
var config = require('../config');
var logger = require('winston');

var db = dirty(__dirname + '/../dirty.db');

/**
 * Takes parent job id,
 * which is of format
 *    checkout-0.123123123123123
 */
db.getJobData = function(id){
  var parentJob = db.get(id);
  if(!parentJob){
    return null;
  }
  var screenshots = [];
  for(var i in parentJob.jobs){
    var jobID = parentJob.jobs[i];
    var jobData = db.get(jobID);
    screenshots = screenshots.concat(jobData.data.screenshots);
  }
  parentJob.id = id;
  parentJob.screenshots = screenshots;
  return parentJob;
}

db.indexJobData = function(data){
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

db.on('load', function(){
  logger.info('DB loaded');
})
module.exports = db;
