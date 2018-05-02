#!/usr/bin/env node
 
/**
 * Module dependencies.
 */
require('babel-core/register');
// var axios = require('axios');
// var cron = require('node-cron');
var program = require('commander');
var BHBot = require('./src/bhbot').default;
 
program
  .version('0.1.0')
  .option('-l, --login', 'Do login')
  .option('-u, --upvote', 'Do upvote')
  .option('-f, --follow', 'Do follow')
  .parse(process.argv);

var bhbot = new BHBot();
bhbot.init();

if (program.login) {
  bhbot.doLogin();
}

if (program.upvote) {
  bhbot.startUpVoteWork();
}
  
if (program.follow) {
  setImmediate(() => {
    console.log('aaaa')
    bhbot.startFollowWork()
        .then(_ => _)
        .catch(err => {
  
        })
  });
  
  setInterval(() => {
      bhbot.startFollowWork()
        .then(_ => _)
        .catch(err => {
  
        })
  }, 1200*1000);
}

 

