var RSVP = require('rsvp'),
    _ = require('lodash'),
    logger = require('../logger'),
    github = require('../github'),
    config = require('../config'),
    symbols = require('../symbols');

function TodoCmd() {}

module.exports = TodoCmd;

TodoCmd.shortDesc = 'list all tasks from current PR';

TodoCmd.run = function(repoInfo) {
  var tasks, doneCount, todoCount, totalCount;
  return new RSVP.Promise(function(resolve, reject) {
    github.pullRequestsForCurrentBranch(repoInfo).then(function(pullRequest) {
      tasks = github.extractTasks(pullRequest.body);
      totalCount = tasks.doneCount + tasks.todoCount;

      logger.log.subhead('Todo \'' + pullRequest.title + '\'');

      if (totalCount === 0) {
        logger.log.warn('O-Oh! No tasks!');
        logger.log.writelns('Add some with ' + 'werk add'.underline);
      } else {
        _.each(tasks.tasks, function(task) {
          if (config.get('cool_fonts')) {
            logger.log.write(symbols[task.done ? 'done' : 'todo']);
          } else {
            logger.log.write((task.done ? symbols.uncool.done : symbols.uncool.todo));
          }
          logger.log.write(' ');
          logger.log.writelns(task.task);
        });
        logger.log.write(('' + totalCount).cyan + ' tasks');
        logger.log.write(' (' + (tasks.doneCount + ' completed').green + ', ');
        logger.log.write((tasks.todoCount + ' remaining').yellow + ')');
        logger.log.writeln('');
      }
      resolve();
    });
  });
};