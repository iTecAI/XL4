// Globals
var fingerprint = 'requesting';
var refresh_interval = 200;
var activating = false;

// Functions
function post(path,callback,parameters,body) {
    $.post({
        url:path+$.param(parameters),
        data:JSON.stringify(body),
        success:callback,
        beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
    }).fail(function(result){
        console.log(result);
    });
}
function root_refresh(data) {
    if (data.new_fp) {
        window.localStorage.setItem('fingerprint',data.new_fp);
        fingerprint = data.new_fp;
    }
    $('#login-btn').toggle(data.uid==null);
    $('#head-menu-btn').toggle(data.uid!=null);
}
function activate(selector,set) {
    activating = true;
    $(selector).toggleClass('active',set);
    setTimeout(function(){
        activating=false;
    },300);
}
function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

$(document).ready(function(){
    $('#head-menu-btn').toggle(false);
    $('#head-menu-btn').on('click',function(){
        console.log('click');
        activate('#side-bar');
        activate('#content-modal');
    });
    if (window.localStorage.getItem('fingerprint')!=null) {
        fingerprint = window.localStorage.getItem('fingerprint');
    }
    window.setInterval(function(){
        post('/server/keepalive/',root_refresh);
    },refresh_interval);

    $('#login-btn').on('click',function(){
        $('#account-dialog input').val('');
        activate('#account-dialog');
    });
    $(document).on('click',function(event){
        if (!$(event.target).hasClass('active') && $(event.target).parents('.active').length == 0 && !activating) {
            $('.active').removeClass('active');
        }
    });

    $('#login-submit').on('click',async function(){
        var email = $('#login-email').val();
        var pass = await process_password_for_check($('#login-password').val());
        if (email == '' || $('#login-password').val() == '') {
            bootbox.alert('Email and password boxes must be filled out.');
            return;
        }
        post('/server/login/',function(){$(document).trigger('click');},{},{username:email,passhash:pass});
    });
    $('#signup-submit').on('click',async function(){
        var email = $('#signup-email').val();
        if ($('#signup-password').val() == $('#signup-password-conf').val()) {
            var pass = await process_password_for_save($('#signup-password').val());
        } else {
            bootbox.alert('Passwords must match.');
            return;
        }
        if (email == '' || $('#signup-password').val() == '') {
            bootbox.alert('Email and password boxes must be filled out.');
            return;
        }
        post('/server/signup/',function(){$(document).trigger('click');},{},{username:email,passhash:pass});
    });
    $('#logout-btn').on('click',function(){
        $('#head-menu-btn').trigger('click');
        post('/server/logout/',console.log);
    });
});