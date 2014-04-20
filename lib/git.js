
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
        repoOwner = originUrl.match(/:([^/]+)\/.*$/)[1];
        resolve(repoOwner);
      }
    });
  });
};