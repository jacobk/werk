var RSVP = require('rsvp'),
    open = require('open'),
    logger = require('../logger'),
    github = require('../github');

function OpenCmd() {}

module.exports = OpenCmd;

OpenCmd.shortDesc = 'open current PR in browser';

OpenCmd.run = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    github.pullRequestsForCurrentBranch(repoInfo).then(function(pullRequest) {
      open(pullRequest.html_url);
      resolve();
    }).catch(function(reason) {
      reject(reason);
    });
  });
};
