#!/usr/bin/env node
 
/**
 * Module dependencies.
 */
require('babel-core/register');
// var axios = require('axios');
// var cron = require('node-cron');
var program = require('commander');
var BHBot = require('./bhbot').default;
 
program
  .version('0.1.0')
  .option('-b, --bihu', 'Bihu robot')
  .option('-i, --interval', '', parseInt)
  .parse(process.argv);

var bhbot = new BHBot();
bhbot.init();
// bhbot.startWork();



setImmediate(() => {
  bhbot.startFollowWork()
      .then(_ => _)
      .then(err => {

      })
});

setInterval(() => {
    bhbot.startFollowWork()
      .then(_ => _)
      .then(err => {

      })
}, 1800*1000);
 

