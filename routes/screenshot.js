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
  job.state = 'completed';
  job.data = data;
  db.set(data.id, job);

  var mainJob = db.get(job.parent);
  mainJob.completed++;

  if(mainJob.completed === mainJob.jobs.length){
    mainJob.state = 'completed';
  }
  db.set(job.parent, mainJob);

  if(mainJob.state === 'completed'){
    new Regression(job.parent);
  }

  res.send(job)
})

router.get('/report/:id', function(req, res, next){
  var job_id = req.params.id;
  var data = db.getJobData(job_id);
  data.screenshots = db.indexJobData(data).indexed;

  var prevData = db.getJobData(data.last);
  prevData.screenshots = db.indexJobData(prevData).indexed;

  var report = [];
  for(var i in data.stats.noMatchData){
    var signature = data.stats.noMatchData[i];
    data.screenshots[signature].prev_image_url = prevData.screenshots[signature].image_url;
    report.push(data.screenshots[signature]);
  }
  res.render('report', {
    info: data,
    report: report
  });
})

/**
 * POST request by wercker
 */
router.post('/:appid', function(req, res, next) {
  var appid = req.params.appid;
  var branch = req.body.branch;
  var target = req.body.target;
  var mainID = req.body.commit;
  if(!mainID){
    mainID = app + '-' + Math.random();
  }

  if(!config.allowed_urls[appid]){
    res.json({
      error: 'invalid id passed',
      field: 'appid'
    });
    return;
  }

  var url = config.allowed_urls[appid]['url'][target];
  var app = config.allowed_urls[appid].name;
  var screenshot = new Screenshot(url).shoot(function(err, job_ids){
    if(err){
      logger.error(err);
      res.json({
        error: err
      })
      return;
    }

    db.set(mainID, {
      appid: appid,
      app: app,
      branch: branch,
      jobs: job_ids,
      state: 'pending',
      completed: 0
    });

    for(var i in job_ids){
      db.set(job_ids[i], {
        parent: mainID,
        state: 'pending'
      })
    }

    slack.sendStartMsg({
      app: app,
      job_ids: job_ids,
      branch: branch
    });

    res.json({
      'state': 'Job queued',
      'job_id': job_ids
    });
  });
});

module.exports = router;
