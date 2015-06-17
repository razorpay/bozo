var Node_Slack = require('node-slack');
var config = require('../config');
var request = require('request');
var logger = require('winston');

var slack = {
  _client: new Node_Slack(config.slack_url),

  _username: config.slack_username,
  _channel: config.slack_channel,

  _send: function(options){
    var payload = {
      text: options.msg,
      channel: this._channel,
      username: this._username,
      unfurl_links: true,
      attachments: [{
        fallback: options.link_msg,
        color:'#2ecc71',
        fields:[
          {
            title: 'App',
            value: options.app,
            'short': true
          },
          {
            title: 'Branch',
            value: options.branch,
            'short': true
          },
          {
            title: 'Status',
            value: options.status,
            'short': true
          },
          {
            title: 'Link',
            value: options.link_msg,
            'short': false
          }
        ]
      }]
    }

    if(typeof options.stats !== 'undefined'){
      payload.attachments[0].fields.push({
        title: 'Stats',
        value: options.stats,
        'short': false
      })
    }

    logger.debug('slack payload', payload);
    if(!config.slack_enabled){
      logger.warn('Slack Message silenced since config.slack_enabled is false');
      return;
    }

    this._client.send(payload);
  },

  sendStartMsg: function(options){
    var link = config.browserstack_sc_url + options.job_id;
    options.link_msg = '<' + link + '|' + link + '>';
    options.msg = 'Bozo has begun visual regression test';

    this._send(options);
  },

  sendEndMsg: function(options){
    var link = config.browserstack_sc_url + options.job_id;
    options.link_msg = '<' + link + '|' + link + '>';
    options.msg = 'Bozo visual regression test has ended';

    if(typeof options.shortStats !== 'undefined'){
      options.msg += ' ' + options.shortStats;
    }

    options.status = 'Completed';

    this._send(options);
  }
}

module.exports = slack;
