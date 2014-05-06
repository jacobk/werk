
var fs = require('fs'),
    RSVP = require('rsvp'),
    _ = require('lodash'),
    editor = require('editor'),
    tmp = require('tmp'),
    logger = require('../logger'),
    git = require('../git'),
    shell = require('../shell'),
    prompt = require('../prompt'),
    github = require('../github');

function NewCmd() {}

module.exports = NewCmd;

NewCmd.shortDesc = 'open a new PR';

NewCmd.run = function(repoInfo) {
  var pullRequest = {
        tasks: [],
        title: null,
        body: null,
        base: git.defaultBranch
      },
      shouldCreateBranch = true,
      newBranchName;

  // Helper functions
  //

  function emptyHandler(value) {
    return value !== 'empty' ? value : '';
  }

  function addTask() {
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
          pullRequest.tasks.push(answers.task);
          addTask().then(function() {
            resolve();
          });
        }
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  // Individual steps in the process.
  //

  function askToSwitchBranchIfNeeded() {
    if (repoInfo.branch.notDefault) {
      logger.log.subhead('Not on default branch! (' +
        repoInfo.branch.name + ' !== ' + git.defaultBranch + ')');

      return prompt.confirm('Use this branch?', false).then(function(didConfirm) {
        if (didConfirm) {
          shouldCreateBranch = false;
          return true;
        } else {
          logger.log.ok('Switching to default branch: (' + git.defaultBranch + ')');
          return shell.exec('git checkout ' + git.defaultBranch);
        }
      });
    } else {
      return RSVP.resolve();
    }
  }

  function askForTitleAndBody() {
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
  }

  function askForTasks() {
    logger.log.writelns('Give an empty response to indicate no more ' +
                       'tasks');
    return addTask().then(function() {
      logger.log.ok('Added tasks');
    }).catch(function(reason) {
      logger.log.error(reason);
    });
  }

  function showPullRequestPreview() {
    var body = [];
    if (!_.isEmpty(pullRequest.body)) {
      body.push(logger.log.wraptext(79, pullRequest.body));
    }
    if (!_.isEmpty(pullRequest.tasks)) {
      body.push('');
      _.each(pullRequest.tasks, function(task) {
        body.push('- [ ] ' + task);
      });
    }
    pullRequest.body = body.join('\n');

    logger.log.subhead(pullRequest.title);
    logger.log.writelns(pullRequest.body);

    return true;
  }

  function askToEditPullRequest() {
    return prompt.confirm('Edit body?', false).then(function(didConfirm) {
      return new RSVP.Promise(function(resolve, reject) {
        if (didConfirm) {
          tmp.file(function(err, path, fd) {
            if (err) {
              return reject({
                reason: 'Unable to create tmp file',
                help: err
              });
            }
            fs.writeSync(fd, pullRequest.body);
            editor(path, function(code, sig) {
              // TODO: Handle if nothing actually saved + other errors
              pullRequest.body = fs.readFileSync(path).toString();
              logger.log.writelns('Successfuly edited');
              return resolve(pullRequest);
            });
          });
        } else {
          resolve(pullRequest);
        }
      });
    });
  }

  function createNewBranchIfNeeded() {
    if (shouldCreateBranch) {
      return new RSVP.Promise(function(resolve, reject) {
        newBranchName = pullRequest.title
          .trim().replace(/[^0-9a-z ]/gi, '').replace(/\s+/g, '_')
          .toLowerCase();
        return prompt.get([{
          name: 'branchName',
          description: 'Branch name',
          required: true,
          default: newBranchName
        }]).then(function(answers) {
          newBranchName = answers.branchName;
          logger.log.ok('Creating and checking out branch: \'' + newBranchName + '\'');
          git.createAndCheckoutBranch(answers.branchName).then(function() {
            pullRequest.branchName = newBranchName;
            resolve(pullRequest);
          }).catch(function(reason) {
            reject(reason);
          });
        }).catch(function(reason) {
          reject(reason);
        });
      });
    } else {
      pullRequest.branchName = repoInfo.branch.name;
      return pullRequest;
    }
  }

  function createEmptyCommitIfNeeded() {
    return new RSVP.Promise(function(resolve, reject) {
      var commitMessage;
      git.isBranchAhead().then(function(isAhead) {
        if (!shouldCreateBranch && isAhead) {
          // No empty commit needed
          logger.log.writelns('Stuff already commited to this branch. Ready for PR');
          resolve(pullRequest);
        } else {
          commitMessage = 'Starting work on ' + pullRequest.branchName;
          logger.log.ok('Creating empty commit to start of PR: \'' +
                        commitMessage + '\'');
          git.createEmptyCommit(commitMessage)
            .then(function() {
              resolve(pullRequest);
            }).catch(function(reason) {
              reject(reason);
            });
        }
      }).catch(function(reason) {
        reject(reason);
      });
    });
  }

  function pushToRemote() {
    logger.log.ok('Pushing branch to origin');
    return git.pushToOrigin(pullRequest.branchName);
  }

  function openPullRequest() {
    logger.log.ok('Creating pull request on GitHub');
    return github.openPullRequest(repoInfo, pullRequest).then(function(pr) {
      logger.log.ok('Created PR ' + pr.html_url);
    });
  }


  if (repoInfo.isDirty) {
    return RSVP.reject({
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

  return askToSwitchBranchIfNeeded()
    .then(askForTitleAndBody)
    .then(askForTasks)
    .then(showPullRequestPreview)
    .then(askToEditPullRequest)
    .then(createNewBranchIfNeeded)
    .then(createEmptyCommitIfNeeded)
    .then(pushToRemote)
    .then(openPullRequest);
};