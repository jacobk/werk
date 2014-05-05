var RSVP = require('rsvp'),
    logger = require('../logger'),
    github = require('../github')
    config = require('../config'),
    symbols = require('../symbols');

function InfoCmd() {}

module.exports = InfoCmd;

InfoCmd.shortDesc = 'show info for current PR';

InfoCmd.run = function(repoInfo) {
  var donePattern = /- \[x\]/g,
      todoPattern = /- \[ \]/g,
      body;
  return new RSVP.Promise(function(resolve, reject) {
    github.pullRequestsForCurrentBranch(repoInfo).then(function(pullRequest) {
      logger.log.subhead(pullRequest.title);
      if (config.get('cool_fonts')) {
        body = pullRequest.body.replace(donePattern, symbols.done)
                               .replace(todoPattern, symbols.todo);
      } else {
        body = pullRequest.body.replace(donePattern, symbols.uncool.done)
                               .replace(todoPattern, symbols.uncool.todo);
      }
      logger.log.writelns(body);
      resolve();
    }).catch(function(reason) {
      reject(reason);
    });
  });
};
