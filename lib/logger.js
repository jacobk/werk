
'use strict';

var grunt = require('grunt'),
    config = require('./config');

exports.log = grunt.log;
exports.verbose = grunt.verbose;
exports.init = function() {
  if (!config.get('cool_colors')) {
    grunt.option('color', false);
    grunt.log.initColors();
  }
  if (config.get('verbose')) {
    grunt.option('verbose', true);
  }
};