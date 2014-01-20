$(document).ready(function(){

    $(document).keypress(function(e) {
        if(e.which == 13) {
            send();
        }
    });

    $('#logout').click(function(){
        disconnect();
        $.ajax({
            url: "/doLogout",
            type: 'POST',
            data: {},
            complete: function() {
            },
            success: function(data) {
                window.location.replace(data.redirect);
            },
            error: function() {
            }
        });
    });

    $( "body" ).delegate( ".username", "click", function() {
       $('#chatWithList').html("Chat with: " + $( this ).text());
       $('#chatWith').val($( this ).text());
    });
});


var socket;
var firstconnect = true;
function connect() {
    if(firstconnect) {
        socket = io.connect(null);
        //
        socket.on('connect', function(){
            $('#status').html('Connected to server');
        });
        socket.on('disconnect', function(){
            $('#status').html('Disconnected from server');
        });
        socket.on('reconnecting', function(nextretry){
            $('#status').html('Reconnect in' + nextretry + 'miliseconds');
        });
        socket.on('reconnect_failed', function(){
            $('#status').html('Reconnected failed');
        });

        socket.on('chat', function(data){
            $('#messages').append('<b>' + data.name + '(IP:' +')(' +') says: </b><span style="color: blue;">' + data.message + '</span><br>');
        });

        socket.on('list', function(data){
            var str = "Online list: ";
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    str += ("<span class='username'>" + key + "</span>, ");
                }
            }
            $('#list').html(str);
        });

        firstconnect = false;
    } else {
        socket.socket.reconnect();
    }

};
function disconnect() {
    if(socket != null) {
        socket.disconnect();
    }
};
function send() {
    //socket.send($('#message').val());
    if ($('#message').val() == '') {
        alert('Please say something!');
    } else {
        socket.emit('data', {
            message: $('#message').val(),
            chatWith: $('#chatWith').val()
        });
        $('#message').val('');
        $('#message').focus();
    }
};