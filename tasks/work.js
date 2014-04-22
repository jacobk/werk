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
        grunt.log.writeln('Authenticated with GitHub as \'' +
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
          console.log(JSON.stringify(result));
          resolve(result.exitCode === 0);
        });
      });
    };

    var tasks = {
      'new': function() {
        isRepoDirty();

        grunt.log.writelns(
          'This task will create a new branch and open a pull request on GitHub'
        );

        grunt.log.subhead('Please answer the following:');

        var titlePromise = promptPromise([{
          name: 'title',
          description: 'Pull Request Title',
          type: 'string',
          required: true
        }]);

        titlePromise.then(function(answers) {
          grunt.log.writeln(JSON.stringify(answers));
        });

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
      taskDone();
      return;
    }

    ensureGithubAuth().then(_.bind(function() {
      task.apply(this);
    }, this)).catch(function(reason) {
      grunt.log.error('No work for u: ' + reason);
      taskDone();
    });







    // taskDone();
    // // FIXME Remove this stuff
    // var options = this.options({
    //   punctuation: '.',
    //   separator: ', '
    // });


    // var schema = {
    //     properties: {
    //       name: {
    //         description: 'Enter your name',
    //         pattern: /^[a-zA-Z\s\-]+$/,
    //         message: 'Name must be only letters, spaces, or dashes',
    //         required: true
    //       },
    //       password: {
    //         hidden: true
    //       }
    //     }
    //   };

    // // TODO Find out how to add more tasks incrementally


    // //
    // // Start the prompt
    // //
    // prompt.start();

    // //
    // // Get two properties from the user: email, password
    // //
    // prompt.get(schema, function (err, result) {
    //   //
    //   // Log the results.
    //   //
    //   console.log('Command-line input received:');
    //   console.log('  name: ' + result.name);
    //   console.log('  password: ' + result.password);
    //   taskDone();
    // });

    // Iterate over all specified file groups.
    // this.files.forEach(function(f) {
    //   // Concat specified files.
    //   var src = f.src.filter(function(filepath) {
    //     // Warn on and remove invalid source files (if nonull was set).
    //     if (!grunt.file.exists(filepath)) {
    //       grunt.log.warn('Source file "' + filepath + '" not found.');
    //       return false;
    //     } else {
    //       return true;
    //     }
    //   }).map(function(filepath) {
    //     // Read file source.
    //     return grunt.file.read(filepath);
    //   }).join(grunt.util.normalizelf(options.separator));

    //   // Handle options.
    //   src += options.punctuation;

    //   // Write the destination file.
    //   grunt.file.write(f.dest, src);

    //   // Print a success message.
    //   grunt.log.writeln('File "' + f.dest + '" created.');
    // });
  });

};
