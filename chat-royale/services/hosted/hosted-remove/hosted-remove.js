const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });
const jwt = require('jsonwebtoken');
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
const numRemoved = async (channelId) => {
  var params = {
    TableName: 'chat-royale-2',
    KeyConditionExpression: 'channel = :channel',
    ExpressionAttributeValues: {
      ':channel': channelId
    },
    Select: 'COUNT'
  }
  return await documentClient.query(params, function(err, data){
    if (err) {
    console.log("Error", err);
    } else {
      console.log("Success", data);
      console.log("LENGTH--", data.Items);
    }
  }).promise();
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
    await numRemoved(channelId)
    data = "remove--" + data
    // console.log(payload);
    return response(200, data);
};