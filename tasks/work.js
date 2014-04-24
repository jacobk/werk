/*
 * grunt-work
 * https://github.com/jacobk/grunt-work
 *
 * Copyright (c) 2014 Jacob Kristhammar
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var _ = require('lodash'),
      RSVP = require('rsvp'),
      moment = require('moment'),
      github = require('./lib/github').init(grunt),
      git = require('./lib/git').init(grunt),
      prompt = require('./lib/prompt').init(grunt),
      shell = require('./lib/shell').init(grunt);


  grunt.registerTask('work', 'Gotta pay your bills', function(taskName) {
    if (arguments.length === 0) {
      grunt.log.writelns(
        'This task will create a new branch and open a pull request on GitHub'
      );
      return;
    }

    var taskDone = this.async(),
        tasks, task;

    tasks = {
      'new': function(repoInfo) {
        return new RSVP.Promise(function(resolve, reject) {
          var pullRequest = {
            tasks: []
          };
          var chain = RSVP.resolve();
          if (repoInfo.isDirty && !grunt.option('yolo')) {
            return reject({
              reason: 'You have staged/pending/uncommited changes.',
              help: 'Please commit or stash any outstanding changes ' +
                    'before running work.'
            });
          }

          grunt.log.writelns(
            'This task will create a new branch (if needed) and open a pull ' +
            'request on GitHub. \n\n' +
            'You will be given the option to edit all of the following ' +
            'responses manually before submitting the PR');


          if (repoInfo.branch.notDefault) {
            grunt.log.subhead('Not on default branch! (' +
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
                grunt.log.ok('Switching to default branch: (' + git.defaultBranch + ')');
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
                  grunt.log.ok();
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
            grunt.log.subhead('Please answer the following:');

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
            grunt.log.subhead('Please add tasks');
            grunt.log.writelns('Add tasks to make it easy to track any ' +
                               'outstanding work for this feature');
            grunt.log.writelns('Give an empty response to indicate no more ' +
                               'tasks');
            return addTask().then(function() {
              grunt.log.ok('Added tasks');
            }).catch(function(reason) {
              grunt.log.error(reason);
            });
          });

          chain = chain.then(function() {
            grunt.log.subhead('Pull request preview');

            grunt.log.writeln(pullRequest.title);
            if (!_.isEmpty(pullRequest.body)) {
              grunt.log.writeln();
              grunt.log.writeln(grunt.log.wraptext(79, pullRequest.body));
            }
            if (!_.isEmpty(pullRequest.tasks)) {
              grunt.log.writeln();
              _.each(pullRequest.tasks, function(task) {
                grunt.log.writeln('- [ ] ' + task);
              });
            }
          });

          chain.then(function() {
            resolve();
          });
        });
      },

      add: function() {
        grunt.log.writelns(
          'This will add a new task to the current PR (if you\'re on a branch ' +
          'with an open PR)'
        );
      },

      status: function(repoInfo) {
        return new RSVP.Promise(function(resolve, reject) {
          github.pullRequest(repoInfo.name).then(function(pullRequests) {
            grunt.log.writeln(JSON.stringify(pullRequests));
          });
          // taskDone(false);
          // setTimeout(function() {
          //   // resolve();
          // }, 10000);
        });
      }
    };

    task = tasks[taskName.toLowerCase()];

    if (_.isUndefined(task)) {
      grunt.log.error('Unknown task: \'' + taskName + '\'' );
      return taskDone(false);
    }

    RSVP.on('error', function(reason) {
      grunt.log.error('RSVP error');
      grunt.log.error(reason.stack);
    });

    github.withGitHubAuth().then(function() {
      return RSVP.hash({
        isDirty: git.isRepoDirty(),
        branch: git.currentBranch(),
        name: git.repoName()
      }).then(function(repoInfo) {
        grunt.log.ok('Got repo info');
        return task(repoInfo).then(function() {
          grunt.log.ok();
          taskDone();
        });
      });
    }).catch(function(reason) {
      grunt.verbose.warn('Failing task');
      if (!_.isUndefined(reason.help)) {
        grunt.log.error(reason.reason);
        grunt.log.writeln(reason.help);
      } else {
        grunt.log.error(reason.stack);
      }
      return taskDone(false);
    });
  });

};
