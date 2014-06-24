
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

exports.confirm = function(description, defaultYes) {
  var defaultValue = defaultYes ? 'Y/n' : 'y/N';
  return new RSVP.Promise(function(resolve, reject) {
    exports.get([{
      name: 'confirm',
      description: description,
      default: defaultValue,
      pattern: /^(y(es)?|no?|y\/n)$/i,
      message: 'Please answer y or n',
      required: true,
      before: function(value) {
        return value === defaultValue ? (defaultYes ? 'y' : 'n') : value;
      }
    }]).then(function(answers) {
      resolve(/^y/i.test(answers.confirm));
    }).catch(function(reason) {
      reject({
        reason: 'Failed to prompt for confirmation',
        help: reason
      });
    });
  });
};