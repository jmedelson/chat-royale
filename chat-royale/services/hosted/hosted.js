const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });
const jwt = require('jsonwebtoken');
const axios = require('axios')
const verifyAndDecode = (auth) => {
    const bearerPrefix = 'Bearer ';
    if (!auth.startsWith(bearerPrefix)) return { err: 'Invalid authorization header' };
    try {
      const token = auth.substring(bearerPrefix.length);
      const secret = process.env.secret;
      return jwt.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256'] });
    } catch (err) {
      return { err: 'Invalid JWT' };
    }
};
const tmiRequest = async () => {
    // console.log("promise begin");
    link = 'https://tmi.twitch.tv/group/user/itmejp/chatters'
    try {
        const response = await axios.get(link)
        console.log(response.data);
        // console.log(response.data.explanation);
        return response.data.chatters.viewers
    } catch (error) {
        console.log(error.response.body);
        return error
    }
};
const getViewerHandler = (channelId) =>{
    viewers = tmiRequest()
    return viewers
}

exports.handler = async event => {
    // Response function
    const response = (statusCode, body) => {
      const headers = {
        ['Access-Control-Allow-Origin']: event.headers.origin,
        ["Access-Control-Allow-Credentials"] : true
      };
  
      return { statusCode, body: JSON.stringify(body, null, 2), headers };
    };
    const payload = verifyAndDecode(event.headers.Authorization);
    const channelId = payload.channel_id
    const viewers = await getViewerHandler(channelId)
    console.log(payload);
    return response(200, viewers)
};