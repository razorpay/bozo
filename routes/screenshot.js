var express = require('express');
var router = express.Router();
var config = require('../config');
var Screenshot = require('../lib/screenshot');
var logger = require('winston');
var slack = require('../lib/slack');
var db = require('../lib/db');

/**
 * Browserstack hits this endpoint when the task is done
 */
router.post('/cb', function(req, res, next){
  var data = req.body;
  var job = db.get(data.id);
  job.status = 'completed';
  db.set(data.id, job);

  slack.sendEndMsg({
    app: job.app,
    job_id: data.id,
    branch: job.branch
  });

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
  var screenshot = new Screenshot(url).shoot(function(err, job_id){
    if(err){
      logger.error(err);
      res.json({
        error: err
      })
      return;
    }

    db.set(job_id, {
      status: 'pending',
      appid: appid,
      app: app,
      branch: branch
    });

    slack.sendStartMsg({
      app: app,
      job_id: job_id,
      branch: branch
    });
    res.json({
      'status': 'Job queued',
      'job_id': job_id,
      'url': config.browserstack_sc_url + '.json'
    });
  });
});

module.exports = router;
