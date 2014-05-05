#!/usr/bin/env node

/*
 * https://github.com/jacobk/werk
 *
 * Copyright (c) 2014 Jacob Kristhammar
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash'),
    RSVP = require('rsvp'),
    moment = require('moment'),
    grunt = require('grunt'),
    logger = require('../lib/logger'),
    github = require('../lib/github'),
    git = require('../lib/git'),
    prompt = require('../lib/prompt'),
    shell = require('../lib/shell'),
    help = require('../lib/cmds/help'),
    argv = require('minimist')(process.argv.slice(2)),
    cmdName, cmd;

logger.init();

if (argv._.length === 0) {
  help.run();
  process.exit(1);
}

cmdName = argv._[0].toLowerCase();

try {
  cmd = require('../lib/cmds/' + cmdName);
} catch(e) {
  logger.log.error('Unknown command: \'' + cmdName.underline + '\'');
  process.exit(1);
}

logger.verbose.write('Gathering repo info...');
RSVP.hash({
  isDirty: git.isRepoDirty(),
  branch: git.currentBranch(),
  name: git.repoName(),
  owner: git.repoOwner()
}).then(function(repoInfo) {
  logger.verbose.ok();
  logger.log.ok('Will ' + cmd.shortDesc);
  return github.withGitHubAuth().then(function() {
    return cmd.run(repoInfo).then(function() {
      logger.log.ok();
    });
  });
}).catch(function(reason) {
  if (!_.isUndefined(reason.help)) {
    logger.log.fail(reason.reason);
    logger.log.writeln(reason.help);
  } else {
    logger.log.error(reason);
    logger.log.error(reason.stack);
  }
});


// Try not to miss unhandled RSVP errors
RSVP.on('error', function(reason) {
  logger.log.error('RSVP error');
  if (reason.stack) {
    logger.log.error(reason.stack);
  } else {
    logger.log.error(JSON.stringify(reason));
  }
});
