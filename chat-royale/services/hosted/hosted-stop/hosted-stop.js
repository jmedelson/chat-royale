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
const endDB = async (channelId) =>{
    const newEntry = {
        TableName: 'chat-royale-data',
        Item: {
            channel: channelId,
            isActive: false
        }
    };
    return await documentClient.put(newEntry).promise();
}
const removeQuery = async (channel) => {
    await endDB(channel)
    var items = []
    var params = {
        TableName: 'chat-royale-2',
        KeyConditionExpression: 'channel = :channel',
        ExpressionAttributeValues: {
            ':channel': channel
        }
    }
    const chData = await documentClient.query(params).promise();
    var data = chData.Items
    for(var i = 0; i<data.length; i++){
        items[i] = {
            DeleteRequest : { Key: data[i]}
        }
    }
    for(var j = 0; j<items.length; j = j +25){
        var endpoint = 0
        if(j + 24 < items.length){
            endpoint = j+25
        }else{
            endpoint = items.length 
        }
        var params = {
            RequestItems:{
                'chat-royale-2': items.slice(j,endpoint)
            },
            ReturnConsumedCapacity: 'TOTAL',
            ReturnItemCollectionMetrics: 'SIZE'
        };
        console.log('params', j , endpoint);
        await documentClient.batchWrite(params).promise();
    }
    return 'done'
}
exports.handler = async event => {
    const respond = (statusCode, body) => {
      const headers = {
        ['Access-Control-Allow-Origin']: "*",
        ["Access-Control-Allow-Credentials"] : true
      };
  
      return { statusCode, body: JSON.stringify(body, null, 2), headers };
    };
    const payload = verifyAndDecode(event.headers.Authorization);
    const channelId = payload.channel_id
    await removeQuery(channelId)
    return respond('200', 'stopped--ping')
}