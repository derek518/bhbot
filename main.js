#!/usr/bin/env node
 
/**
 * Module dependencies.
 */
require('babel-core/register');
var cron = require('node-cron');
var program = require('commander');
var BHBotV2 = require('./src/bhbotV2').default;
 
program
  .version('0.1.0')
  .option('-l, --login', 'Do login')
  .option('-u, --upvote', 'Do upvote')
  .option('-f, --follow', 'Do follow')
  .option('-d, --dump', 'Dump articles')
  .parse(process.argv);

var bhbot = new BHBotV2();
bhbot.init();

if (program.login) {
  bhbot.doLogin();
}

if (program.upvote) {
  bhbot.startUpVote();
}
  
if (program.follow) {
  bhbot.startFollow();
}

if (program.dump) {
  bhbot.dumpArticles();
}

 

