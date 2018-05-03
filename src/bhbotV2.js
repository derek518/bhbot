import axios from 'axios';
import cron from 'node-cron';
import _ from 'lodash';
import async from 'async';
import BHApi from './BHApi';
import upVoteList from './upVoteList';
import boardList from './boardList';

export class BHBotV2 {
    constructor() {
        this.bhApi = new BHApi();
      
        this.boards = boardList;
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

    startUpVote() {
        for (let voteItem of upVoteList) {
            cron.schedule(`3 ${voteItem.minute} ${voteItem.hour} * * *`, () => {
                this.startUpVoteJob(voteItem);
            });
        }
    }

    startFollow() {
        setImmediate(async () => {
            let ret = await this.startFollowJob();
        });

        cron.schedule(`*/20 * * * *`, async () => {
            let ret = await this.startFollowJob();
        });
    }

    startUpVoteJob(voteItem) {
        this.skipCount = 0;
        let voteItemCopy = {...voteItem};
        voteItemCopy.voted = 0;
        let timer = setInterval(async () => {
            const now = new Date();
            console.log(`---${now.getHours()}:${now.getMinutes()}-->${voteItemCopy.name}(${voteItemCopy.userId}) ${this.upCount}`);
            if (voteItemCopy.voted > 0 || voteItemCopy.hour != now.getHours() || voteItemCopy.minute != now.getMinutes()) {
                console.log(`stopped job for user ${voteItemCopy.name}`)
                clearInterval(timer);
                return;
            }

            if (this.skipCount>0) {
                this.skipCount--;
                return;
            }

            try {
                voteItemCopy.voted = await this.upVoteJob(voteItemCopy);
            } catch(error) {
                this.skipCount = 10;
                console.log('upVote error: ', error);
            }
        }, 1*1000);
    }

    async upVoteJob(target) {
        let upResult = 0;

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

            if (article.ups < 100) {
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
            } else if (Date.now()-article.createTime<60*1000) {
                // 最新文章已经被人抢赞了
                upResult = 2;
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

        if (upResult === 1) {
            console.log(`upVote for user ${target.name} succeed`);
        }

        return upResult;
    }

    async startFollowJob() {
        try {
            let ret = await this.followJob();
            
            console.log('follow job done!')
            return ret; 
        } catch (error) {
            console.log('exception:', error.response.status);
            return 0;
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

export default BHBotV2;
