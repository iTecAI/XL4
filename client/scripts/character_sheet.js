var sid = null;
var current_data = {};
var current_dynamic_data = {};

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
    $('.panel .content .update.contained').each(function (i, e) {
        var path = $(this).attr('data-path').split('.');
        var current = data;
        for (var p = 0; p < path.length; p++) {
            current = current[path[p]];
            if (current == undefined) {
                break;
            }
        }
        if (current != undefined) {
            $(this).val(current);
            if ($(this).attr('type') == 'checkbox') {
                $(this).prop('checked',current);
            }
        }
    });
    $('.panel .content .output .value.update').each(function (i, e) {
        var total = 0;
        var items = $(this).attr('data-path').split('+');
        for (var i=0;i<items.length;i++) {
            var options_sp = items[i].split('~');
            var path = options_sp[0].split('.');
            var current = data;
            for (var p = 0; p < path.length; p++) {
                current = current[path[p]];
                if (current == undefined) {
                    break;
                }
            }

            if (options_sp.length > 1) {
                var options = options_sp[1].split(',');
                if (options.includes('reduce')) {
                    current = current.reduce(function(t,i){return t+i;},0);
                }
            }

            if (current != undefined) {
                total += current;
            }
        }
        $(this).text(total);
        
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
    $('.panel .content .contained.direct').off('change');
    $('.panel .content .contained.direct').on('change', function (event) {
        if ($(event.target).val().length > 0 || $(event.target).hasClass('allowedEmpty') || $(event.target).attr('type') == 'checkbox') {
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
                path: $(event.target).attr('data-path'),
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
    $('.edit-btn').off('click').on('click',function(event){
        $(event.delegateTarget).parent('.output').children('.output-mod').fadeToggle(200);
    });
}

function load_character(_data) {
    data = _data.character;
    dynamic = _data.dynamic;
    console.log(data);
    current_data = data;
    current_dynamic_data = dynamic;

    // Concatenate set races and homebrew races
    var races_internal = JSON.parse(JSON.stringify(races));
    for (var r = 0; r < data.race_info.length; r++) {
        var item = data.race_info[r];
        races_internal.push(item);
    }
    var classes_internal = JSON.parse(JSON.stringify(classes));
    for (var c = 0; c < data.class_info.length; c++) {
        var item = data.class_info[c];
        classes_internal.push(item);
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

    // Level/XP Input
    if (data.level.level == 20) {
        var nxp = '-';
    } else {
        var nxp = LEVELXP[data.level.level];
    }
    $('#level-label').text('/ '+nxp+' XP - Level '+data.level.level);
    if (data.level.classes.map(function(v,i,a){return v.level;}).reduce(function(t,c){return t+c;}) != data.level.level) {
        $('#level-xp-input').toggleClass('invalidated',true);
        $('#level-xp-input .main-label').text('XP / Level - LEVEL MUST EQUAL TOTAL CLASS LEVELS.');
    } else {
        $('#level-xp-input').toggleClass('invalidated',false);
        $('#level-xp-input .main-label').text('XP / Level');
    }

    // Hit dice display
    var hd_keys = Object.keys(data.hit_dice_current);
    var dummy_hd = $('<div></div>');
    for (var h=0;h<hd_keys.length;h++) {
        dummy_hd.append($('<input spellcheck="false" class="input update direct contained" data-type="number" data-min="0" style="width: 30%;text-align:center;padding-top:1px;padding-bottom:1px"></input>').attr('data-path','hit_dice_current.'+hd_keys[h]+'.current').attr('data-max',data.hit_dice_current[hd_keys[h]].max));
        dummy_hd.append(' ');
        dummy_hd.append($("<span class='label noselect' style='width: 65%;font-weight:bold;padding-top:1px;padding-bottom:1px;margin-top:0px;margin-bottom:0px'></span>").text('/ '+data.hit_dice_current[hd_keys[h]].max+'d'+hd_keys[h].split('_')[1]));
    }
    dummy_hd.append($("<span class='main-label'>Hit Dice</span>"));
    $('#hit-dice').html(dummy_hd.html());

    // AC and INIT
    $('#init-output .value').text(cond(dynamic.initiative>0,'+','')+dynamic.initiative);

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
    $('.output-mod').fadeOut(0);
});