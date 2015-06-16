var dirty = require('dirty');
var config = require('../config');
var logger = require('winston');

var db = dirty(__dirname + '/../dirty.db');

db.on('load', function(){
  logger.info('DB loaded');
})
module.exports = db;
