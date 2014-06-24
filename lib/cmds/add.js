var RSVP = require('rsvp'),
    prompt = require('../prompt'),
    logger = require('../logger'),
    github = require('../github');

function AddCmd() {}

module.exports = AddCmd;

AddCmd.shortDesc = 'add a task to the PR for this branch';

AddCmd.run = function(repoInfo) {
  var taskPrefix = '- [ ] ';

  function askForTask(pullRequest) {
    return prompt.get([{
      name: 'task',
      description: 'Describe task',
      required: true
    }]).then(function(answers) {
      pullRequest.body +=  '\n' + taskPrefix + answers.task;
      return pullRequest;
    });
  }

  function confirmCreation(pullRequest) {
    return prompt.confirm('Create task?', true).then(function(didConfirm) {
      if (didConfirm) {
        logger.log.ok('Adding new task...');
        return github.updatePullRequest(repoInfo, {
          number: pullRequest.number,
          title: pullRequest.title,
          body: pullRequest.body
        }).then(function(updatedPullRequest) {
          logger.log.ok('Task successfuly added!');
        });
      } else {
        logger.log.warn('No task added. Canceled');
      }
    });
  }

  return github.pullRequestsForCurrentBranch(repoInfo)
    .then(askForTask)
    .then(confirmCreation);
};
