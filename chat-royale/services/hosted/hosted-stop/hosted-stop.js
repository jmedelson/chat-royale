const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });
const jwt = require('jsonwebtoken');
const axios = require('axios');

const dbQuery = async (channel) =>{
    const params = {
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
const endDB = async (channelId, data) => {
    const newEntry = {
        TableName: 'chat-royale-data',
        Item: {
            channel: channelId,
            isActive: false
        }
    };
    await documentClient.put(newEntry).promise();

};

exports.handler = async event => {
    const response = (statusCode, body) => {
        const headers = {
          ['Access-Control-Allow-Origin']: event.headers.origin,
          ["Access-Control-Allow-Credentials"] : true
        };
        return { statusCode, body: JSON.stringify(body, null, 2), headers };
    };
    const payload = verifyAndDecode(event.headers.Authorization);
    const channelId = payload.channel_id;

}