var RSVP = require('rsvp'),
    logger = require('../logger');

function SnapCmd() {}

module.exports = SnapCmd;

SnapCmd.run = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    if (process.platform !== 'darwin') {
      reject({
        reason: 'snap'.underline + ' is currently only available on OS X',
        help: 'https://www.youtube.com/watch?v=l2-UuIEOcss'
      });
    } else {

    }
  });
};
