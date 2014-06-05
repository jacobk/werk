
'use strict';


var fs = require('fs'),
    userhome = require('userhome'),
    _ = require('lodash'),
    argv = require('minimist')(process.argv.slice(2)),
    configFile = '.werk',
    config = {};

var load = function() {
  var globalConfigPath = exports.globalConfigPath(),
      repoConfigPath = exports.repoConfigPath();

  if (!_.isEmpty(config)) {
    return config;
  }

  if (fs.existsSync(globalConfigPath)) {
    _.assign(config, JSON.parse(fs.readFileSync(userhome(globalConfigPath))));
  }

  if (fs.existsSync(repoConfigPath)) {
    _.assign(config, JSON.parse(fs.readFileSync(repoConfigPath)));
  }

  if (_.isEmpty(config)) {
    config = {
      default_branch: 'master',
      cool_fonts: true,
      cool_colors: true,
      verbose: false,
      github_user: null,
      github_token: null
    };
  }
  return config;
};

var write = function(config) {
  fs.writeFile(exports.configFile(), JSON.stringify(config, null, 2));
};

exports.get = function(key) {
  var dasherizedKey = key.replace(/_/g, '-');
  if (argv.hasOwnProperty(key)) {
    return argv[key];
  } else if (argv.hasOwnProperty(dasherizedKey)) {
    return argv[dasherizedKey];
  } else {
    return load()[key];
  }
};

exports.set = function(key, value) {
  var config = load();
  config[key] = value;
  write(config);
};

exports.globalConfigPath = function() {
  return userhome(configFile);
};

exports.repoConfigPath = function() {
  return configFile;
};

exports.configFile = function() {
  return exports.isGlobal() ? exports.globalConfigPath() : exports.repoConfigPath();
};

exports.isGlobal = function() {
  return argv.global;
};

exports.forceAuth = function() {
  return argv.auth;
};