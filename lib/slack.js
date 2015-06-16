var Node_Slack = require('node-slack');
var config = require('../config');
var request = require('request');
var logger = require('winston');

var slack = {
  _client: new Node_Slack(config.slack_url),

  _username: config.slack_username,
  _channel: config.slack_channel,

  sendStartMsg: function(app, branch, job_id){
    var link = config.browserstack_sc_url + job_id;
    var link_msg = '<' + link + '|' + link + '>';

    var msg = 'Bozo has begun visual regression test';
    var payload = {
      text: msg,
      channel: this._channel,
      username: this._username,
      unfurl_links: true,
      attachments: [{
        fallback: link_msg,
        color:'#D00000',
        fields:[
          {
            title: 'App',
            value: app,
            'short': false
          },
          {
            title: 'Branch',
            value: branch,
            'short': false
          },
          {
            title: 'Link',
            value: link_msg,
            'short': false
          }
        ]
      }]
    }

    logger.debug('slack payload', payload);
    if(!config.slack_enabled){
      logger.debug('Slack Message silenced since config.slack_enabled is false');
      return;
    }

    this._client.send(payload);
  }
}

module.exports = slack;
