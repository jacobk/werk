
'use strict';

var prompt = require('prompt'),
    RSVP = require('rsvp');

exports.init = function(grunt) {

  var exports = {};

  prompt.message = '[' + '?'.green + ']';
  prompt.delimiter = ' ';

  exports.get = function(properties) {
    return new RSVP.Promise(function(resolve, reject) {
      prompt.start();
      prompt.get(properties, function(err, answers) {
        if (err) {
          reject(err);
        } else {
          resolve(answers);
        }
      });
    });
  };

  return exports;
};