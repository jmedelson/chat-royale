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
const requestOauth = async () =>{
    const link = "https://id.twitch.tv/oauth2/token?client_id=" + process.env.clientId + "&client_secret=" + process.env.clientSecret + "&grant_type=client_credentials"
    try {
        const response = await axios.post(link)
        console.log(response.data, link);
        // console.log(response.data.explanation);
        return response.data.access_token
    } catch (error) {
        console.log(error.response.body, link);
        return error
    }
}
const helixRequest = async (names) =>{
    const link = "https://api.twitch.tv/helix/users?" + names;
    const oauth = await requestOauth()
    try {
        const response = await axios.get(link,{
            headers:{
                'Authorization': 'Bearer ' + oauth,
                'Client-ID' : process.env.clientId
            }
        })
        console.log(response.data, link);
        return response.data.access_token
    }catch (error) {
        console.log(error.response.body);
        return error
    }
}
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
const getViewerHandler = async (channelId) =>{
    const viewers = await tmiRequest()
    const royale_count = Math.min(24, viewers.length)
    var hold = []
    var pointer = 0
    for(var i = 0; i<royale_count; i++){
      var min = 0
      var max = data.length
      pointer = Math.floor(Math.random() * (max - min + 1)) + min
      hold.push(data[pointer])
      data.splice(pointer,1)
    }
    hold.unshift("tempo")
    hold.unshift('trihex')
    var names = ''
    var pairs = []
    for(item in hold){
        if(names === ''){
          names = 'login=' + hold[item]
        }
        else{
          names = names + "&login=" + hold[item]
        }
    }
    info = await helixRequest(names)
    for(var item in info){
        pairs.push([info[item].id,hold[item]])
      }
    return info
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