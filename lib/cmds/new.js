
var RSVP = require('rsvp'),
    _ = require('lodash'),
    logger = require('../logger'),
    git = require('../git'),
    shell = require('../shell'),
    prompt = require('../prompt');

function NewCmd() {}

module.exports = NewCmd;

NewCmd.shortDesc = 'Will open a new PR';

NewCmd.run = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    var pullRequest = {
      tasks: []
    };
    var chain = RSVP.resolve();
    if (repoInfo.isDirty) {
      return reject({
        reason: 'You have staged/pending/uncommited changes.',
        help: 'Please commit or stash any outstanding changes ' +
              'before running work.'
      });
    }

    logger.log.writelns(
      'This task will create a new branch (if needed) and open a pull ' +
      'request on GitHub. \n\n' +
      'You will be given the option to edit all of the following ' +
      'responses manually before submitting the PR');


    if (repoInfo.branch.notDefault) {
      logger.log.subhead('Not on default branch! (' +
        repoInfo.branch.name + ' !== ' + git.defaultBranch + ')');
      chain = prompt.get([{
        name: 'stay',
        description: 'Use this branch',
        default: 'y/N',
        pattern: /^(y(es)?|no?|y\/n)$/i,
        message: 'Please answer y or n',
        required: true,
        before: function(value) {
          return value === 'y/N' ? 'n' : value;
        }
      }]).then(function(answers) {
        if (/^n/.test(answers.stay)) {
          logger.log.ok('Switching to default branch: (' + git.defaultBranch + ')');
          return shell.exec('git checkout ' + git.defaultBranch);
        } else {
          return true;
        }
      });
    }

    var emptyHandler = function(value) {
      return value !== 'empty' ? value : '';
    };

    var addTask = function() {
      return new RSVP.Promise(function(resolve, reject) {
        prompt.get([{
          name: 'task',
          description: 'Task',
          required: true,
          default: 'empty',
          before: emptyHandler
        }]).then(function(answers) {
          if (_.isEmpty(answers.task)) {
            resolve();
          } else {
            logger.log.ok();
            pullRequest.tasks.push(answers.task);
            addTask().then(function() {
              resolve();
            });
          }
        }).catch(function(reason) {
          reject(reason);
        });
      });
    };

    chain = chain.then(function() {
      logger.log.subhead('Please answer the following:');

      return prompt.get([{
        name: 'title',
        description: 'Pull Request Title',
        type: 'string',
        required: true
      }, {
        name: 'body',
        description: 'Why is this work needed?',
        type: 'string',
        default: 'empty',
        before: emptyHandler
      }]).then(function(answers) {
        pullRequest.title = answers.title;
        pullRequest.body = answers.body;
        return true;
      });
    });

    chain = chain.then(function() {
      logger.log.subhead('Please add tasks');
      logger.log.writelns('Add tasks to make it easy to track any ' +
                         'outstanding work for this feature');
      logger.log.writelns('Give an empty response to indicate no more ' +
                         'tasks');
      return addTask().then(function() {
        logger.log.ok('Added tasks');
      }).catch(function(reason) {
        logger.log.error(reason);
      });
    });

    chain = chain.then(function() {
      logger.log.subhead('Pull request preview');

      logger.log.writeln(pullRequest.title);
      if (!_.isEmpty(pullRequest.body)) {
        logger.log.writeln();
        logger.log.writeln(logger.log.wraptext(79, pullRequest.body));
      }
      if (!_.isEmpty(pullRequest.tasks)) {
        logger.log.writeln();
        _.each(pullRequest.tasks, function(task) {
          logger.log.writeln('- [ ] ' + task);
        });
      }
    });

    chain.then(function() {
      resolve();
    });
  });
};