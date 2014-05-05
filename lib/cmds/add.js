var RSVP = require('rsvp'),
    prompt = require('../prompt'),
    logger = require('../logger'),
    github = require('../github');

function AddCmd() {}

module.exports = AddCmd;

AddCmd.shortDesc = 'add a task to the PR for this branch';

AddCmd.run = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    var taskPrefix = '- [ ] ',
        task, body, chain;
    github.pullRequestsForCurrentBranch(repoInfo).then(function(pullRequest) {
      chain = prompt.get([{
        name: 'task',
        description: 'Describe task',
        required: true
      }]).then(function(answers) {
        task = answers.task;
        return true;
      });

      chain = chain.then(function() {
        logger.log.subhead('Are you sure you want to add task:');
        logger.log.writelns(task);

        return prompt.get([{
          name: 'confirm',
          description: 'Create task?',
          default: 'Y/n',
          pattern: /^(y(es)?|no?|y\/n)$/i,
          message: 'Please answer y or n',
          required: true,
          before: function(value) {
            return value === 'Y/n' ? 'y' : value;
          }
        }]);
      });

      chain = chain.then(function(answers) {
        if (/^y/.test(answers.confirm)) {
          logger.log.ok('Adding new task...');
          body = pullRequest.body + '\n- [ ] ' + task;
          github.updatePullRequest(repoInfo, {
            number: pullRequest.number,
            title: pullRequest.title,
            body: body
          }).then(function(updatedPullRequest) {
            logger.log.ok('Task successfuly added!');
            resolve();
          });
        } else {
          logger.log.warn('No task added. Canceled');
        }
      });
      return chain;
    }).catch(function(reason) {
      reject(reason);
    });
  });
};
