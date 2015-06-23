var express = require('express');
var router = express.Router();
var config = require('../config');
var Screenshot = require('../lib/screenshot');
var logger = require('winston');
var slack = require('../lib/slack');
var db = require('../lib/db');
var Regression = require('../lib/regression');

/**
 * Browserstack hits this endpoint when the task is done
 */
router.post('/cb', function(req, res, next){
  var data = req.body;
  var job_id = data.id;

  logger.info('Received callback for job: ', data.id);

  var job = db.get(job_id);
  job.status = 'completed';
  db.set(data.id, job);

  var mainJob = db.get(job.parent);
  mainJob.completed++;

  if(mainJob.completed === mainJob.jobs.length){
    mainJob.status = 'completed';
    new Regression(job.parent);
  }

  db.set(job.parent, mainJob);
  res.send(job)
})

/**
 * POST request by wercker
 */
router.post('/:appid', function(req, res, next) {
  var appid = req.params.appid;
  var branch = req.body.branch;

  if(!config.allowed_urls[appid]){
    res.json({
      error: 'invalid id passed',
      field: 'appid'
    });
    return;
  }

  var url = config.allowed_urls[appid].url;
  var app = config.allowed_urls[appid].name;
  var screenshot = new Screenshot(url).shoot(function(err, job_ids){
    if(err){
      logger.error(err);
      res.json({
        error: err
      })
      return;
    }

    var mainID = app + '/' + Math.random();
    db.set(mainID, {
      appid: appid,
      app: app,
      branch: branch,
      jobs: job_ids,
      status: 'pending',
      completed: 0
    });

    for(var i in job_ids){
      db.set(job_ids[i], {
        parent: mainID,
        status: 'pending'
      })
    }

    slack.sendStartMsg({
      app: app,
      job_ids: job_ids,
      branch: branch
    });

    res.json({
      'status': 'Job queued',
      'job_id': job_ids
    });
  });
});

module.exports = router;
