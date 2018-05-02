import axios from 'axios';
import cron from 'node-cron';
import _ from 'lodash';
import fs from 'fs';
import async from 'async';
import urlencode from 'urlencode';

export class BHBot {
    constructor() {
        this.authData = {};
        this.userIds = [12627, 2234, 31673, 11821, 55332, 11880, 131507, 3715, 41279, 168480, 193646, 144352, 233279, 334485, 232199, 197646, 30323, 9457, 121788, 211448, 181440];
        this.boards = ['BTC', 'NEO', 'EOS', 'ETH', '百咖说', '币圈八卦', '大咖访谈', '行情解读', '精链币答', '通证经济', '挖矿', '小白入门', '项目分析', '知识库'];
        this.index = 0;
        this.boardIndex = Math.floor(Math.random()*this.boards.length);
        this.upCount = 0;
        this.commentCount = 0;
        this.file = './auth.json';
        this.timeout = 20;

        this.config = {
            transformRequest: [function (data) {
                // console.log(data);
            
                let ret = ''
                for (let it in data) {
                    ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&'
                }
                return ret
            }]};
    }

    init() {
        axios.defaults.baseURL = 'https://be02.bihu.com/bihube-pc/api';
        axios.defaults.timeout = 2000;
        axios.defaults.headers.common['Accept'] = '*/*';
        axios.defaults.headers.common['Accept-Encoding'] = 'gzip, deflate, br';
        axios.defaults.headers.common['Accept-Language'] = 'zh-CN,zh;q=0.8';
        axios.defaults.headers.common['Connection'] = 'keep-alive';
        axios.defaults.headers.common['Host'] = 'be02.bihu.com';
        axios.defaults.headers.common['Origin'] = 'https://bihu.com';
        axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36';
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

        try {
            this.authData = JSON.parse(fs.readFileSync(this.file));
        } catch (error) {
            
        }
        
    }

    startWork() {
        this.personalInfo()
            .then(data => {
                if (data&&data.nickName) {
                    console.log('Already login!')   
                    Promise.resolve(this.authData);
                } else {
                    this.authData = {};
                    return this.loginViaPassword();
                }
            }).catch(error => {
                this.authData = {};
                return this.loginViaPassword();
            })
        // this.loginViaPassword()
            .then((data) => {
                if (!this.authData.accessToken) {
                    console.log(data);
                
                    if (!(data.accessToken)) return;
                    
                    this.authData = data;
                    delete this.authData.memberId;
    
                    try {
                        fs.writeFileSync(this.file, JSON.stringify(this.authData));
                    } catch(error) {
                        
                    }
                }
                
                // cron.schedule('1 * * * * *', () => {
                //     console.log('running every minute');
                //     this.upVoteJob().then(_ => {
                //         console.log(`upCount=${this.upCount}, commentCount=${this.commentCount}`)
                //     }).catch(error => {
                //         console.log(error.response.status);
                //     });
                // });
                setInterval(()=>{
                    console.log('running every half minute');
                    this.upVoteJob().then(_ => {
                        console.log(`upCount=${this.upCount}, commentCount=${this.commentCount}`)
                    }).catch(error => {
                        console.log(error.response.status);
                    });
                }, this.timeout*1000);
        })
        .catch((error) => {
            console.log(error.response.status);
        });
    }

    async upVoteJob() {
        console.log('upVoteJob starting...!')

        let userId = this.userIds[this.index++];
        if (this.index>=this.userIds.length) this.index = 0;

        setTimeout(async () => {
            let result = await this.getUserArtList(userId);
            let articles = result&&result.list;
            if (_.isEmpty(articles)) {
                this.timeout = 300;
            } else {
                this.timeout = 20;
            }

            if (!_.isEmpty(articles)) {
                console.log(`fetch ${articles[0].userName}'s last article(ups=${articles[0].ups}): ${articles[0].snapcontent}`);
                setTimeout(async () => {
                    console.log('articleid: ', articles[0].id);

                    let article = await this.getArticle2(articles[0].id);
                    let commentData = await this.getCommentList2(articles[0].id);

                    if (!article) return;

                    // console.log('article', article);
                    setTimeout(async () => {
                        console.log('article.up: ', article.up);
                        console.log('article.ups: ', article.ups);
                        if (article.up === 0 && article.ups < 50) {
                        // if (article.up === 0) {
                            let upResult = await this.upVote(article.id);
                            this.upCount++;
                        }
                        if (!commentData) return;
                        setTimeout(async () => {
                            console.log('commentData.list: ', commentData.list.length);
                            if (commentData && commentData.list && commentData.list.length < 20) {
                            // if (commentData && commentData.list) {
                                let commentResult = await this.createComment(article.id);
                                this.commentCount++;
                            }
                        }, (Math.random()+2)*1000)
                    }, (Math.random()+2)*1000);
                }, (Math.random()+2)*1000)
            }
        }, (Math.random()+1)*1000);

        // for (let userId of this.userIds) {
        //     let result = await this.getUserArtList(userId);
        //     let articles = result.list;
        //     if (!_.isEmpty(articles)) {
        //         let lastArt = articles[0];
        //         console.log(`fetch ${lastArt.userName}'s last article(ups=${lastArt.ups}): ${lastArt.snapcontent}`);
        //         // if (lastArt.ups < 50) {
        //         //     let upResult = await this.upVote(lastArt.id);
        //         // }
        //         // let commentData = await this.getCommentList2(lastArt.id);
        //         // if (commentData && commentData.list && commentData.list.length < 10) {
        //         //     let commentResult = await this.createComment(lastArt.id);
        //         // }
        //         let upResult = await this.upVote(lastArt.id);
        //         let commentResult = await this.createComment(lastArt.id);
        //     }
        // }

        // console.log('upVoteJob completed!')
        return 1;
    }

