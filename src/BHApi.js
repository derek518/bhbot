import axios from 'axios';
import _ from 'lodash';
import fs from 'fs';
import urlencode from 'urlencode';

export class BHApi {
    constructor() {
        this.authData = {};
        this.file = './auth.json';
        this.instance = axios.create({
            baseURL: 'https://be02.bihu.com/bihube-pc/api',
            timeout: 5000
          });
        
        this.config = {
            transformRequest: [function (data) {
                let ret = ''
                for (let it in data) {
                    ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&'
                }
                return ret
            }]};
    }

    init() {
        this.instance.defaults.headers.common['Accept'] = '*/*';
        this.instance.defaults.headers.common['Accept-Encoding'] = 'gzip, deflate, br';
        this.instance.defaults.headers.common['Accept-Language'] = 'zh-CN,zh;q=0.8';
        this.instance.defaults.headers.common['Connection'] = 'keep-alive';
        this.instance.defaults.headers.common['Host'] = 'be02.bihu.com';
        this.instance.defaults.headers.common['Origin'] = 'https://bihu.com';
        this.instance.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36';
        this.instance.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

        try {
            this.authData = JSON.parse(fs.readFileSync(this.file));
        } catch (error) {}
    }

    async login() {
        try {
            // if (!_.isEmpty(this.authData)) {
            //     let data = await this.personalInfo();
            //     if (data&&data.nickName) {
            //         console.log('Already login!');
            //     } else {
            //         this.authData = {};
            //     }
            // }

            // if (_.isEmpty(this.authData)) {
                let data = await this.loginViaPassword();
                if (!(data.accessToken)) return 0;
                this.authData = data;
                delete this.authData.memberId;

                try {
                    fs.writeFileSync(this.file, JSON.stringify(this.authData));
                } catch(error) {}
            // }
        } catch (error) {
            console.log('login error: ', error);
            this.authData = {};
        }

        return this.authData;
    }

    async newestArtList(code) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/?category=news&code=${urlencode(code)}`;
        let response = await this.instance.post('/content/show/newestArtList', {
            ...this.authData,
            code: code
        }, this.config);
        console.log(`newestArtList return ${response.data.resMsg}`)
        return response.data.data;
    }

    async follow(userId) {
        console.log(`follow user ${userId}`)
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/people/${userId}`;
        let response = await this.instance.post('/content/follow', {
            ...this.authData,
            subjectUserId: userId
        }, this.config);
        console.log(`follow return ${response.data.resMsg}`)
        return response.data.res;
    }

    async loginViaPassword() {
        this.instance.defaults.headers.post['Referer'] = 'https://bihu.com/login';
        let response = await this.instance.post('/user/loginViaPassword', {
            phone: '13575480441',
            password: '51b6e8f551fba71e36f16c3af5b9bb627038145f32b5ab985fe7836640d18729'
        }, this.config)
        console.log(`loginViaPassword return ${response.data}`)
        return response.data.data;
    }

    async personalInfo() {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com`;
        let response = await this.instance.post('/user/personalInfo', {
            ...this.authData
        }, this.config);
        console.log(`personalInfo return ${response.data.resMsg}`)
        return response.data.data;
    }

    async getUserArtList (userId) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/people/${userId}/?index=1`;
        let response = await this.instance.post('/content/show/getUserArtList', {
            ...this.authData,
            queryUserId: userId,
            pageNum:1
        }, this.config);
        console.log(`getUserArtList return ${response.data.resMsg}`)
        return response.data.data;
    }

    async upVote(artId) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await this.instance.post('/content/upVote', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`upVote return ${response.data.resMsg}`)
        return response.data.res;
    }

    async getCommentList2(artId) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await this.instance.post('/content/show/getCommentList2', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`getCommentList2 return ${response.data.resMsg}`)
        return response.data.data;
    }

    async createComment(artId) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await this.instance.post('/content/createComment', {
            ...this.authData,
            artId: artId,
            content: '好文，互粉'
        }, this.config);
        console.log(`createComment return ${response.data.resMsg}`)
        return response.data.res;
    }

    async getArticle2(artId) {
        this.instance.defaults.headers.post['Referer'] = `https://bihu.com/article/${artId}`;
        let response = await this.instance.post('/content/show/getArticle2', {
            ...this.authData,
            artId: artId
        }, this.config);
        console.log(`getArticle2 return ${response.data.resMsg}`)
        return response.data.data;
    }
}

export default BHApi;