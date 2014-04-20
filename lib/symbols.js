exports.done = '✓'.green;
exports.todo = '✖'.red;

exports.uncoolDone = '['.cyan + 'x'.green + ']'.cyan;
exports.uncoolTodo = '[ ]'.cyan;

// With node.js on Windows: use symbols available in terminal default fonts
if (process && process.platform === 'win32') {
  exports.done = '\u221A'.green;
  exports.todo = '\u00D7'.red;
}
