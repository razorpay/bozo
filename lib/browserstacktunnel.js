var BrowserStackTunnelWrapper = require('browserstacktunnel-wrapper');
var request                   = require('request');
var parseResponse             = require('./parseresponse');
var util                      = require('util');
var EventEmitter              = require('events').EventEmitter;
var logger                    = require('winston');

logger.cli();
logger.level = 'debug';

function BrowserStackTunnel(userConfig){
  var config = userConfig || {};
  config.key = config.key || process.env.BROWSERSTACK_ACCESS_KEY;

  if(!config.key){
    throw new Error('No key passed');
  }

  if (!config.tunnelIdentifier) {
    config.tunnelIdentifier = 'bozo-' + Math.random();
  }

  config.v = true;
  config.hosts = [{
      name: 'localhost',
      port: 4000,
      sslFlag: 0
    }];

  logger.info('config used:', config);
  logger.debug('initiating tunnel object');

  this.tunnel = new BrowserStackTunnelWrapper(config);
  this.config = config;
}

util.inherits(BrowserStackTunnel, EventEmitter);

BrowserStackTunnel.prototype.start = function(){
  var self = this;
  var tunnel = this.tunnel;
  tunnel.start(function(error) {
    if (error) {
      logger.error(error);
      self.emit('error', error);
    } else {
      logger.debug('Tunnel created');
      self.emit('ready');
    }
  });
}

BrowserStackTunnel.prototype.stop = function(){
  var self = this;
  var tunnel = this.tunnel
  tunnel.stop(function(error) {
    if (error) {
      logger.error(error);
      self.emit('error', error);
    } else {
      logger.debug('Tunnel stopped');
      self.emit('stopped');
    }
  });
}

module.exports = BrowserStackTunnel;
