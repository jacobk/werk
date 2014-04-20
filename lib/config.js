
'use strict';


var fs = require('fs'),
    configFile = '.werk';

var load = function() {
  var config;
  if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile));
  } else {
    config = {
      default_branch: 'master',
      cool_fonts: true,
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
  return load()[key];
};

exports.set = function(key, value) {
  var config = load();
  config[key] = value;
  write(config);
};