var express = require('express');
var router = express.Router();
var config = require('../config');
var Screenshot = require('../lib/screenshot');
var logger = require('winston');
var slack = require('../lib/slack');

/**
 * POST request by wercker
 */
router.post('/:id', function(req, res, next) {
  var id = req.params.id;
  var branch = req.params.branch;

  if(!config.allowed_urls[id]){
    res.json({
      error: 'invalid id passed',
      field: 'id'
    });
    return;
  }

  var url = config.allowed_urls[id].url;
  var app = config.allowed_urls[id].name;
  var screenshot = new Screenshot(url).shoot(function(err, job_id){
    if(err){
      logger.error(err);
      res.json({
        error: err
      })
      return;
    }
    slack.sendStartMsg(app, branch, job_id);
    res.json({
      'status': 'Job queued',
      'job_id': job_id,
      'url': config.browserstack_sc_url + '.json'
    });
  });
});

module.exports = router;
