// https://github.com/mikedeboer/node-github

'use strict';

var RSVP = require('rsvp'),
    GitHubApi = require("github"),
    moment = require('moment'),
    _ = require('lodash'),
    logger = require('./logger'),
    config = require('./config'),
    prompt = require('./prompt'),
    github = new GitHubApi({
      // required
      version: "3.0.0",
      // optional
      // debug: true,
      protocol: "https",
      timeout: 5000
    });

var createGithubAuth = function() {
  return new RSVP.Promise(function(resolve, reject) {
    logger.log.subhead('You need to authenticate with GitHub');
    logger.log.writelns('An access token will be created and stored in ' +
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
      logger.verbose.write('Autenticating with GitHub using password...');
      github.authenticate({
        type: 'basic',
        username: answers.user,
        password: answers.password
      });
      logger.verbose.ok();
      logger.verbose.write('Creating Authorization with scope: \'repo\'...');
      github.authorization.create({
          scopes: ['repo'],
          note: 'werk (' + moment().format('MMMM Do YYYY, h:mm:ss a') + ')',
          note_url: "https://github.com/jacobk/werk"
      }, function(err, res) {
          if (!err && res.token) {
            logger.verbose.ok();
            resolve({user: answers.user, token: res.token});
          } else {
            reject('GitHub authorization failed');
          }
      });
    });
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
      logger.verbose.writeln('Authenticated with GitHub as \'' +
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

exports.pullRequest = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    var options = {
      repo: repoInfo.name,
      user: repoInfo.owner,
      state: 'open'
    };
    logger.verbose.write('Getting pull request info...');
    github.pullRequests.getAll(options, function(err, res) {
      if (!err) {
        logger.verbose.ok();
        resolve(res);
      } else {
        reject({
          reason: 'Failed to get pull requests from GitHub',
          help: JSON.stringify(err)
        });
      }
    });
  });
};

exports.pullRequestsForCurrentBranch = function(repoInfo) {
  var pr;
  return new RSVP.Promise(function(resolve, reject) {
    exports.pullRequest(repoInfo).then(function(pullRequests) {
      pr = _.find(pullRequests, function(pullRequest) {
        return pullRequest.head.ref === repoInfo.branch.name;
      });
      if (!pr) {
        return reject({
          reason: 'No open PR for branch: \'' + repoInfo.branch.name + '\'',
          help: 'Make sure that the branch you want the status for is ' +
                'currently checked out.'
        });
      }
      resolve(pr);
    }).catch(function(reason) {
      return reject(reason);
    });
  });
};

exports.updatePullRequest = function(repoInfo, pullRequest) {
  return new RSVP.Promise(function(resolve, reject) {
    logger.verbose.write('Updating pull request (number ' + pullRequest.number + ')...');
    var options = _.extend({}, pullRequest, {
      repo: repoInfo.name,
      user: repoInfo.owner
    });
    github.pullRequests.update(options, function(err, res) {
      if (!err) {
        logger.verbose.ok();
        resolve(res);
      } else {
        reject({
          reason: 'Failed to update pull requests from GitHub',
          help: JSON.stringify(err)
        });
      }
    });
  });
};

exports.extractTasks = function(body) {
  var rawTasks = body.match(/^- \[( |x)\](.*)$/gm),
      tasks = [],
      doneCount = 0,
      todoCount = 0,
      match, isDone;
  _.each(rawTasks, function(rawTask) {
    match = /- \[(.)\] (.*)/.exec(rawTask);
    isDone = match[1] === 'x';
    if (isDone) {
      doneCount++;
    } else {
      todoCount++;
    }
    tasks.push({done: isDone, task: match[2]});
  });

  return {
    tasks: tasks,
    doneCount: doneCount,
    todoCount: todoCount
  };
};