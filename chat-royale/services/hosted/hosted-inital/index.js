const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });
var isLive = {}

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
const dbQuery = async (channel) =>{
    const params = {
        TableName: 'chat-royale-data',
        Key: { channel: channel }
    };
    const channelData = await documentClient.get(params).promise();
    console.log("CHANNEL--", channelData)
    if(channelData.Item){
        if(channelData.Item.isActive){
            isLive[channel] = channelData.Item.viewers
            return channelData.Item.viewers;
        }else{
            return 'false';
        }
    }else{
        return 'false';
    }
}
const removeQuery = async (channel) => {
    const start = isLive[channel];
    var hold = []
    var params = {
        TableName: 'chat-royale-2',
        KeyConditionExpression: 'channel = :channel',
        ExpressionAttributeValues: {
            ':channel': channel
        }
    }
    try{
        const chData = await documentClient.query(params).promise();
        console.log("LOGGING---", chData)
        for(var item in chData.Items){
            hold.push(chData.Items[item]['removed'])
        }
        console.log("hold",hold)
        return hold
    }catch(err){
        console.log('err', err)
    }
}
exports.handler = async event => {
    const respond = (statusCode, body) => {
      const headers = {
        ['Access-Control-Allow-Origin']: event.headers.origin,
        ["Access-Control-Allow-Credentials"] : true
      };
  
      return { statusCode, body: JSON.stringify(body, null, 2), headers };
    };
    const payload = verifyAndDecode(event.headers.Authorization);
    try{
        if(isLive[payload.channel_id]){
            console.log('shortcut')
            const ping = await dbQuery(payload.channel_id)
            const res = await removeQuery(payload.channel_id);
            var message = "contestansAndRemoves--" + isLive[payload.channel_id].toString() + "&&" + res.toString()
            return respond('200', message)
        }else{
            const ping = await dbQuery(payload.channel_id)
            const res = await removeQuery(payload.channel_id)
            var message = "contestansAndRemoves--" + isLive[payload.channel_id].toString() + "&&" + res.toString()
            return respond('200', message)
        }
    }catch(err){
        // console.log('catch triggered',err)
        return respond('200', 'falses')
    }
    
}