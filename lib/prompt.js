
'use strict';

var prompt = require('prompt'),
    RSVP = require('rsvp');

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