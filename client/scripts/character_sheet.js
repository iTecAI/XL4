var sid = null;
var current_data = {};

var races = [];
var classes = [];
var macyInst = null;

function load_update_directs(data) {
    $('.panel .content .update').each(function (i, e) {
        var path = $(this).attr('data-path').split('.');
        var current = data;
        for (var p = 0; p < path.length; p++) {
            current = current[path[p]];
            if (current == undefined) {
                break;
            }
        }
        if (current != undefined) {
            $(this).children('.input').val(current);
            if ($(this).children('.input').attr('type') == 'checkbox') {
                $(this).children('.input').prop('checked',current);
            }
        }
    });
}

function setup_direct_event_listeners() {
    $('.panel .content .input.direct .input').off('change');
    $('.panel .content .input.direct .input').on('change', function (event) {
        if ($(event.target).val().length > 0 || $(event.target).parent('.input.direct').hasClass('allowedEmpty') || $(event.target).attr('type') == 'checkbox') {
            if (isNaN($(event.target).val())) {
                var val = $(event.target).val();
            } else {
                var val = Number($(event.target).val());
            }
            if ($(event.target).attr('data-type') == 'number') {
                if (isNaN(val)) {
                    return;
                }
                val = Number(val);
                if ($(event.target).attr('data-min') != undefined && val < Number($(event.target).attr('data-min'))) {
                    $(event.target).val($(event.target).attr('data-min'));
                    return;
                }
                if ($(event.target).attr('data-max') != undefined && val > Number($(event.target).attr('data-max'))) {
                    $(event.target).val($(event.target).attr('data-max'));
                    return;
                }
            }
            if ($(event.target).attr('type') == 'checkbox') {
                val = $(event.target).prop('checked');
            }
            post('/character/' + sid + '/modify/', console.log, {}, {
                path: $(event.target).parent('.input.direct').attr('data-path'),
                value: val
            });
        }
    });
}

function manual_event_listeners() {
    $('#add-class-button').off('click').on('click', function (event) {
        current_data.level.classes.push({class:'fighter',subclass:null,level:1});
        post('/character/'+sid+'/modify/',console.log,{},{
            path:'level.classes',
            value:current_data.level.classes
        },true);
    });
}

function load_character(data) {
    console.log(data);
    current_data = data;

    // Concatenate set races and homebrew races
    var races_internal = JSON.parse(JSON.stringify(races));
    for (var r = 0; r < data.race_info.length; r++) {
        var item = data.race_info[r];
        races_internal.push({
            ability_score_increase: item.scores,
            armor_class: item.armor,
            attacks: item.attacks,
            bonus_hp: item.hp_bonus,
            bonus_weapon_armor_profs: item.weapon_armor_profs,
            features_profs: item.other_proficiencies,
            languages: item.languages,
            race_name: item.name,
            resist_vuln_immune: item.resist_immune_vuln,
            speed: item.speed
        });
    }
    var classes_internal = JSON.parse(JSON.stringify(classes));
    for (var c = 0; c < data.class_info.length; c++) {
        var item = data.class_info[c];
        classes_internal.push({
            additional_proficiencies: item.multiclass_profs,
            armor_class: item.alt_ac,
            bonus_hp_per_level: item.bonus_hp,
            class_name: item.name,
            first_level_proficiencies: item.first_level_profs,
            hit_die: item.hit_die,
            init: item.init_bonus,
            saves_skills: item.saves_skills,
            speed_increase: item.speed_increase,
            spellcasting_ability: item.spell_ability,
            spellcasting_type: item.spell_type,
            subclass: item.subclass
        });
    }
    $('title').text(data.name);
    $('#panel-definition .title span').text(data.name);

    // Load races dropdown
    var dummy_options = $('<select></select>');
    var race_names = races_internal.map(function (v, i, a) { return v.race_name; }).sort();
    for (var r = 0; r < race_names.length; r++) {
        dummy_options.append($('<option></option>').attr('value', titleCase(race_names[r])).text(titleCase(race_names[r])));
    }
    $('#select-races').html(dummy_options.html());

    // Load class options
    var class_map = {}
    var class_names = classes_internal.map(function (v, i, a) {
        if (v.subclass == null) {
            if (!Object.keys(class_map).includes(v.class_name.toLowerCase())) {
                class_map[v.class_name.toLowerCase()] = [];
            }
            return v.class_name;
        } else {
            if (!Object.keys(class_map).includes(v.class_name.toLowerCase())) {
                class_map[v.class_name.toLowerCase()] = [];
            }
            class_map[v.class_name.toLowerCase()].push(v.subclass);
        }
    }).sort();
    var dummy_classlist = $('<div class="section" id="class-selector"></div>');
    for (var c = 0; c < data.level.classes.length; c++) {
        var class_select = $('<div class="input direct update" data-style="sub-name"></div>')
            .attr('data-path', 'level.classes.' + c + '.class')
            .append(
                $('<select class="input"></select>')
            )
            .append(
                $('<span class="label noselect">Class</span>')
            )
            .css('width', '40%');
        for (var cn = 0; cn < class_names.length; cn++) {
            if (class_names[cn]) {
                $(class_select).children('select.input').append($('<option></option>').attr('value', class_names[cn].toLowerCase()).text(class_names[cn]));
            }
        }
        var subclass_select = $('<div class="input direct update" data-style="sub-name"></div>')
            .attr('data-path', 'level.classes.' + c + '.subclass')
            .append(
                $('<select class="input"></select>')
            )
            .append(
                $('<span class="label noselect">Subclass</span>')
            )
            .css('width', '40%');
        $(subclass_select).children('select.input').append($('<option></option>').attr('value',null).text(''));
        for (var cn = 0; cn < class_map[data.level.classes[c].class].length; cn++) {
            $(subclass_select).children('select.input').append($('<option></option>').attr('value', class_map[data.level.classes[c].class][cn].toLowerCase()).text(class_map[data.level.classes[c].class][cn]));
        }
        var level_inp = $('<div class="input direct update" data-style="sub-name"></div>')
            .attr('data-path', 'level.classes.' + c + '.level')
            .append(
                $('<input class="input"></input>')
            )
            .append(
                $('<span class="label noselect">Level</span>')
            )
            .css('width', '16%');
        dummy_classlist.append(class_select).append(subclass_select).append(level_inp);
    }
    $('#class-selector').replaceWith(dummy_classlist);

    if (data.level.level == 20) {
        var nxp = '-';
    } else {
        var nxp = LEVELXP[data.level.level];
    }
    $('#level-label').text('/ '+nxp+' XP - Level '+data.level.level);

    load_update_directs(data);
    setup_direct_event_listeners();
    manual_event_listeners();
}

function pagelocal_update(data) {
    if (data.updates.characters.specific[sid]) {
        get('/character/' + sid, load_character);
    }
}

$(document).ready(function () {
    var params = parse_query_string();
    if (params.sheet == undefined) {
        window.location = '/characters';
        return;
    }
    sid = params.sheet;
    get('/character/' + params.sheet, load_character).fail(function (data) {
        bootbox.alert(data.responseJSON.result, function () { window.location = '/characters'; });
    });
    post('/compendium/categories/', function (data) {
        for (var i = 0; i < data.length; i++) {
            if (data[i].endpoint == 'races') {
                races.push(data[i].data);
            } else if (data[i].endpoint == 'classes') {
                classes.push(data[i].data);
            }
        }
    }, {}, { cats: ['races', 'classes'] });

});