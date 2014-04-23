
'use strict';

exports.init = function(grunt) {

  var RSVP = require('rsvp'),
      shell = require('./shell').init(grunt);

  var exports = {},
      defaultBranch = grunt.config('work.default_branch');

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
          isNotDefaultBranch: branchName !== defaultBranch
        });
      });
    });
  };

  return exports;
};