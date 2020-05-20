var token = "";
var tuid = "";
var ebs = "";
var username;
var viewID = [];
var viewName = [];
var display = false;

// because who wants to type this every time?
var twitch = window.Twitch.ext;
// create the request options for our Twitch API calls
var requests = {
    set: createRequest('POST', 'start'),
    get: createRequest('GET', 'query'),
    submit: createRequest('POST', 'remove'),
    stop: createRequest('POST', 'stop'),
    initial: createRequest('GET','initial')
};

function createRequest(type, method) {

    return {
        type: type,
        // url: location.protocol + '//localhost:8081/color/' + method,
        url:  'https://9onsbc0vz2.execute-api.us-east-2.amazonaws.com/dev/lambda/' + method,
        success: updateBlock,
        error: logError,
        data: '',
    }
}
function updateBlock(data){
    twitch.rig.log('Received broadcast list');
    console.log(data)
    try{
        x = data.split('--')
    }catch{
        x=[]
        console.log("not a string")
    }
    if(x[0] == 'remove'){
        console.log("remove")
    }else{
        // START BLOCK
        var row = ''
        var message = ''
        $('#content').show();
        twitch.rig.log('show')
        var viewers = data
        twitch.rig.log("viewers",viewers)
        for(item in viewers){
            viewID.push(viewers[item][0])
            viewName.push(viewers[item][1])
            var cell = '<td id="'+viewers[item][1]+'">' + viewers[item][1].toUpperCase() + '</td>'
            row = row + cell
            if((parseInt(item) + 1) % 6 == 0 || parseInt(item)+1 == viewers.length ){
                message = message + '<tr>'+ row +'</tr>'
                // twitch.rig.log("appended row", viewers[item][1],((item+1) % 7 ),item)
                row = ''
            }
        }
        $('#royaleTable').html(message)
        if(viewID.indexOf(Twitch.ext.viewer.id) != -1){
            $('#input-box').removeAttr('disabled');
        }
        else{
            $('#input-box').hide()
        }
        var max = $('#content').width()
        var table = $('table').width()
        twitch.rig.log("check", max,table)
        if(table>max){
            twitch.rig.log("!!!")
            while(table > max){
                size = $('table').css('font-size')
                size = parseInt(size) - 1
                twitch.rig.log(size )
                $('table').css('font-size', size)
                max = $('#content').width()
                table = $('table').width()
                twitch.rig.log("size",size,max,table)
            }
        }
    }
    

}
function setAuth(token) {
    Object.keys(requests).forEach((req) => {
        twitch.rig.log('Setting auth headers');
        requests[req].headers = { 'Authorization': 'Bearer ' + token }
    });
}

twitch.onContext(function(context) {
    twitch.rig.log('context---',context);
    
});

twitch.onAuthorized(function(auth) {
    // save our credentials
    token = auth.token;
    tuid = auth.userId;
    role = Twitch.ext.viewer.role;
    
    twitch.rig.log(role)
    if(role == 'broadcaster'){
        $('#start').show()
    }
    // enable the button
    setAuth(token);
    $.ajax(requests.initial)
    // on auth run get request

    // $.ajax(requests.get);
});

function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  // we could also use the output to update the block synchronously here,
  // but we want all views to get the same broadcast response at the same time.
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}

$(function() {
    
    // start button
    $('#start').click(function() {
        if(!token) { return twitch.rig.log('Not authorized'); }
        // twitch.rig.log('Requesting viewers', Twitch.ext.viewer.opaqueId);
        // twitch.rig.log('Requesting viewers2', token);
        // twitch.rig.log('Requesting viewers3', tuid);
        twitch.rig.log('Requesting viewers', Twitch.ext.viewer.id);
        // $('#start').hide()
        $.ajax(requests.set);
        display = true
        
        // else{
        //     $.ajax(requests.stop);
        //     $('#content').hide();
        //     display = false
        // }
    });
    $('#stop-button').click(function(){
        console.log("stopping")
        $.ajax(requests.stop)
        $('#stop-button').hide()
        $('#go-button').show()
    });
    $('#input-box').keyup(function(){
        twitch.rig.log('keydown')
        var typed = $('#input-box').val().toLowerCase();
        // if(viewName.indexOf(typed) != -1){
        //     requests.submit['data'] = {'name': typed}
        //     twitch.rig.log('SUCCESS')
        //     $.ajax(requests.submit)
        //     $('#input-box').val('')
        // }
        if(viewName.indexOf(typed) != -1){
            twitch.rig.log('SUCCESS')
            requests.submit['data'] = {'name': typed}
            $.ajax(requests.submit)
            $('#input-box').val('')
        }
        else{
            twitch.rig.log('typed =', typed, viewName.indexOf(typed))
        }
    })
    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        twitch.rig.log('Received broadcast list');
        twitch.rig.log(message)
        console.log(message)
        // twitch.rig.log("message",message)
        data = message.split("--")
        twitch.rig.log('DATA',data[0],data[0] == 'Starting Array')
        
        var row = ''
        var message = ''
        
        if(data[0] == 'Starting Array'){
            $('#content').show();
            twitch.rig.log('show')
            var viewers = JSON.parse(data[1])
            twitch.rig.log("viewers",viewers)
            for(item in viewers){
                viewID.push(viewers[item][0])
                viewName.push(viewers[item][1])
                var cell = '<td id="'+viewers[item][1]+'">' + viewers[item][1].toUpperCase() + '</td>'
                row = row + cell
                if((parseInt(item) + 1) % 6 == 0 || parseInt(item)+1 == viewers.length ){
                    message = message + '<tr>'+ row +'</tr>'
                    // twitch.rig.log("appended row", viewers[item][1],((item+1) % 7 ),item)
                    row = ''
                }
            }
            $('#royaleTable').html(message)
            if(viewID.indexOf(Twitch.ext.viewer.id) != -1){
                $('#input-box').removeAttr('disabled');
            }
            else{
                $('#input-box').hide()
            }
            var max = $('#content').width()
            var table = $('table').width()
            twitch.rig.log("check", max,table)
            if(table>max){
                twitch.rig.log("!!!")
                while(table > max){
                    size = $('table').css('font-size')
                    size = parseInt(size) - 1
                    twitch.rig.log(size )
                    $('table').css('font-size', size)
                    max = $('#content').width()
                    table = $('table').width()
                    twitch.rig.log("size",size,max,table)
                }
            }
        }
        if(data[0] == 'Remove Name'){
            twitch.rig.log("Removed,,,",data[1])
            const target = '#'+data[1];
            // $(target).css('text-decoration', 'line-through red')
            $(target).addClass("text-blur-out")
            const pointer = viewID.indexOf(data[2])
            viewID.splice(pointer,1)
            viewName.splice(pointer,1)
            if(Twitch.ext.viewer.id == data[2]){
                $('#input-box').hide();
            }
        }
        if(data[0] == 'Reset'){
            viewName = []
            viewID = []
            $('tr').remove()
        }
    });
});
