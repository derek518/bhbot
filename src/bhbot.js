import axios from 'axios';
import cron from 'node-cron';
import _ from 'lodash';
import async from 'async';
import BHApi from './BHApi';
import upVoteList from './upVoteList';

export class BHBot {
    constructor() {
        this.bhApi = new BHApi();
      
        this.boards = ['BTC', 'NEO', 'EOS', 'ETH', '百咖说', '币圈八卦', '大咖访谈', '行情解读', '精链币答', '通证经济', '挖矿', '小白入门', '项目分析', '知识库'];
        this.index = 0;
        this.boardIndex = Math.floor(Math.random()*this.boards.length);
        this.upCount = 0;
        this.commentCount = 0;
        this.lastTime = new Date();
        this.lastUpUserId = 0;
        this.skipCount = 0;
    }

    init() {
        this.bhApi.init();      
    }

    doLogin() {
        this.bhApi.login()
        .then(authData => {})
        .catch(error => {});
    }

    startUpVoteWork() {
        setInterval(async () => {
            const now = new Date();
            if (now.getTime()-this.lastTime.getTime() > 60*1000) {
                console.log(`---${now.getHours()}:${now.getMinutes()}-->${this.upCount}`);
                this.lastTime = now;
            }
            
            const matchList = upVoteList.filter(item => now.getHours() === item.hour && now.getMinutes() === item.minute);
            // const matchList = upVoteList.slice(0,5);
            if (!_.isEmpty(matchList)) {
                try {
                    for (let target of matchList) {
                        let result = await this.upVoteJob(target);
                        if (result > 0) break;
                    }
                } catch (error) {
                    this.skipCount = 20;
                    console.log('upVote error: ', error);
                }
            }
        }, 5*1000);

        // this.bhApi.login()
        // .then(authData => {
        //     if (_.isEmpty(authData)) return;

        //     setInterval(async () => {
        //         const now = new Date();
        //         console.log(`---${now.getHours()}:${now.getMinutes()}---`);
        //         const matchList = upVoteList.filter(item => now.getHours() === item.hour && now.getMinutes() === item.minute);
        //         if (!_.isEmpty(matchList)) {
        //             try {
        //                 for (let target of matchList) {
        //                     let result = await this.upVoteJob(target);
        //                     if (result > 0) break;
        //                 }
        //             } catch (error) {
        //                 console.log('upVote error: ', error);
        //             }
        //         }
        //     }, 5*1000);
        // });
    }

    async upVoteJob(target) {
        let upResult = 0;

        if (this.lastUpUserId === target.userId) return 0;
        if (this.skipCount>0) {
            this.skipCount--;
            return 0;
        }

        let result = await this.bhApi.getUserArtList(target.userId);
        if (!result) {
            this.skipCount = 20;
            return 0;
        }
        let articles = result&&result.list;
        if (!_.isEmpty(articles)) {
            let article = articles[0];
            console.log(`get article for user ${target.name}: ${article.id} with ups ${article.ups}`);
            if (article.up > 0) return upResult;

            if (article.ups < 200) {
                try {
                    upResult = await this.bhApi.upVote(article.id);
                    if (upResult>0) {
                        this.lastUpUserId = target.userId;
                        this.upCount++;
                    }
                } catch (error) {
                    this.skipCount = 20;
                    console.log('upVote error: ', error);
                }
            }
            if (article.cmts < 40) {
                try {
                    let commentResult = await this.bhApi.createComment(article.id);
                    if (commentResult>0) this.commentCount++;
                }  catch (error) {
                    this.skipCount = 20;
                    console.log('comment error: ', error);
                }
            }
        }

        if (upResult) {
            console.log(`upVote for user ${target.name} succeed`);
        }

        return upResult;
    }

    async startFollowWork() {
        try {
            // let authData = await this.bhApi.login();

            // let ret = 0;
            // if (!_.isEmpty(authData)) {
            //     ret = await this.bhApi.followJob();
            // }

            let ret = await this.followJob();
            
            console.log('follow work done!')
            return ret; 
        } catch (error) {
            console.log('exception:', error.response.status);
        }
    }

    async followJob() {
        let board = this.boards[this.boardIndex++];
        if (this.boardIndex>=this.boards.length) this.boardIndex = 0;

        console.log(`followJob for board ${board} starting...!`)

        let result = await this.bhApi.newestArtList(board);
        let articles = result&&result.list;
        if (!_.isEmpty(articles)) {
            articles = articles.filter(item => item.follow === 0);
        }
        articles = _.uniqWith(articles, (a, b) => a.userId === b.userId);
        articles = articles.slice(0, 5);

        console.log(`articles len: ${articles.length}`)

        let ret = await this.followUsers(articles);
      
        return ret;
    }

    async followUsers(articles) {
        if (!_.isEmpty(articles)) {
            let tasks = articles.map(item => {
                return (callback) => {
                    setTimeout(async () => {
                        let ret = 0;
                        try {
                            ret = await this.bhApi.follow(item.userId);
                        } catch(exception) {}
                        
                        if (ret === 1 && this.commentCount < 30) {
                            setTimeout(async () => {
                                try {
                                    ret = await this.bhApi.createComment(item.id);
                                } catch(exception) {}
                                this.commentCount++;
                                callback(null);
                            }, 10*1000);
                        } else {
                            callback(null);
                        }
                    }, 10*1000);
            }});

            async.waterfall(tasks, (err, result) => {
                console.log(`follow user done`)
                return 1;
            });

        }
        return 0;
    }

    
}

export default BHBot;
