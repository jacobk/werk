// TODO Remove duplication

'use strict';

var RSVP = require('rsvp'),
    path = require('path'),
    _ = require('lodash'),
    config = require('./config'),
    shell = require('./shell'),
    defaultBranch = config.get('default_branch');

exports.defaultBranch = defaultBranch;

exports.isRepoDirty = function() {
  return new RSVP.Promise(function(resolve, reject) {
    var cmds = ['git diff-index --quiet --cached HEAD',
                'git diff-files --quiet'];
    shell.exec(cmds.join(' && ')).then(function(result) {
      resolve(result.exitCode !== 0);
    });
  });
};

exports.currentBranch = function() {
  var branchName;
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git rev-parse --abbrev-ref HEAD').then(function(result) {
      branchName = result.stdout.trim();
      resolve({
        name: branchName,
        notDefault: branchName !== defaultBranch
      });
    });
  });
};

exports.repoName = function() {
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git rev-parse --show-toplevel').then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed to get repo name',
          help: 'Make sure that you\'re currenty in a git repo'
        });
      } else {
        resolve(path.basename(result.stdout.trim()));
      }
    });
  });
};

exports.repoOwner = function() {
  var originUrl, repoOwner;
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git config --get remote.origin.url').then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed to get repo owner',
          help: 'Make sure the repo remote origin points to a GitHub repo'
        });
      } else {
        originUrl = result.stdout.trim();
        if (/^http/.test(originUrl)) {
          repoOwner = originUrl.split('/').slice(-2, -1)[0];
        } else if (/^git@/.test(originUrl)) {
          repoOwner = originUrl.match(/:([^/]+)\/.*$/)[1];
        } else {
          reject({
            reason: 'Failed to get repo owner',
            help: 'Unrecognized remote URL scheme'
          });
        }
        resolve(repoOwner);
      }
    });
  });
};

exports.createAndCheckoutBranch = function(name) {
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git checkout -b ' + name).then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed to create branch',
          help: result.stderr
        });
      } else {
        resolve(name);
      }
    });
  });
};

exports.isBranchAhead = function() {
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git rev-list --count ' + defaultBranch + '...HEAD').then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed to perform git operation',
          help: result.stderr
        });
      } else {
        resolve(parseInt(result.stdout, 10) > 0);
      }
    });
  });
};

// TODO Escape message quotes
exports.createEmptyCommit = function(message) {
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git commit --allow-empty -m "' + message + '"').then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed create empty commit',
          help: result.stderr
        });
      } else {
        resolve(true);
      }
    });
  });
};

exports.pushToOrigin = function(branchName) {
  return new RSVP.Promise(function(resolve, reject) {
    shell.exec('git push -u origin ' + branchName).then(function(result) {
      if (result.error) {
        reject({
          reason: 'Failed push to origin',
          help: result.stderr
        });
      } else {
        resolve(true);
      }
    });
  });
};