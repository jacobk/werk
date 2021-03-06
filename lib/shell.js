
'use strict';

var RSVP = require('rsvp'),
    _ = require('lodash'),
    exec = require('child_process').exec;

exports.exec = function(cmd) {
  return new RSVP.Promise(function(resolve, reject) {
    exec(cmd, function(error, stdout, stderr) {
      resolve({
        exitCode: _.isNull(error) ? 0 : error.code,
        stdout: stdout,
        stderr: stderr,
        error: error
      });
    });
  });
};