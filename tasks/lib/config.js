
'use strict';

exports.init = function(grunt) {

  var exports = {},
      configFile = grunt.config('work.github_config');

  exports.configFile = configFile;

  var load = function() {
    var config;
    if (grunt.file.exists(configFile)) {
      config = grunt.file.readJSON(configFile);
    } else {
      config = {};
    }
    return config
  };

  var write = function(config) {
    grunt.file.write(configFile, JSON.stringify(config, null, 2));
  };

  exports.get = function(key) {
    return load()[key];
  };

  exports.set = function(key, value) {
    var config = load();
    config[key] = value;
    write(config);
  };

  return exports;
};