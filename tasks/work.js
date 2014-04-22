/*
 * grunt-work
 * https://github.com/jacobk/grunt-work
 *
 * Copyright (c) 2014 Jacob Kristhammar
 * Licensed under the MIT license.
 */

'use strict';

var prompt = require('prompt'),
    _ = require('lodash'),
    GitHubApi = require("github"),
    RSVP = require('rsvp'),
    moment = require('moment'),
    exec = require('child_process').exec;

prompt.message = '[' + '?'.green + ']';
prompt.delimiter = ' ';

module.exports = function(grunt) {

  grunt.registerTask('work', 'Gotta pay your bills', function(taskName) {
    // Merge task-specific and/or target-specific options with these defaults.
    // * work:new (new PR)
    // * work:add (add task)
    // * work:status (show tasks with done/not done)
    // * work:team (who short status for all open PRs)
    // * work:comment (add comment to current PR)

    if (arguments.length === 0) {
      grunt.log.writelns(
        'This task will create a new branch and open a pull request on GitHub'
      );
      return;
    }

    var github = new GitHubApi({
          // required
          version: "3.0.0",
          // optional
          debug: true,
          protocol: "https",
          timeout: 5000
        }),
        configFile = grunt.config('work.github_config'),
        defaultBranch = grunt.config('work.default_branch'),
        taskDone = this.async(),
        config,
        child;

    if (grunt.file.exists(configFile)) {
      config = grunt.file.readJSON(configFile);
    } else {
      config = {
        github_user: null,
        github_token: null
      };
      grunt.file.write(configFile, JSON.stringify(config));
    }

    var hasCredentials = function() {
      return config.github_token && config.github_user;
    };

    var createGithubAuth = function() {
      grunt.log.subhead('You need to authenticate with GitHub');
      grunt.log.writelns('An access token will be created and stored in ' +
        configFile
      );

      var def = RSVP.defer();

      prompt.start();

      prompt.get([{
        name: 'user',
        required: true,
        description: 'Enter your GitHub user'
      }, {
        name: 'password',
        hidden: true,
        description: 'Enter your GitHub password',
      }], function(err, answers) {
        github.authenticate({
          type: 'basic',
          username: answers.user,
          password: answers.password
        });
        github.authorization.create({
            scopes: ['repo'],
            note: 'grunt-work (' + moment().format('MMMM Do YYYY, h:mm:ss a') + ')',
            note_url: "https://github.com/jacobk/grunt-work"
        }, function(err, res) {
            if (!err && res.token) {
                config.github_user = answers.user;
                config.github_token = res.token;
                grunt.file.write(configFile, JSON.stringify(config));
                def.resolve(true);
            } else {
              def.reject();
            }
        });
      });

      return def.promise;
    };

    var ensureGithubAuth = function() {
      if (hasCredentials()) {
        grunt.verbose.ok('Authenticated with GitHub as \'' +
                          config.github_user + '\'');
        return RSVP.resolve();
      } else {
        return createGithubAuth();
      }
    };

    var promptPromise = function(properties) {
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

    var execPromise = function(cmd) {
      return new RSVP.Promise(function(resolve, reject) {
        exec(cmd, function(error, stdout, stderr) {
          resolve({
            exitCode: _.isNull(error) ? 0 : error.code,
            stdout: stdout,
            stderr: stderr
          });
        });
      });
    };

    var isRepoDirty = function() {
      return new RSVP.Promise(function(resolve, reject) {
        var cmds = ['git diff-index --quiet --cached HEAD',
                    'git diff-files --quiet'];
        execPromise(cmds.join(' && ')).then(function(result) {
          resolve(result.exitCode !== 0);
        });
      });
    };

    var currentBranch = function() {
      var branchName;
      return new RSVP.Promise(function(resolve, reject) {
        execPromise('git rev-parse --abbrev-ref HEAD').then(function(result) {
          branchName = result.stdout.trim();
          resolve({
            name: branchName,
            isNotDefaultBranch: branchName !== defaultBranch
          });
        });
      });
    };

    var tasks = {
      'new': function() {
        var def = RSVP.defer();
        RSVP.hash({
          isRepoDirty: isRepoDirty(),
          currentBranch: currentBranch()
        }).then(function(results) {
          var pullRequest = {
            tasks: []
          };
          var prompts = RSVP.resolve();
          if (results.isRepoDirty && !grunt.option('yolo')) {
            return def.reject({
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


          if (results.currentBranch.isNotDefaultBranch) {
            grunt.log.warn('Not on default branch! (' +
              results.currentBranch.name + ' !== ' + defaultBranch + ')');
            prompts = promptPromise([{
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
                grunt.log.ok('Switching to default branch: (' + defaultBranch + ')');
                return execPromise('git checkout ' + defaultBranch);
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
              promptPromise([{
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

          prompts = prompts.then(function() {
            grunt.log.subhead('Please answer the following:');

            return promptPromise([{
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

          prompts = prompts.then(function() {
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

          prompts = prompts.then(function() {
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

          prompts.then(function() {
            def.resolve();
          });
        });

        return def.promise;
      },

      add: function() {
        grunt.log.writelns(
          'This will add a new task to the current PR (if you\'re on a branch ' +
          'with an open PR)'
        );
        taskDone();
      }
    };

    var task = tasks[taskName.toLowerCase()];

    if (_.isUndefined(task)) {
      grunt.log.error('Unknown task: \'' + taskName + '\'' );
      return taskDone(false);
    }

    ensureGithubAuth().then(_.bind(function() {
      return task.apply(this).then(function() {
        taskDone();
      });
    }, this)).catch(function(reason) {
      grunt.log.error(reason.reason);
      if (!_.isUndefined(reason.help)) {
        grunt.log.writeln(reason.help);
      }
      return taskDone(false);
    });
  });

};
