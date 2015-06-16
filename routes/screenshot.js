var express = require('express');
var router = express.Router();
var config = require('../config');
var Screenshot = require('../lib/screenshot');
var logger = require('winston');

/**
 * POST request by wercker
 */
router.post('/:id', function(req, res, next) {
  var id = req.params.id;

  if(!config.allowed_urls[id]){
    res.json({
      error: 'invalid id passed',
      field: 'id'
    });
    return;
  }

  var url = config.allowed_urls[id].url;
  var screenshot = new Screenshot(url).shoot(function(err, job_id){
    if(err){
      logger.error(err);
      res.json({
        error: err
      })
      return;
    }
    res.json({
      'status': 'Job queued',
      'job_id': job_id,
      'url': config.browserstack_sc_url + '.json'
    });
  });
});

module.exports = router;
