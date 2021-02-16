// Globals
var fingerprint = 'requesting';
var uid = null;
var refresh_interval = 200;
var activating = false;

var SKILLS = {
    'acrobatics': 'dexterity',
    'animal_handling': 'wisdom',
    'arcana': 'intelligence',
    'athletics': 'strength',
    'deception': 'charisma',
    'history': 'intelligence',
    'insight': 'wisdom',
    'intimidation': 'charisma',
    'investigation': 'intelligence',
    'medicine': 'wisdom',
    'nature': 'intelligence',
    'perception': 'wisdom',
    'performance': 'charisma',
    'persuasion': 'charisma',
    'religion': 'intelligence',
    'sleight_of_hand': 'dexterity',
    'stealth': 'dexterity',
    'survival': 'wisdom'
};

var LEVELXP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

var DAMAGETYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];

var CONDITIONS = ['blinded', 'charmed', 'deafened', 'fatigued', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion'];

var CASTERS = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];

var ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

var LANGUAGES = ['common','dwarvish','elvish','giant','gnomish','goblin','halfling','orc','abyssal','celestial','draconic','deep speech','infernal','primordial','sylvan','undercommon','druidic','thieves\' cant'];

var CRXP = {
    0: 0,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000
}

function get_mod_from_score(score) {
    return Math.floor(((score-10)/2));
}
function exec_callback(callback) {
    return function(data, textStatus, jqXHR) {
        uid = jqXHR.getResponseHeader('uid');
        callback(data);
    };
}
function post(path, callback, parameters, body, showFailMessage) {
    if (showFailMessage) {
        return $.post({
            url: path + '?' + $.param(parameters),
            data: JSON.stringify(body),
            success: exec_callback(callback),
            beforeSend: function (xhr) { xhr.setRequestHeader('FP', fingerprint) }
        }).fail(function (result) {
            if (result.responseJSON.result) {
                var res = result.responseJSON.result;
            } else {
                var res = 'No associated error description.'
            }
            bootbox.alert({
                title: "Error: " + result.statusText,
                message: res
            });
        });
    } else {
        return $.post({
            url: path + '?' + $.param(parameters),
            data: JSON.stringify(body),
            success: exec_callback(callback),
            beforeSend: function (xhr) { xhr.setRequestHeader('FP', fingerprint) }
        });
    }
}
function get(path, callback, parameters, showFailMessage) {
    if (showFailMessage) {
        return $.get({
            url: path + '?' + $.param(parameters),
            success: exec_callback(callback),
            beforeSend: function (xhr) { xhr.setRequestHeader('FP', fingerprint) }
        }).fail(function (result) {
            if (result.responseJSON.result) {
                var res = result.responseJSON.result;
            } else {
                var res = 'No associated error description.'
            }
            bootbox.alert({
                title: "Error: " + result.statusText,
                message: res
            });
        });
    } else {
        return $.get({
            url: path + '?' + $.param(parameters),
            success: exec_callback(callback),
            beforeSend: function (xhr) { xhr.setRequestHeader('FP', fingerprint) }
        });
    }
}
function pagelocal_update(data) {

}
function root_refresh(data) {
    if (data.new_fp) {
        window.localStorage.setItem('fingerprint', data.new_fp);
        fingerprint = data.new_fp;
    }
    uid = data.uid;
    $('#noconn').removeClass('active');
    $('#login-btn').toggle(data.uid == null);
    $('#head-menu-btn').toggle(data.uid != null);
    $('#page-links').toggle(data.uid != null);
    if (uid == null) {
        activate('#side-bar', false);
        activate('#content-modal', false);
        activate('#head-menu-btn', false);
        $('#settings-window').slideUp(0);
    }
    pagelocal_update(data);
}
function activate(selector, set) {
    activating = true;
    $(selector).toggleClass('active', set);
    setTimeout(function () {
        activating = false;
    }, 300);
}
function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}
function firstUpper(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}
function cond(b, t, f) {
    if (b) { return t; } else { return f; }
}
function titleCase(str) {
    if ([0,null,[]].includes(str)) {
        var str = '';
    }
    var str = String(str);
    return str.split(' ').map(firstUpper).join(' ');
}
function parse_query_string() {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    var query_string = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        var key = decodeURIComponent(pair[0]);
        var value = decodeURIComponent(pair[1]);
        // If first entry with this name
        if (typeof query_string[key] === "undefined") {
            query_string[key] = decodeURIComponent(value);
            // If second entry with this name
        } else if (typeof query_string[key] === "string") {
            var arr = [query_string[key], decodeURIComponent(value)];
            query_string[key] = arr;
            // If third or later entry with this name
        } else {
            query_string[key].push(decodeURIComponent(value));
        }
    }
    return query_string;
}

function generate_unique_key(len) {
    if (len) {
        return sha256(String(Date.now())).slice(0,len);
    }
    return sha256(String(Date.now()));
}

function result_alert(data) {
    bootbox.alert(data.result);
}

$(document).ready(function () {
    $('#head-menu-btn').toggle(false);
    $('#settings-window').slideToggle(0, false);
    $('#head-menu-btn').on('click', function () {
        if (uid == null) { return; }
        activate('#side-bar');
        activate('#content-modal');
        activate('#head-menu-btn');
        $('#settings-window').slideUp(0);
    });
    $('#side-bar').on('click', function (event) {
        if (uid == null) { return; }
        if (!$('#side-bar').hasClass('active') && $(event.target).parents('#page-links').length == 0) {
            activate('#side-bar');
            activate('#content-modal');
            activate('#head-menu-btn');
            $('#settings-window').slideUp(0);
        }
    });
    $('#content-modal').on('click', function () {
        activate('#side-bar', false);
        activate('#content-modal', false);
        activate('#head-menu-btn', false);
        $('#settings-window').slideUp(0);
    });
    $('#user-settings-btn').on('click', function () {
        get('/user/', function (data) {
            $('#settings-window input[data-option=display_name]').val(data.options.display_name);
        });
        $('#settings-window').slideToggle(200);
    });
    if (window.localStorage.getItem('fingerprint') != null) {
        fingerprint = window.localStorage.getItem('fingerprint');
    }
    window.setInterval(function () {
        post('/server/keepalive/', root_refresh).fail(function (result) {
            console.log(result);
            $('#noconn').addClass('active');
        });
    }, refresh_interval);

    $('#login-btn').on('click', function () {
        $('#account-dialog input').val('');
        activate('#account-dialog');
    });
    $(document).on('click', function (event) {
        if (!$(event.target).hasClass('active') && $(event.target).parents('.active').length == 0 && !activating) {
            $('.active').removeClass('active');
        }
    });

    $('#login-submit').on('click', async function () {
        var email = $('#login-email').val();
        var pass = await process_password_for_check($('#login-password').val());
        if (email == '' || $('#login-password').val() == '') {
            bootbox.alert('Email and password boxes must be filled out.');
            return;
        }
        post('/server/login/', function () { $(document).trigger('click'); bootbox.alert('Logged in.'); }, {}, { username: email, passhash: pass }, true);
    });
    $('#signup-submit').on('click', async function () {
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
        post('/server/signup/', function () { $(document).trigger('click'); bootbox.alert('Logged in.'); }, {}, { username: email, passhash: pass }, true);
    });
    $('#logout-btn').on('click', function () {
        $('#head-menu-btn').trigger('click');
        post('/server/logout/', console.log);
    });

    $('#settings-window input').on('change', function () {
        if (!$(this).val() == '') {
            post('/user/settings/' + $(this).attr('data-option'), function () { }, {}, { value: $(this).val() }, true);
        }
    });
});