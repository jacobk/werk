var fs = require('fs'),
    _ = require('lodash'),
    RSVP = require('rsvp'),
    logger = require('../logger');

function HelpCmd() {}

HelpCmd.shortDesc = 'show werk help';

module.exports = HelpCmd;

HelpCmd.run = function() {
  var files = fs.readdirSync(__dirname),
      maxLength = 0,
      commands = _.map(files, function(f) {
        maxLength = Math.max(maxLength, f.length);
        return {
          name: f.split('.')[0],
          desc: require('./' + f).shortDesc
        };
      }),
      columns;

  columns = [maxLength + 5, 75 - maxLength];
  logger.log.writelns('usage: werk [--no-cool-colors] [--no-cool-fonts] ' +
                      '[--global] [--auth] <command>');
  logger.log.writeln();
  logger.log.writelns('Available werk commands are:');
  _.each(commands, function(command) {
    logger.log.writeln(logger.log.table(columns, ['   ' + command.name, command.desc]));
  });
  logger.log.writeln();
  logger.log.writelns('--global stores config values in global config ' +
                      'intead of locally in current folder.');
  logger.log.writelns('--auth forces a re-auth with GitHub');
  return RSVP.resolve();
};