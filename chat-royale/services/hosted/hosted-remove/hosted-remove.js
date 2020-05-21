const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
const removeHandler = async (channelId, remove) => {
    const newEntry = {
        TableName: 'chat-royale-2',
        Item: {
            channel: channelId,
            removed: remove
        }
    };
    return await documentClient.put(newEntry).promise();
};
const makeServerToken = channelID => {
    const serverTokenDurationSec = 30;
  
    const payload = {
      exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
      channel_id: channelID,
      user_id: process.env.ownerId,
      role: 'external',
      pubsub_perms: {
        send: ["broadcast"],
      },
    };
    
    const secret = Buffer.from(process.env.secret, 'base64');
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
};
const sendBroadcast = async (channel, data) =>{
    const link = `https://api.twitch.tv/extensions/message/` + channel
    const bearerPrefix = 'Bearer ';
    const request = {
        method: 'POST',
        url: link,
        headers : {
            'Client-ID': process.env.clientId,
            'Content-Type': 'application/json',
            'Authorization': bearerPrefix + makeServerToken(channel),
        },
        data : JSON.stringify({
          content_type: 'application/json',
          message: data,
          targets: ['broadcast']
        })
    }
    return await axios(request)
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
    const channelId = payload.channel_id;
    var data = event['body'].split("=")[1];
    await removeHandler(channelId, data);
    data = "Remove Name--" + data
    await sendBroadcast(channelId, data)
    // console.log(payload);
    return response(200, data);
};