    async startFollowWork() {
        try {
            if (!_.isEmpty(this.authData)) {
                let data = await this.personalInfo();
                if (data&&data.nickName) {
                    console.log('Already login!');
                } else {
                    this.authData = {};
                }
            }

            {
                let data = await this.loginViaPassword();
                if (!(data.accessToken)) return 0;
                this.authData = data;
                delete this.authData.memberId;

                try {
                    fs.writeFileSync(this.file, JSON.stringify(this.authData));
                } catch(error) {}
            }

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

        let result = await this.newestArtList(board);
        let articles = result&&result.list;
        if (!_.isEmpty(articles)) {
            articles = articles.filter(item => item.follow === 0);
        }
        articles = _.uniqWith(articles, (a, b) => a.userId === b.userId);

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
                            ret = await this.follow(item.userId);
                        } catch(exception) {}
                        
                        if (ret === 1 && this.commentCount < 30) {
                            setTimeout(async () => {
                                try {
                                    ret = await this.createComment(item.id);
                                } catch(exception) {}
                                this.commentCount++;
                                callback(null);
                            }, 5*1000);
                        } else {
                            callback(null);
                        }
                    }, 5*1000);
            }});

            async.waterfall(tasks, (err, result) => {
                console.log(`follow user done`)
                return 1;
            });

        }
        return 0;
    }

    async newestArtList(code) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/?category=news&code=${urlencode(code)}`;
        let response = await axios.post('/content/show/newestArtList', {
            ...this.authData,
            code: code
        }, this.config);
        console.log(`newestArtList return ${response.data.resMsg}`)
        return response.data.data;
    }

    async follow(userId) {
        console.log(`follow user ${userId}`)
        axios.defaults.headers.post['Referer'] = `https://bihu.com/people/${userId}`;
        let response = await axios.post('/content/follow', {
            ...this.authData,
            subjectUserId: userId
        }, this.config);
        console.log(`follow return ${response.data.resMsg}`)
        return response.data.res;
    }

    async loginViaPassword() {
        axios.defaults.headers.post['Referer'] = 'https://bihu.com/login';
        let response = await axios.post('/user/loginViaPassword', {
            phone: '13575480441',
            password: '51b6e8f551fba71e36f16c3af5b9bb627038145f32b5ab985fe7836640d18729'
        }, this.config)
        console.log(`loginViaPassword return ${response.data}`)
        return response.data.data;
    }

    async personalInfo() {
        axios.defaults.headers.post['Referer'] = `https://bihu.com`;
        let response = await axios.post('/user/personalInfo', {
            ...this.authData
        }, this.config);
        console.log(`personalInfo return ${response.data.resMsg}`)
        return response.data.data;
    }

    async getUserArtList (userId) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/people/${userId}/?index=1`;
        let response = await axios.post('/content/show/getUserArtList', {
            ...this.authData,
            queryUserId: userId,
            pageNum:1
        }, this.config);
        console.log(`getUserArtList return ${response.data.resMsg}`)
        return response.data.data;
    }

    async upVote(artId) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await axios.post('/content/upVote', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`upVote return ${response.data.resMsg}`)
        return response.data.res;
    }

    async getCommentList2(artId) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await axios.post('/content/show/getCommentList2', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`getCommentList2 return ${response.data.resMsg}`)
        return response.data.data;
    }

    async createComment(artId) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await axios.post('/content/createComment', {
            ...this.authData,
            artId: artId,
            content: '好文，互粉'
        }, this.config);
        console.log(`createComment return ${response.data.resMsg}`)
        return response.data.res;
    }

    async getArticle2(artId) {
        axios.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await axios.post('/content/show/getArticle2', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`getArticle2 return ${response.data.resMsg}`)
        return response.data.data;
    }
}

export default BHBot;
