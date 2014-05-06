
'use strict';


var fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    configFile = '.werk';

var load = function() {
  var config;
  if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile));
  } else {
    config = {
      default_branch: 'master',
      cool_fonts: true,
      cool_colors: true,
      verbose: false
    };
  }
  return config;
};

var write = function(config) {
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
};

exports.configFile = configFile;

exports.get = function(key) {
  if (argv.hasOwnProperty(key)) {
    return argv[key];
  } else {
    return load()[key];
  }
};

exports.set = function(key, value) {
  var config = load();
  config[key] = value;
  write(config);
};