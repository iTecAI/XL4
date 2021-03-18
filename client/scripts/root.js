// Globals
var fingerprint = 'requesting';
var uid = null;
var refresh_interval = 200;
var activating = false;
var last_update = 0;

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

var LANGUAGES = ['common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc', 'abyssal', 'celestial', 'draconic', 'deep speech', 'infernal', 'primordial', 'sylvan', 'undercommon', 'druidic', 'thieves\' cant'];

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

var npc_imgs = ['aboleth', 'acolyte', 'adult-black-dragon', 'adult-blue-dracolitch', 'adult-blue-dragon', 'adult-brass-dragon', 'adult-bronze-dragon', 'adult-gold-dragon', 'adult-green-dragon', 'adult-red-dragon', 'adult-red-shadow-dragon', 'adult-silver-dragon', 'adult-white-dragon', 'adventurer', 'allosaurus', 'almiraj', 'ambush-drake', 'ancient-black-dragon', 'ancient-blue-dragon', 'ancient-brass-dragon', 'ancient-bronze-dragon', 'ancient-copper-dragon', 'ancient-gold-dragon', 'ancient-green-dragon', 'ancient-red-dragon', 'ancient-silver-dragon', 'ancient-white-dragon', 'androsphinx', 'animated-armor', 'animated-broom', 'ankheg', 'ankylosaurus', 'ape', 'apprentice-wizard', 'arakocra', 'archmage', 'arouchs', 'ash-zombie', 'assassin-desert', 'assassin-female', 'assassin', 'awakened-shrub', 'awakened-tree', 'axe-beak', 'baboon', 'badger-wild', 'bandit-captain', 'bandit', 'banshee', 'basilisk', 'bat', 'behir', 'beholder-zombie', 'beholder', 'berserker', 'black-bear-wild', 'black-dragon-wyrmling', 'black-pudding', 'blink-dog', 'blood-hawk', 'blue-dragon-wyrmling', 'blue-slaad', 'boar', 'bodak', 'bone-naga', 'brass-dragon-wyrmling', 'bronze-dragon-wyrmling', 'brown-bear', 'bugbear-chief', 'bugbear', 'bulette', 'bullywug', 'camel', 'carion-crawler', 'cat', 'chimera', 'chuul-boss', 'chuul', 'chuul2', 'clay-golem', 'cloaker', 'cockatrice', 'common-ghast', 'common-goblin-boss', 'common-goblin-shaman', 'common-gobline-heavy', 'constrictor-snake', 'couatl', 'countess', 'crab', 'cranium-rat', 'crawling-claw', 'crocodile', 'cult-fanatic', 'cult-fanatic2', 'cult-leader', 'cultist-defender', 'cultist-summoner', 'cultist', 'darkmantle', 'death-dog', 'death-slaad', 'death-tyrant', 'deathknight', 'deep-gnome', 'deepsea-chuul', 'demilitch', 'deva', 'dire-saber-tooth-tiger', 'dire-wolf', 'direwolf', 'displacer-beast', 'displacer-beast2', 'doppleganger', 'dracolitch', 'draft-horse', 'drider', 'drow-arachnomancer', 'drow-elite-warrior', 'drow-mage', 'drow-matron-mother', 'drow-priestess-of-lolth', 'drow', 'druid', 'dryad', 'duergar-cleric', 'duergar-rogue', 'duergar', 'duodrone', 'dwarven-noble', 'eagle', 'elephant', 'elk', 'empryean', 'ettercap', 'evil-druid', 'fairy-dragon', 'flameskull', 'flesh-golem', 'flumf', 'flying-snake', 'flying-sword', 'frog', 'gelatinous-cube', 'ghast', 'ghost', 'ghoul', 'giant-ape', 'giant-bat', 'giant-boar', 'giant-centipede', 'giant-constrictor-snake', 'giant-crocodile', 'giant-eagle', 'giant-elk', 'giant-fire-beetle', 'giant-goat', 'giant-hyena', 'giant-lizard', 'giant-octopus', 'giant-polar-bear', 'giant-scorpion', 'giant-seahorse', 'giant-shark', 'giant-spider', 'giant-toad', 'giant-vulture', 'giant-wasp', 'giant-weasel', 'giant-wolf-spider', 'gibbering-mouther', 'githyanki-knight', 'githyanki-warrior', 'githzerai-monk', 'githzerai-zerth', 'gladiator', 'goblin-elite-boss', 'goblin-elite-fighter', 'goblin-elite-heavy', 'goblin-elite-shaman', 'goblin-elite-spearman', 'goblin-grunt', 'goblin-sorcerer', 'goblin-welp', 'goblin_archer', 'gold-dragon-wyrmling', 'gold-dragon', 'gorgon', 'gray-ooz', 'green-hag', 'green-slaad', 'grell', 'grey-slaad', 'grick-alpha', 'grick', 'griffon', 'grimlock', 'guard-city', 'guard-large-city', 'guard-village', 'guardian-naga', 'gynosphinx', 'half-dragon', 'harpy', 'helmed-horror', 'hippogriff', 'hobgoblin-captain', 'hobgoblin-warlord', 'hobgoblin', 'homunculus', 'hook-horror', 'hunter-shark', 'hydra', 'hyena', 'intellect-devourer',
    'iron-golem', 'jackalwere', 'kenku-mage', 'kenku', 'killer-whale', 'kobold-commoner', 'kobold-elite-fighter', 'kobold-elite-sorceror', 'kobold', 'kraken', 'kuo-toa-archpriest', 'kuo-toa-monitor', 'kuo-toa-whip', 'kuo-toa', 'lamia', 'lesser-banshee', 'lich', 'lion', 'lizardfolk-king', 'lizardfolk-shaman', 'lizardfolk', 'mage', 'mammoth', 'manticore', 'mastiff', 'medusa', 'merfolk', 'merrow', 'mimic', 'mind-flayer', 'minotaur-skeleton', 'minotaur', 'monodrone', 'mule', 'mummy-lord', 'mummy', 'myconid-adult', 'myconid-sovereign', 'myconid-sprout', 'needle-blight', 'noble', 'nothic', 'ochre-jelly', 'octopus', 'orc-chief', 'orc-elite-war-chief', 'orc-eye-of-grummsh', 'orc', 'orog', 'owl', 'owlbear', 'paladin', 'panther', 'pegasus', 'pendrone', 'peryton', 'phase-spider', 'piercer', 'pit-fiend', 'pixie', 'planetar', 'plesiosaur', 'poisonous-snake', 'polar-bear', 'pony', 'priest', 'psudodragon', 'pteranodon', 'quadrone', 'quaggoth', 'quipper', 'rat', 'raven', 'red-dragon-wyrmling', 'red-slaad', 'reef-shark', 'remorhaz', 'rhino', 'roc', 'roper', 'rug-of-smothering', 'rust-monster', 'saber-tooth-tiger', 'sahuagin-baron', 'sahuagin-priestess', 'sahuagin', 'satyr', 'scarecrow', 'scorpion', 'scout', 'sea-hag', 'seahorse', 'shadow', 'shambling-mound', 'shield-guardian', 'shrieker', 'silver-dragon-wyrmling', 'skeleton', 'slaad-tadpole', 'solar', 'spectator', 'specter', 'spider', 'spirit-naga', 'sprite', 'spy', 'stirge', 'stone-golem', 'swarm-of-bats', 'swarm-of-cranium-rats', 'swarm-of-insects', 'swarm-of-poisonous-snakes', 'swarm-of-quippers', 'swarm-of-rats', 'swarm-of-ravens', 'tarrasque', 'thri-kreen', 'thug', 'tiger', 'treant', 'tribal-warrior', 'triceratops', 'tridrone', 'troglodyte', 'twig-blight', 'tyranosaurus-rex', 'umbar-hulk', 'unicorn', 'vampire-spawn', 'vampire', 'veteran', 'vine-blight', 'violet-fungus', 'vulture', 'warhorse', 'weasel', 'werebear', 'wereboar', 'wererat', 'weretiger', 'werewolf', 'white-dragon-wyrmling', 'wight', 'winged-kobold', 'winter-wolf', 'wolf', 'worg', 'wraith', 'wyvren', 'yeti', 'young-black-dragon', 'young-blue-dragon', 'young-brass-dragon', 'young-bronze-dragon', 'young-green-dragon', 'young-red-dragon', 'young-red-shadow-dragon', 'young-silver-dragon', 'young-white-dragon', 'yuan-ti-abomination', 'yuan-ti-malison', 'yuan-ti-pureblood', 'zombie-ogre', 'zombie'];

function get_mod_from_score(score) {
    return Math.floor(((score - 10) / 2));
}
function exec_callback(callback) {
    return function (data, textStatus, jqXHR) {
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
    if (JSON.stringify(data.user_data) != localStorage.user_data) {
        localStorage.user_data = JSON.stringify(data.user_data);
    }
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
    if (Date.now() > last_update + 790) {
        pagelocal_update(data);
        last_update = Date.now();
    }
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
    if ([0, null, []].includes(str)) {
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
        return sha256(String(Date.now())).slice(0, len);
    }
    return sha256(String(Date.now()));
}

function result_alert(data) {
    bootbox.alert(data.result);
}

function format_loaded_url(url) {
    return url.replace(/{fp}/g, fingerprint);
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