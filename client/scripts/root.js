// Globals
var fingerprint = 'requesting';
var refresh_interval = 200;

// Functions
function post(path,callback,parameters,body) {
    $.post({
        url:path+$.param(parameters),
        data:body,
        success:callback,
        beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
    });
}
function root_refresh(data) {
    if (data.new_fp) {
        window.localStorage.setItem('fingerprint',data.new_fp);
        fingerprint = data.new_fp;
    }
}

$(document).ready(function(){
    $('#head-menu-btn').on('click',function(){
        $('#side-bar').toggleClass('active');
        $('#content-modal').toggleClass('active');
    });
    if (window.localStorage.getItem('fingerprint')!=null) {
        fingerprint = window.localStorage.getItem('fingerprint');
    }
    window.setInterval(function(){
        post('/server/keepalive/',root_refresh);
    },refresh_interval);
});