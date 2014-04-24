// https://github.com/mikedeboer/node-github

'use strict';

exports.init = function(grunt) {

  var RSVP = require('rsvp'),
      GitHubApi = require("github"),
      moment = require('moment'),
      _ = require('lodash'),
      config = require('./config').init(grunt),
      prompt = require('./prompt').init(grunt);

  var github = new GitHubApi({
        // required
        version: "3.0.0",
        // optional
        // debug: true,
        protocol: "https",
        timeout: 5000
      });

  var exports = {};

  var createGithubAuth = function() {
    return new RSVP.Promise(function(resolve, reject) {
      grunt.log.subhead('You need to authenticate with GitHub');
      grunt.log.writelns('An access token will be created and stored in ' +
        config.configFile
      );

      prompt.get([{
        name: 'user',
        required: true,
        description: 'Enter your GitHub user'
      }, {
        name: 'password',
        hidden: true,
        description: 'Enter your GitHub password',
      }]).then(function(answers) {
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
              resolve({user: answers.user, token: res.token});
            } else {
              reject('GitHub authorization failed');
            }
        });
      });
    });
  };

  var withGitHubConfig = function(options) {
    return _.defaults(options, {
      user: config.get('github_user'),
    });
  };

  var hasCredentials = function() {
    return config.get('github_token') && config.get('github_user');
  };

  exports.withGitHubAuth = function() {
    return new RSVP.Promise(function(resolve, reject) {
      if (hasCredentials()) {
        github.authenticate({
          type: 'oauth',
          token: config.get('github_token')
        });
        grunt.log.ok('Authenticated with GitHub as \'' +
                          config.get('github_user') + '\'');
        resolve(true);
      } else {
        createGithubAuth().then(function(auth) {
          config.set('github_user', auth.user);
          config.set('github_token', auth.token);
          resolve(true);
        }).catch(function(reason) {
          reject(reason);
        });
      }
    });
  };

  exports.pullRequest = function(repo) {
    return new RSVP.Promise(function(resolve, reject) {
      var options = withGitHubConfig({
        repo: repo,
        state: 'open'
      });
      github.pullRequests.getAll(options, function() {
        resolve(arguments);
      });
    });
  }

  return exports;
};