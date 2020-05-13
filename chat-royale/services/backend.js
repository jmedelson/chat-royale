/**
 *    Copyright 2018 Amazon.com, Inc. or its affiliates
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const fs = require('fs');
const Hapi = require('hapi');
const path = require('path');
const Boom = require('boom');
const color = require('color');
const ext = require('commander');
const jsonwebtoken = require('jsonwebtoken');
const request = require('request');

// The developer rig uses self-signed certificates.  Node doesn't accept them
// by default.  Do not use this in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use verbose logging during development.  Set this to false for production.
const verboseLogging = true;
const verboseLog = verboseLogging ? console.log.bind(console) : () => { };

// Service state variables
// const initialColor = color('#6441A4');      // super important; bleedPurple, etc.
const serverTokenDurationSec = 30;          // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000;                // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000;  // interval to reset our tracking object
const channelCooldownMs = 1000;             // maximum broadcast rate per channel
const bearerPrefix = 'Bearer ';             // HTTP authorization headers have this prefix
const colorWheelRotation = 30;
const channelViewers = {};
const channelCooldowns = {};                // rate limit compliance
let userCooldowns = {};                  // spam prevention

const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  ownerIdEnv: usingValue('owner-id'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  ownerIdMissing: missingValue('owner ID', 'EXT_OWNER_ID'),
  messageSendError: 'Error sending message to channel %s: %s',
  pubsubResponse: 'Message to c:%s returned %s',
  cyclingColor: 'Cycling color for c:%s on behalf of u:%s',
  colorBroadcast: 'Broadcasting color %s for c:%s',
  sendColor: 'Sending color %s to c:%s',
  cooldown: 'Please wait before clicking again',
  invalidAuthHeader: 'Invalid authorization header',
  invalidJwt: 'Invalid JWT',
};

ext.
  version(require('../package.json').version).
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  option('-o, --owner-id <owner_id>', 'Extension owner ID').
  option('-n, --client-secret <client-secret>', 'Extension Twitch API Client Secret').
  parse(process.argv);

const ownerId = getOption('ownerId', 'EXT_OWNER_ID');
const secret = Buffer.from(getOption('secret', 'EXT_SECRET'), 'base64');
const clientId = getOption('clientId', 'EXT_CLIENT_ID');
const clientSecret = getOption('clientSecret', 'EXT_CLIENT_SECRET')
let oauth = ''
requestOauth() 
console.log('oauth---',oauth)  
const serverOptions = {
  host: 'localhost',
  port: 8081,
  routes: {
    cors: {
      origin: ['*'],
    },
  },
};
const serverPathRoot = path.resolve(__dirname, '..', 'conf', 'server');
if (fs.existsSync(serverPathRoot + '.crt') && fs.existsSync(serverPathRoot + '.key')) {
  serverOptions.tls = {
    // If you need a certificate, execute "npm run cert".
    cert: fs.readFileSync(serverPathRoot + '.crt'),
    key: fs.readFileSync(serverPathRoot + '.key'),
  };
}
const server = new Hapi.Server(serverOptions);

(async () => {
  // Handle a viewer request to cycle the color.
  server.route({
    method: 'POST',
    path: '/color/start',
    handler: getViewerHandler,
  });

  // Handle a new viewer requesting the color.
  server.route({
    method: 'GET',
    path: '/color/query',
    handler: colorQueryHandler,
  });
  // Remove Viewer from list
  server.route({
    method: 'POST',
    path: '/color/submit',
    handler: removeHandler,
  });

  // Start the server.
  await server.start();
  console.log(STRINGS.serverStarted, server.info.uri);

  // Periodically clear cool-down tracking to prevent unbounded growth due to
  // per-session logged-out user tokens.
  setInterval(() => { userCooldowns = {}; }, userCooldownClearIntervalMs);
})();

function requestOauth(){
  // const envSecret = getOption('secret', 'EXT_SECRET')
  const link = "https://id.twitch.tv/oauth2/token?client_id=" + clientId + "&client_secret=" + clientSecret + "&grant_type=client_credentials"
  console.log("Oauth Link Generated --", link)
  request.post(link, (error, res, body) => {
    if (error) {
      console.error(error)
      return
    }
    console.log(`statusCode: ${res.statusCode}`)
    console.log("body",body)
    console.log("parsed", JSON.parse(body)['access_token'])
    const data = JSON.parse(body)['access_token']
    oauth = data
  })
}
function usingValue(name) {
  return `Using environment variable for ${name}`;
}

function missingValue(name, variable) {
  const option = name.charAt(0);
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}

// Get options from the command line or the environment.
function getOption(optionName, environmentName) {
  const option = (() => {
    if (ext[optionName]) {
      return ext[optionName];
    } else if (process.env[environmentName]) {
      console.log(STRINGS[optionName + 'Env']);
      return process.env[environmentName];
    }
    console.log(STRINGS[optionName + 'Missing']);
    process.exit(1);
  })();
  console.log(`Using "${option}" for ${optionName}`);
  return option;
}

// Verify the header and the enclosed JWT.
function verifyAndDecode(header) {
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length);
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
    }
    catch (ex) {
      throw Boom.unauthorized(STRINGS.invalidJwt);
    }
  }
  throw Boom.unauthorized(STRINGS.invalidAuthHeader);
}
function helixRequest(name){
  console.log("helix", name)
  console.log('oauth---',oauth)  
  link = "https://api.twitch.tv/helix/users?" + name
  console.log("link",link)
  return new Promise(resolve=>{
    const options = {
      url: link,
      headers: {
        'Authorization': 'Bearer ' + oauth,
        'Client-ID' : clientId
      }
    };
    request.get(options, (err, res, body) =>{
      console.log("BODY-----",body)
      // console.log("Response!!!!!", JSON.parse(body).data[0].display_name)
      message = JSON.parse(body).data
      resolve(message)
    })
  })
}
function tmiRequest(){
  console.log("promise begin");
  return new Promise(resolve=>{
    request.get('https://tmi.twitch.tv/group/user/itmejp/chatters', (err, res, body) => {
      resolve(body)
    })
  })
};

async function getViewerHandler(req) {
  // Verify all requests.
  const payload = verifyAndDecode(req.headers.authorization);
  // console.log(payload)
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

  test = await tmiRequest()
  data = JSON.parse(test)
  data = data.chatters.viewers
  resultCount = Math.min(data.length, 80)
  var hold = []
  var pointer = 0
  for(var i = 0; i<resultCount;i++){
    var min = 0
    var max = Math.floor(data.length);
    pointer = Math.floor(Math.random() * (max - min + 1)) + min
    // console.log(pointer,data[pointer])
    hold.push(data[pointer])
    data.splice(pointer,1)
  }
  console.log("!!!!!!", hold);
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
  console.log("info done", info)
  for(item in info){
    id = info[item].id
    pairs.push([id,hold[item]])
  }
  console.log("Pairs", pairs)
  channelViewers[channelId] = pairs || ['N/A']
  currentViewers = JSON.stringify(channelViewers[channelId]);
  message = "Starting Array--" + currentViewers
  attemptViewerBroadcast(channelId,message);
  return message
  
  // Store the color for the channel.
  // let currentViewers = channelViewers[channelId] || [];

  // Bot abuse prevention:  don't allow a user to spam the button.
  if (userIsInCooldown(opaqueUserId)) {
    throw Boom.tooManyRequests(STRINGS.cooldown);
  }

  // Rotate the color as if on a color wheel.
  // verboseLog(STRINGS.cyclingColor, channelId, opaqueUserId);
  // currentColor = color(currentColor).rotate(colorWheelRotation).hex();

  // Save the new color for the channel.
  // channelViewers[channelId] = currentColor;

  // Broadcast the color change to all other extension instances on this channel.
  
  
}

function removeHandler(req){
  const payload = verifyAndDecode(req.headers.authorization);
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  data = req.payload
  console.log(data.name)
  message = 'Remove Name--' + data.name + '--'
  viewers = channelViewers[channelId]
  console.log('!@!@!@!@---',viewers)
  for(item in viewers){
    if(viewers[item][1] == data.name){
      message = message + viewers[item][0]
      viewers.splice(item,1)
    }
  }
  channelViewers[channelId] = viewers
  attemptViewerBroadcast(channelId, message)
  return message
}

function colorQueryHandler(req) {
  // // Verify all requests.
  console.log('colorQueryHandler')
  // const payload = verifyAndDecode(req.headers.authorization);

  // // Get the color for the channel from the payload and return it.
  // const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  // const currentColor = color(channelViewers[channelId] || initialColor).hex();
  // verboseLog(STRINGS.sendColor, currentColor, opaqueUserId);
  // return currentColor;
}

function attemptViewerBroadcast(channelId, message) {
  // Check the cool-down to determine if it's okay to send now.
  const now = Date.now();
  const cooldown = channelCooldowns[channelId];
  if (!cooldown || cooldown.time < now) {
    // It is.
    sendViewerBroadcast(channelId, message);
    channelCooldowns[channelId] = { time: now + channelCooldownMs };
  } else if (!cooldown.trigger) {
    // It isn't; schedule a delayed broadcast if we haven't already done so.
    cooldown.trigger = setTimeout(sendViewerBroadcast, now - cooldown.time, channelId,message);
  }
}

function sendViewerBroadcast(channelId,message) {
  // Set the HTTP headers required by the Twitch API.
  const headers = {
    'Client-ID': clientId,
    'Content-Type': 'application/json',
    'Authorization': bearerPrefix + makeServerToken(channelId),
  };

  // Create the POST body for the Twitch API request.
  // var currentViewers = JSON.stringify(channelViewers[channelId]);
  // currentViewers = "Starting Array--" + currentViewers
  console.log("current", message)
  const body = JSON.stringify({
    content_type: 'application/json',
    message: message,
    targets: ['broadcast'],
  });

  // Send the broadcast request to the Twitch API.
  // verboseLog(STRINGS.colorBroadcast, currentColor, channelId);
  request(
    `https://api.twitch.tv/extensions/message/${channelId}`,
    {
      method: 'POST',
      headers,
      body,
    }
    , (err, res) => {
      if (err) {
        console.log(STRINGS.messageSendError, channelId, err);
      } else {
        verboseLog(STRINGS.pubsubResponse, channelId, res.statusCode);
      }
    });
}

// Create and return a JWT for use by this service.
function makeServerToken(channelId) {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
    channel_id: channelId,
    user_id: ownerId, // extension owner ID for the call to Twitch PubSub
    role: 'external',
    pubsub_perms: {
      send: ['*'],
    },
  };
  return jsonwebtoken.sign(payload, secret, { algorithm: 'HS256' });
}

function userIsInCooldown(opaqueUserId) {
  // Check if the user is in cool-down.
  const cooldown = userCooldowns[opaqueUserId];
  const now = Date.now();
  if (cooldown && cooldown > now) {
    return true;
  }

  // Voting extensions must also track per-user votes to prevent skew.
  userCooldowns[opaqueUserId] = now + userCooldownMs;
  return false;
}
