const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

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
    if(channelData.Item.isActive){
        return channelData.Item.viewers;
    }else{
        return 'false';
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
    const ping = await dbQuery(payload.channel_id)
    return respond('200', ping)
    
}