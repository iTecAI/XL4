// Globals
var fingerprint = 'requesting';
var refresh_interval = 200;
var activating = false;

// Functions
function post(path,callback,parameters,body,showFailMessage) {
    if (showFailMessage) {
        return $.post({
            url:path+$.param(parameters),
            data:JSON.stringify(body),
            success:callback,
            beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
        }).fail(function(result){
            bootbox.alert({
                title: "Error: "+result.statusText,
                message: result.responseJSON.result
            });
        });
    } else {
        return $.post({
            url:path+$.param(parameters),
            data:JSON.stringify(body),
            success:callback,
            beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
        });
    }
}
function get(path,callback,parameters,showFailMessage) {
    if (showFailMessage) {
        return $.get({
            url:path+$.param(parameters),
            success:callback,
            beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
        }).fail(function(result){
            bootbox.alert({
                title: "Error: "+result.statusText,
                message: result.responseJSON.result
            });
        });
    } else {
        return $.get({
            url:path+$.param(parameters),
            success:callback,
            beforeSend:function(xhr){xhr.setRequestHeader('FP', fingerprint)}
        });
    }
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
    $('#settings-window').slideToggle(0,false);
    $('#head-menu-btn').on('click',function(){
        activate('#side-bar');
        activate('#content-modal');
        activate('#head-menu-btn');
        $('#settings-window').slideUp(0);
    });
    $('#side-bar').on('click',function(){
        if (!$('#side-bar').hasClass('active')) {
            activate('#side-bar');
            activate('#content-modal');
            activate('#head-menu-btn');
            $('#settings-window').slideUp(0);
        }
    });
    $('#content-modal').on('click',function(){
        activate('#side-bar',false);
        activate('#content-modal',false);
        activate('#head-menu-btn',false);
        $('#settings-window').slideUp(0);
    });
    $('#user-settings-btn').on('click',function(){
        get('/user/',function(data){
            $('#settings-window input[data-option=display_name]').val(data.options.display_name);
        });
        $('#settings-window').slideToggle(200);
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
        post('/server/login/',function(){$(document).trigger('click');bootbox.alert('Logged in.');},{},{username:email,passhash:pass},true);
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
        post('/server/signup/',function(){$(document).trigger('click');bootbox.alert('Logged in.');},{},{username:email,passhash:pass},true);
    });
    $('#logout-btn').on('click',function(){
        $('#head-menu-btn').trigger('click');
        post('/server/logout/',console.log);
    });

    $('#settings-window input').on('change',function(){
        if (!$(this).val() == '') {
            post('/user/settings/'+$(this).attr('data-option'),function(){},{},{value:$(this).val()},true);
        }
    });
});