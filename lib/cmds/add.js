var RSVP = require('rsvp'),
    prompt = require('../prompt'),
    logger = require('../logger'),
    github = require('../github');

function AddCmd() {}

module.exports = AddCmd;

AddCmd.shortDesc = 'Will add a task to the PR for this branch';

AddCmd.run = function(repoInfo) {
  return new RSVP.Promise(function(resolve, reject) {
    var taskPrefix = '- [ ] ',
        task, body, id, chain;
    github.pullRequestsForCurrentBranch(repoInfo).then(function(pullRequest) {
      id = pullRequest.number;

      chain = prompt.get([{
        name: 'task',
        description: 'Describe task',
        required: true
      }]).then(function(answers) {
        task = answers.task;
        return true;
      });

      chain.then(function() {
        logger.log.subhead('Are you sure you want to add task:');
        logger.log.writelns(task);

        prompt.get([{
          name: 'confirm',
          description: 'Create task?',
          default: 'Y/n',
          pattern: /^(y(es)?|no?|y\/n)$/i,
          message: 'Please answer y or n',
          required: true,
          before: function(value) {
            return value === 'Y/n' ? 'y' : value;
          }
        }]).then(function(answers) {
          if (/^n/.test(answers.stay)) {
            logger.log.ok('Adding new task');
            resolve();
          } else {
            return true;
          }
        });
      });
    }).catch(function(reason) {
      reject(reason);
    });
  });
};
