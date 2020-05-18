var token = "";
var tuid = "";
var ebs = "";

// because who wants to type this every time?
var twitch = window.Twitch.ext;

// create the request options for our Twitch API calls
var requests = {
    set: createRequest('POST', 'cycle'),
    get: createRequest('GET', 'query')
};

function createRequest(type, method) {

    return {
        type: type,
        url:'https://9onsbc0vz2.execute-api.us-east-2.amazonaws.com/dev/lambda',
        success: updateBlock,
        error: logError
    }
}

function setAuth(token) {
    Object.keys(requests).forEach((req) => {
        twitch.rig.log('Setting auth headers');
        requests[req].headers = { 'Authorization': 'Bearer ' + token }
    });
}

twitch.onContext(function(context) {
    twitch.rig.log(context);
});

twitch.onAuthorized(function(auth) {
    // save our credentials
    token = auth.token;
    tuid = auth.userId;

    // enable the button
    $('#cycle').removeAttr('disabled');

    setAuth(token);
    $.ajax(requests.get);
});

function updateBlock(data) {
    twitch.rig.log('Updating block color', data.body);
    var message = '<p>'+ data.message +'</p>'
    $('h2').append(message);
}

function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  // we could also use the output to update the block synchronously here,
  // but we want all views to get the same broadcast response at the same time.
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}

$(function() {

    // when we click the cycle button
    $('#cycle').click(function() {
        if(!token) { return twitch.rig.log('Not authorized'); }
        twitch.rig.log('Requesting a color cycle');
        $.ajax(requests.set);
    });

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, color) {
        twitch.rig.log('Received broadcast color');
        updateBlock(color);
    });
});
