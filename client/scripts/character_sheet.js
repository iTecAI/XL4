var sid = null;
var current_data = {};
var current_dynamic_data = {};
var current_inventory = {
    tab: 'main',
    scroll: 0
};

var races = [];
var classes = [];
var attacks = [];
var equipment = [];
var armor = [];
var magicitems = [];
var spells = [];

function gp_convert(gp) {
    var pp = (gp - (gp % 10)) / 10;
    var _gp = ((gp % 10) - (gp % 1));
    var sp = (((gp * 10) % 10) - ((gp * 10) % 1));
    var cp = Number((((gp * 100) % 10) - ((gp * 10) % 1)).toFixed());
    var cp = cond(cp == 10, 0, cp);
    return {
        pp: pp,
        gp: _gp,
        sp: sp,
        cp: cp
    };
}
function gp_smartconvert(gp) {
    var raw = gp_convert(gp);
    return [cond(raw.pp > 0, raw.pp + ' pp', null), cond(raw.gp > 0, raw.gp + ' gp', null), cond(raw.sp > 0, raw.sp + ' sp', null), cond(raw.cp > 0, raw.cp + ' cp', null)].filter(function (el) {
        return el != null;
    }).join(', ');
}

function check_trait(trait) {
    return current_data.traits.map(function (v, i, a) {
        return v.toLowerCase();
    }).includes(trait.toLowerCase());
}

function set_radio(selector, val) {
    if (val == null) {
        $(selector).children('.radio-button').removeClass('selected');
    } else {
        $(selector).children('.radio-button').removeClass('selected');
        $(selector).children('.radio-button[data-value=' + val + ']').addClass('selected');
    }
}

function get_radio(selector) {
    var val = $(selector).children('.radio-button.selected').attr('data-value');
    if (val == undefined) { return null; }
    return val;
}

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
                $(this).children('.input').prop('checked', current);
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
                $(this).prop('checked', current);
            }
        }
    });
    $('.panel .content .output .value.update').each(function (i, e) {
        if ($(this).hasClass('concat')) {
            var total = '';
        } else {
            var total = 0;
        }
        var items = $(this).attr('data-path').split('+');
        for (var i = 0; i < items.length; i++) {
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
                    current = current.reduce(function (t, i) { return t + i; }, 0);
                }
                if (options.includes('mod_format')) {
                    current = cond(current >= 0, '+', '') + current;
                }
            }

            if (current != undefined) {
                total += current;
            } else {
                $(this).text('-');
                return;
            }
        }
        if ($(this).hasClass('convert-mod')) {
            total = cond(get_mod_from_score(total) >= 0, '+', '') + get_mod_from_score(total);
        }
        $(this).text(total);

    });
    $('.proficiency-button').not('.skill').each(function (i, e) {
        var path = $(this).attr('data-path').split('.');
        var current = data;
        for (var p = 0; p < path.length; p++) {
            current = current[path[p]];
            if (current == undefined) {
                break;
            }
        }
        if (current != undefined) {
            $(this).toggleClass('selected', current);
        }
    });
    $('.proficiency-button.skill').each(function (i, e) {
        var path = $(this).attr('data-path').split('.');
        var current = data;
        for (var p = 0; p < path.length; p++) {
            current = current[path[p]];
            if (current == undefined) {
                break;
            }
        }
        if (current != undefined) {
            $(this).toggleClass('selected', current.proficient);
            $(this).toggleClass('expert', current.expert);
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
        current_data.level.classes.push({ class: 'fighter', subclass: null, level: 1 });
        post('/character/' + sid + '/modify/', console.log, {}, {
            path: 'level.classes',
            value: current_data.level.classes
        }, true);
    });
    $('.edit-btn').off('click').on('click', function (event) {
        $(event.delegateTarget).parent('.output').children('.output-mod').fadeToggle(200);
    });
    $('.radio-button').off('click').on('click', function (event) {
        if ($(event.delegateTarget).hasClass('selected')) {
            $(event.delegateTarget).parents('.radio-block').children('.radio-button').removeClass('selected');
        } else {
            $(event.delegateTarget).parents('.radio-block').children('.radio-button').removeClass('selected');
            $(event.delegateTarget).addClass('selected');
        }
        $(event.delegateTarget).parents('.radio-block').trigger('change');
    });
    $('.rvi-radio.radio-block').off('change').on('change', function (event) {
        var value = get_radio(event.delegateTarget);
        var dtype = $(event.delegateTarget).parents('.rvi-block').attr('data-damage-type');
        if (value) {
            var new_arr = []
            for (var d = 0; d < current_data[value].length; d++) {
                if (current_data[value][d].type != dtype) {
                    new_arr.push(current_data[value][d]);
                }
            }
            new_arr.push({ type: dtype, flags: [] });
            current_data[value] = new_arr;
            post('/character/' + sid + '/modify/', console.log, {}, {
                path: value,
                'value': current_data[value]
            }, true);
        } else {
            var _rvi = ['resistances', 'vulnerabilities', 'immunities'];
            for (var v = 0; v < _rvi.length; v++) {
                var val = _rvi[v];
                var new_arr = []
                for (var d = 0; d < current_data[val].length; d++) {
                    if (current_data[val][d].type != dtype) {
                        new_arr.push(current_data[val][d]);
                    }
                }
                current_data[val] = new_arr;
            }
            post('/character/' + sid + '/batch_modify/', console.log, {}, {
                items: {
                    resistances: current_data.resistances,
                    vulnerabilities: current_data.vulnerabilities,
                    immunities: current_data.immunities
                }
            }, true);
        }
    });
    $('.proficiency-button').not('.skill').off('click').on('click', function (event) {
        if (!$(event.delegateTarget).hasClass('skill')) {
            $(event.delegateTarget).toggleClass('selected');
            post('/character/' + sid + '/modify/', console.log, {}, {
                path: $(event.delegateTarget).attr('data-path'),
                value: $(event.delegateTarget).hasClass('selected')
            }, true);
        }
    });
    $('.save-adv').off('change').on('change', function (event) {
        var val = get_radio(event.delegateTarget);
        if (val == 'adv') { val = 1; } else if (val == 'dis') { val = -1; } else { val = 0 }
        post('/character/' + sid + '/modify/', console.log, {}, {
            path: 'abilities.' + $(event.delegateTarget).parents('.saving-throw-item').attr('data-save') + '.save_advantage',
            value: val
        }, true);
    });
    $('.proficiency-button.skill').off('click').on('click', function (event) {
        if (!$(event.delegateTarget).hasClass('selected')) {
            $(event.delegateTarget).addClass('selected');

            items = {};
            items[$(event.delegateTarget).attr('data-path') + '.proficient'] = true;
            items[$(event.delegateTarget).attr('data-path') + '.expert'] = false;

            post('/character/' + sid + '/batch_modify/', console.log, {}, {
                items: items
            }, true);
        } else if ($(event.delegateTarget).hasClass('selected') && !$(event.delegateTarget).hasClass('expert')) {
            $(event.delegateTarget).addClass('expert');
            $(event.delegateTarget).addClass('selected');

            items = {};
            items[$(event.delegateTarget).attr('data-path') + '.proficient'] = true;
            items[$(event.delegateTarget).attr('data-path') + '.expert'] = true;

            post('/character/' + sid + '/batch_modify/', console.log, {}, {
                items: items
            }, true);
        } else {
            $(event.delegateTarget).removeClass('selected').removeClass('expert');

            items = {};
            items[$(event.delegateTarget).attr('data-path') + '.proficient'] = false;
            items[$(event.delegateTarget).attr('data-path') + '.expert'] = false;

            post('/character/' + sid + '/batch_modify/', console.log, {}, {
                items: items
            }, true);
        }

    });
    $('.skill-adv').off('change').on('change', function (event) {
        var val = get_radio(event.delegateTarget);
        if (val == 'adv') { val = 1; } else if (val == 'dis') { val = -1; } else { val = 0 }
        post('/character/' + sid + '/modify/', console.log, {}, {
            path: 'skills.' + $(event.delegateTarget).parents('.skill-item').attr('data-skill') + '.advantage',
            value: val
        }, true);
    });

    $('.switch-item .switch').off('click').on('click', function (event) {
        $(this).parents('.switch-item').toggleClass('selected');
        $(this).parents('.switch-item').trigger('change');
    });

    $('#item-box tbody').off('mousewheel').on('mousewheel',function() {
        current_inventory.scroll = $(this).scrollTop();
    });
}

function get_class(internals, _class, subclass) {
    if (subclass == undefined) {
        subclass = "§NUL";
    }
    if ([null, 0, '0', '', []].includes(subclass)) {
        subclass = "§NUL";
    }
    for (var c = 0; c < internals.length; c++) {
        if (String(internals[c].class_name).toLowerCase() == _class.toLowerCase() && (String(internals[c].subclass).toLowerCase() == String(subclass).toLowerCase() || internals[c].subclass == null && subclass == '§NUL')) {
            if (internals[c].subclass == null) {
                return {
                    class: internals[c],
                    subclass: null
                };
            } else {
                for (var k = 0; k < internals.length; k++) {
                    if (String(internals[k].class_name).toLowerCase() == _class.toLowerCase() && internals[k].subclass == null) {
                        return {
                            class: internals[k],
                            subclass: internals[c]
                        };
                    }
                }
            }
        }
    }
    return {
        class: null,
        subclass: null
    };
}

function load_equipped(data) {
    // Equipped Items
    var dummy_equipped = $('<div></div>');
    for (var e = 0; e < data.equipped.length; e++) {
        dummy_equipped
            .append(
                $('<input class="input contained direct update seamless-light allowedEmpty" list="equipped-list-' + e + '" data-index="' + e + '">')
                    .attr('data-path', 'equipped.' + e)
                    .val(data.equipped[e])
                    .css({
                        'text-align': 'left',
                        'border': '2px solid var(--gradient6)',
                        'margin-bottom': '2px'
                    })
                    .on('mouseenter', function (event) {
                        $('#panel-equipped .content .generated-item').remove();
                        if (magicitems.some(function (val) {
                            return val.name.toLowerCase() == $(event.delegateTarget).val().toLowerCase();
                        })) {
                            for (var m = 0; m < magicitems.length; m++) {
                                if (magicitems[m].name.toLowerCase() == $(event.delegateTarget).val().toLowerCase()) {
                                    $('#panel-equipped .content').append(
                                        generate_magicitem(magicitems[m])
                                            .css({
                                                position: 'absolute',
                                                top: '0px',
                                                left: 'calc(100% + 10px)'
                                            })
                                            .append(
                                                $('<i class="material-icons noselect">close</i>')
                                                    .css({
                                                        position: 'absolute',
                                                        top: '5px',
                                                        right: '5px'
                                                    })
                                                    .on('click', function (event) {
                                                        $(this).parents('.generated-item').remove();
                                                    })
                                            )
                                    );
                                    break;
                                }
                            }
                        }
                        if (armor.some(function (val) {
                            return val.name.toLowerCase() == $(event.delegateTarget).val().toLowerCase();
                        })) {
                            for (var m = 0; m < armor.length; m++) {
                                if (armor[m].name.toLowerCase() == $(event.delegateTarget).val().toLowerCase()) {
                                    $('#panel-equipped .content').append(
                                        generate_armor(armor[m])
                                            .css({
                                                position: 'absolute',
                                                top: '0px',
                                                left: 'calc(100% + 10px)'
                                            })
                                            .append(
                                                $('<i class="material-icons noselect">close</i>')
                                                    .css({
                                                        position: 'absolute',
                                                        top: '5px',
                                                        right: '5px'
                                                    })
                                                    .on('click', function (event) {
                                                        $(this).parents('.generated-item').remove();
                                                    })
                                            )
                                    );
                                    break;
                                }
                            }
                        }
                    })
            )
            .append(
                $('<datalist></datalist>')
                    .attr('id', 'equipped-list-' + e)
                    .append(data.inventory.main.items.map(function (item) {
                        return $('<option>').attr('value', item.name);
                    }))
            );
    }
    dummy_equipped
        .append(
            $('<input class="input seamless-light" list="equipped-list-newitem">')
                .val('')
                .css({
                    'text-align': 'left',
                    'border': '2px solid var(--gradient7)',
                    'margin-bottom': '2px'
                })
                .on('change', function (event) {
                    if ($(this).val().length > 0) {
                        data.equipped.push($(this).val());
                        post('/character/' + sid + '/modify/', console.log, {}, {
                            path: 'equipped',
                            value: data.equipped
                        });
                    }
                })
        )
        .append(
            $('<datalist></datalist>')
                .attr('id', 'equipped-list-newitem')
                .append(data.inventory.main.items.map(function (item) {
                    return $('<option>').attr('value', item.name);
                }))
        );
    $('#equipped-items div').remove();
    $('#equipped-items').append(dummy_equipped);
}

function load_languages(data) {
    var dummy_languages = $('<div></div>');
    for (var e = 0; e < data.languages.length; e++) {
        dummy_languages
            .append(
                $('<input class="input contained direct update seamless-light allowedEmpty" list="languages-list-' + e + '" data-index="' + e + '">')
                    .attr('data-path', 'languages.' + e)
                    .val(data.languages[e])
                    .css({
                        'text-align': 'left',
                        'border': '2px solid var(--gradient6)',
                        'margin-bottom': '2px'
                    })

            )
            .append(
                $('<datalist></datalist>')
                    .attr('id', 'languages-list-' + e)
                    .append(LANGUAGES.map(function (item) {
                        return $('<option>').attr('value', titleCase(item));
                    }))
            );
    }
    dummy_languages
        .append(
            $('<input class="input seamless-light" list="languages-list-newitem">')
                .val('')
                .css({
                    'text-align': 'left',
                    'border': '2px solid var(--gradient7)',
                    'margin-bottom': '2px'
                })
                .on('change', function (event) {
                    if ($(this).val().length > 0) {
                        data.languages.push($(this).val());
                        post('/character/' + sid + '/modify/', console.log, {}, {
                            path: 'languages',
                            value: data.languages
                        });
                    }
                })
        )
        .append(
            $('<datalist></datalist>')
                .attr('id', 'languages-list-newitem')
                .append(LANGUAGES.map(function (item) {
                    return $('<option>').attr('value', titleCase(item));
                }))
        );
    $('#languages-items div').remove();
    $('#languages-items').append(dummy_languages);
}

function load_traits(data) {
    var dummy_traits = $('<div></div>');
    for (var e = 0; e < data.traits.length; e++) {
        dummy_traits
            .append(
                $('<input class="input contained direct update seamless-light allowedEmpty" data-index="' + e + '">')
                    .attr('data-path', 'traits.' + e)
                    .val(data.languages[e])
                    .css({
                        'text-align': 'left',
                        'border': '2px solid var(--gradient6)',
                        'margin-bottom': '2px'
                    })

            )
    }
    dummy_traits
        .append(
            $('<input class="input seamless-light">')
                .val('')
                .css({
                    'text-align': 'left',
                    'border': '2px solid var(--gradient7)',
                    'margin-bottom': '2px'
                })
                .on('change', function (event) {
                    if ($(this).val().length > 0) {
                        data.traits.push($(this).val());
                        post('/character/' + sid + '/modify/', console.log, {}, {
                            path: 'traits',
                            value: data.traits
                        });
                    }
                })
        );
    $('#traits-items div').remove();
    $('#traits-items').append(dummy_traits);
}

function load_attacks(data, attacks_internal) {
    // Attacks
    var dummy_attacks = $('<tbody></tbody>');
    data.attacks.map(function (v, i) {
        for (var a = 0; a < attacks_internal.length; a++) {
            if (attacks_internal[a].name.toLowerCase() == v.toLowerCase()) {
                var abmod = cond(attacks_internal[a].type == 'ranged' || (attacks_internal[a].properties.some(function (t) { return t.name == 'finesse' }) && (
                    (data.abilities.dexterity.score_base + data.abilities.dexterity.score_manual_mod + data.abilities.dexterity.score_mod.reduce(function (t, i) { return t + i; }, 0))
                    >=
                    (data.abilities.strength.score_base + data.abilities.strength.score_manual_mod + data.abilities.strength.score_mod.reduce(function (t, i) { return t + i; }, 0))
                )),
                    get_mod_from_score(data.abilities.dexterity.score_base + data.abilities.dexterity.score_manual_mod + data.abilities.dexterity.score_mod.reduce(function (t, i) { return t + i; }, 0)),
                    get_mod_from_score(data.abilities.strength.score_base + data.abilities.strength.score_manual_mod + data.abilities.strength.score_mod.reduce(function (t, i) { return t + i; }, 0))
                )
                var bonus = abmod + cond(
                    data.proficiencies.weapon.includes(attacks_internal[a].group.toLowerCase()) ||
                    data.proficiencies.weapon.includes(attacks_internal[a].name.toLowerCase()) ||
                    data.proficiencies.weapon.includes(attacks_internal[a].name),
                    data.proficiency_bonus, 0
                ) + attacks_internal[a].enchant_bonus;
                if (Array.isArray(attacks_internal[a].damage)) {
                    if (attacks_internal[a].damage.length == 1) {
                        var dmgstr = attacks_internal[a].damage[0].dice +
                            cond(
                                attacks_internal[a].apply_mod,
                                cond(
                                    abmod >= 0,
                                    '+',
                                    ''
                                ) + abmod,
                                ''
                            ) + ' ' + attacks_internal[a].damage[0].type.replace('^', ' (magical)') + ' damage';
                    } else {
                        var dmgstr = attacks_internal[a].damage[0].dice +
                            cond(
                                attacks_internal[a].apply_mod,
                                cond(
                                    abmod >= 0,
                                    '+',
                                    ''
                                ) + abmod,
                                ''
                            ) + ' ' + attacks_internal[a].damage[0].type.replace('^', ' (magical)') + ' damage plus ' +
                            attacks_internal[a].damage[1].dice + ' ' + attacks_internal[a].damage[1].type.replace('^', ' (magical)');
                    }
                } else {
                    var dmgstr = attacks_internal[a].damage.dice +
                        cond(
                            attacks_internal[a].apply_mod,
                            cond(
                                abmod >= 0,
                                '+',
                                ''
                            ) + abmod,
                            ''
                        ) + ' ' + attacks_internal[a].damage.type.replace('^', ' (magical)') + ' damage';
                }
                var propstrs = [];
                for (var p = 0; p < attacks_internal[a].properties.length; p++) {
                    if (Object.keys(attacks_internal[a].properties[p]).length == 1 && attacks_internal[a].properties[p].name != undefined) {
                        propstrs.push('<b>' + attacks_internal[a].properties[p].name + '</b>');
                    } else if (Object.keys(attacks_internal[a].properties[p]).length == 2 && attacks_internal[a].properties[p].name != undefined && attacks_internal[a].properties[p].value != undefined) {
                        propstrs.push('<b>' + attacks_internal[a].properties[p].name + ': </b>' + attacks_internal[a].properties[p].value);
                    }
                }
                dummy_attacks.append(
                    $('<tr></tr>')
                        .append(
                            $('<td class="atk-title"></td>').append(
                                $('<select></select>')
                                    .append(
                                        $('<option></option>').attr('value', '').text('')
                                    )
                                    .append(attacks_internal.sort(function (n, o) {
                                        var x = n.name.toLowerCase();
                                        var y = o.name.toLowerCase();
                                        if (x < y) { return -1; }
                                        if (x > y) { return 1; }
                                        return 0;
                                    }).map(function (v) {
                                        return $('<option></option>').attr('value', v.name).text(v.name);
                                    }))
                                    .val(v).on('change', function (event) {
                                        if ($(this).val() == '') {
                                            data.attacks[Number($(event.delegateTarget).parents('tr').attr('data-index'))] = undefined;
                                        } else {
                                            data.attacks[Number($(event.delegateTarget).parents('tr').attr('data-index'))] = $(this).val();
                                        }
                                        post('/character/' + sid + '/modify', console.log(), {}, {
                                            path: 'attacks',
                                            value: data.attacks
                                        }, true);
                                    })
                            )
                        )
                        .append(
                            $('<td class="atk-bonus"></td>').text(cond(bonus >= 0, '+', '') + bonus)
                        )
                        .append(
                            $('<td class="atk-desc"></td>').html(
                                dmgstr + '<br>' + propstrs.join('<br>')
                            )
                        )
                        .attr('data-index', i)
                );
                break;
            }
        }
    });

    dummy_attacks.append(
        $('<tr class="new-atk"></tr>')
            .append(
                $('<td class="atk-title"></td>').append(
                    $('<select></select>')
                        .append(
                            $('<option></option>').attr('value', '').text('New Attack')
                        )
                        .append(attacks_internal.sort(function (n, o) {
                            var x = n.name.toLowerCase();
                            var y = o.name.toLowerCase();
                            if (x < y) { return -1; }
                            if (x > y) { return 1; }
                            return 0;
                        }).map(function (v) {
                            return $('<option></option>').attr('value', v.name).text(v.name);
                        }))
                        .val('').on('change', function (event) {
                            if ($(this).val() != '') {
                                data.attacks.push($(this).val());
                                post('/character/' + sid + '/modify', console.log(), {}, {
                                    path: 'attacks',
                                    value: data.attacks
                                }, true);
                            }
                        })
                )
            )
            .append(
                $('<td class="atk-bonus"></td>').text('')
            )
            .append(
                $('<td class="atk-desc"></td>').text('New Attack')
            )
    );

    $('#attacks-table tbody').remove();
    $('#attacks-table').append(dummy_attacks);
}

function load_races_classes(data, races_internal, classes_internal) {
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
        var subclass_select = $('<div class="input direct update allowedEmpty" data-style="sub-name"></div>')
            .attr('data-path', 'level.classes.' + c + '.subclass')
            .append(
                $('<select class="input"></select>')
            )
            .append(
                $('<span class="label noselect">Subclass</span>')
            )
            .css('width', '40%');
        $(subclass_select).children('select.input').append($('<option></option>').attr('value', null).text(''));
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
}

function load_levelxp(data) {
    // Level/XP Input
    if (data.level.level == 20) {
        var nxp = '-';
    } else {
        var nxp = LEVELXP[data.level.level];
    }
    $('#level-label').text('/ ' + nxp + ' XP - Level ' + data.level.level);
    if (data.level.classes.map(function (v, i, a) { return v.level; }).reduce(function (t, c) { return t + c; }) != data.level.level) {
        $('#level-xp-input').toggleClass('invalidated', true);
        $('#level-xp-input .main-label').text('XP / Level - LEVEL MUST EQUAL TOTAL CLASS LEVELS.');
    } else {
        $('#level-xp-input').toggleClass('invalidated', false);
        $('#level-xp-input .main-label').text('XP / Level');
    }
}

function load_hd_ac_init(data, dynamic) {
    // Hit dice display
    var hd_keys = Object.keys(data.hit_dice_current);
    var dummy_hd = $('<div></div>');
    for (var h = 0; h < hd_keys.length; h++) {
        dummy_hd.append($('<input spellcheck="false" class="input update direct contained" data-type="number" data-min="0" style="width: 30%;text-align:center;padding-top:1px;padding-bottom:1px"></input>').attr('data-path', 'hit_dice_current.' + hd_keys[h] + '.current').attr('data-max', data.hit_dice_current[hd_keys[h]].max));
        dummy_hd.append(' ');
        dummy_hd.append($("<span class='label noselect' style='width: 65%;font-weight:bold;padding-top:1px;padding-bottom:1px;margin-top:0px;margin-bottom:0px'></span>").text('/ ' + data.hit_dice_current[hd_keys[h]].max + 'd' + hd_keys[h].split('_')[1]));
    }
    dummy_hd.append($("<span class='main-label'>Hit Dice</span>"));
    $('#hit-dice').html(dummy_hd.html());

    // AC and INIT
    $('#init-output .value').text(cond(dynamic.initiative >= 0, '+', '') + dynamic.initiative);
}

function load_rvi(data) {
    // Resist/Vuln/Immune
    var dummy_rvi = $('<div></div>');
    for (var i = 0; i < DAMAGETYPES.length; i++) {
        var rvi_block = $('<div class="rvi-block"></div>').attr('data-damage-type', DAMAGETYPES[i]);
        rvi_block.append($('<span class="rvi-dmg"></span>').text(titleCase(DAMAGETYPES[i])).css({
            width: '25%',
            display: 'inline-block',
            'text-align': 'center',
            'font-weight': 'bold'
        }));
        rvi_block.append(
            $('<div class="rvi-radio radio-block"></div>')
                .append($('<button class="radio-button"></button>').attr('data-value', 'resistances').text('Resistance').css({
                    width: '32%',
                    display: 'inline-block'
                }))
                .append($('<button class="radio-button"></button>').attr('data-value', 'immunities').text('Immunity').css({
                    width: '32%',
                    display: 'inline-block'
                }))
                .append($('<button class="radio-button"></button>').attr('data-value', 'vulnerabilities').text('Vulnerability').css({
                    width: '32%',
                    display: 'inline-block'
                }))
                .css({
                    display: 'inline-block',
                    width: '75%',
                    'margin-bottom': '5px'
                })
        );
        rvi_block.appendTo(dummy_rvi);
    }
    $('#rvi-scroll').html(dummy_rvi.html());
    for (var r = 0; r < data.resistances.length; r++) {
        set_radio('.rvi-block[data-damage-type=' + data.resistances[r].type + '] .radio-block', 'resistances');
    }
    for (var r = 0; r < data.immunities.length; r++) {
        set_radio('.rvi-block[data-damage-type=' + data.immunities[r].type + '] .radio-block', 'immunities');
    }
    for (var r = 0; r < data.vulnerabilities.length; r++) {
        set_radio('.rvi-block[data-damage-type=' + data.vulnerabilities[r].type + '] .radio-block', 'vulnerabilities');
    }
}

function load_saves(data) {
    // Saves panel
    $('.saving-throw-item').each(function (i, e) {
        var _mapping = {
            '-1': 'dis',
            '0': null,
            '1': 'adv'
        };
        set_radio($(this).children('.radio-block'), _mapping[data.abilities[$(this).attr('data-save')].save_advantage.toString()]);
        var s_val = get_mod_from_score([
            data.abilities[$(this).attr('data-save')].score_base,
            data.abilities[$(this).attr('data-save')].score_manual_mod,
            data.abilities[$(this).attr('data-save')].score_mod.reduce(function (t, i) { return t + i; }, 0)
        ].reduce(function (t, i) { return t + i; }, 0)) + cond(data.abilities[$(this).attr('data-save')].save_proficient, data.proficiency_bonus, 0);
        $(this).children('.save-value').text(cond(s_val >= 0, '+', '') + s_val);
    });
}

function load_all_proficiencies(data) {
    // Proficiencies
    // -- Passive Perception
    $('#passive-perception .value span').text(
        10 + get_mod_from_score(cond(
            data.skills.perception.override,
            data.skills.perception.value,
            data.abilities[data.skills.perception.ability].score_base
            + data.abilities[data.skills.perception.ability].score_manual_mod
            + data.abilities[data.skills.perception.ability].score_mod.reduce(function (t, i) { return t + i; }, 0)
        )) + cond(data.skills.perception.advantage == 1, 5, 0) + cond(data.skills.perception.advantage == -1, -5, 0) + cond(
            data.skills.perception.proficient,
            data.proficiency_bonus,
            0
        ) + cond(
            data.skills.perception.expert,
            data.proficiency_bonus,
            0
        ) + cond(
            check_trait('feat: alert'), 5, 0
        )
    );

    // -- Skills
    var dummy_skills_box = $('<div></div>');
    var skill_keys = Object.keys(data.skills);
    for (var s = 0; s < skill_keys.length; s++) {
        var skillmod = get_mod_from_score(cond(
            data.skills[skill_keys[s]].override,
            data.skills[skill_keys[s]].value,
            data.abilities[data.skills[skill_keys[s]].ability].score_base
            + data.abilities[data.skills[skill_keys[s]].ability].score_manual_mod
            + data.abilities[data.skills[skill_keys[s]].ability].score_mod.reduce(function (t, i) { return t + i; }, 0)
        )) + cond(
            data.skills[skill_keys[s]].proficient,
            data.proficiency_bonus,
            0
        ) + cond(
            data.skills[skill_keys[s]].expert,
            data.proficiency_bonus,
            0
        );
        skillmod = cond(skillmod >= 0, '+', '') + skillmod;
        var item = $('<div></div>')
            .addClass('skill-item')
            .attr('data-skill', skill_keys[s])
            .append(
                $('<span></span>')
                    .addClass('proficiency-button')
                    .addClass('skill')
                    .attr('data-path', 'skills.' + skill_keys[s])
                    .append($('<span></span>'))
            )
            .append($('<span></span>').addClass('skill-value').text(skillmod))
            .append($('<span></span>').addClass('skill-title').text(titleCase(skill_keys[s])))
            .append(
                $('<div></div>')
                    .addClass('radio-block')
                    .addClass('skill-adv')
                    .append(
                        $('<button></button>')
                            .addClass('radio-button')
                            .attr('data-value', 'adv')
                            .text('Advantage')
                    )
                    .append(
                        $('<button></button>')
                            .addClass('radio-button')
                            .attr('data-value', 'dis')
                            .text('Disadvantage')
                    )

            );
        dummy_skills_box.append(item);
    }
    $('#skill-box').html(dummy_skills_box.html());
    $('.skill-adv').each(function (i, e) {
        set_radio(this, { '-1': 'dis', '0': null, '1': 'adv' }[data.skills[$(this).parents('.skill-item').attr('data-skill')].advantage.toString()]);
    });

    // -- Proficiencies
    var pkeys = Object.keys(data.proficiencies);
    for (var p = 0; p < pkeys.length; p++) {
        $('#prof-' + pkeys[p] + ' .prof-value').val(data.proficiencies[pkeys[p]].join(', '));
    }
    $('.prof-value').each(function (i, e) {
        $(this).off('change').on('change', function (event) {
            post('/character/' + sid + '/modify/', console.log, {}, {
                path: 'proficiencies.' + $(this).parents('#item-proficiencies > div').not('.hsep').attr('id').split('prof-')[1],
                value: $(this).val().split(', ')
            });
        });
    });
}

function load_internals(data) {
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
    var attacks_internal = JSON.parse(JSON.stringify(attacks));
    for (var c = 0; c < data.attack_info.length; c++) {
        var item = data.attack_info[c];
        var proc_item = {
            name: item.name,
            slug: item.name.toLowerCase().replace(/ /g, '-'),
            type: item.range_class.toLowerCase(),
            group: item.proficiency_category.toLowerCase(),
            cost: 0,
            weight: 0,
            apply_mod: item.apply_mod == 1,
            enchant_bonus: cond(item.enchant_bonus == null, 0, item.enchant_bonus)
        };
        proc_item.damage = [{ dice: item.damage, type: item.type }];
        if (item.bonus_damage && item.bonus_type) {
            proc_item.damage.push({ dice: item.bonus_damage, type: item.bonus_type });
        }
        if (item.properties == null) {
            proc_item.properties = [];
            attacks_internal.push(proc_item);
            continue;
        }
        if (item.proficiency_category.toLowerCase() == 'simple' || item.proficiency_category.toLowerCase() == 'martial') {
            proc_item.properties = [];
            var prop_items = item.properties.toLowerCase().split(', ');
            for (var p = 0; p < prop_items.length; p++) {
                try {
                    if (prop_items[p].includes(' (')) {
                        var _temp = {
                            name: prop_items[p].split(' (')[0],
                        };
                        try {
                            _temp[prop_items[p].split(' (')[1].split(' ')[0]] = prop_items[p].split(' (')[1].split(' ')[1].replace(')', '');
                        } catch {
                            _temp['value'] = prop_items[p].split(' (')[1].replace(')', '');
                        }
                        proc_item.properties.push(_temp);
                    } else {
                        proc_item.properties.push({
                            name: prop_items[p]
                        });
                    }
                } catch {

                }
            }
        } else {
            proc_item.properties = [{ name: item.properties }];
        }
        attacks_internal.push(proc_item);
    }
    var gear_internal = JSON.parse(JSON.stringify(armor));
    for (var c = 0; c < data.gear_info.length; c++) {
        var item = data.gear_info[c];
        var proc_item = {
            ac: cond(item.category.toLowerCase().includes('armor'), cond(item.ac_bonus == null, null, 10 + item.ac_bonus + cond(item.enchantment_bonus == null, 0, item.enchantment_bonus)), item.ac_bonus),
            cost: 0,
            min_str: item.required_str,
            name: item.name,
            slug: item.name.toLowerCase().replace(/ /g, '-'),
            stealth_dis: cond(item.stealth_mod == null, '', item.stealth_mod).toLowerCase() == 'disadvantage',
            type: item.category.toLowerCase().replace(' armor', ''),
            weight: 0
        };
        gear_internal.push(proc_item);
    }
    return {
        races: races_internal,
        classes: classes_internal,
        attacks: attacks_internal,
        gear: gear_internal
    };
}

function load_caster_stats(data, classes_internal) {
    var dummy_cstat = $('<div id="cstat-sub"></div>');
    for (var i = 0; i < data.spellcasting.caster_classes.length; i++) {
        /*
        <div class='output noselect score-output' data-style='internal-label' id='score-str'>
            <span class='value direct update convert-mod' data-path='abilities.strength.score_base+abilities.strength.score_manual_mod+abilities.strength.score_mod~reduce'></span>
            <span class='value direct update raw-score' data-path='abilities.strength.score_base+abilities.strength.score_manual_mod+abilities.strength.score_mod~reduce'></span>
            <span class='label noselect'>STR</span>
            <span class='edit-btn noselect'><i class='material-icons'>settings</i></span>
            <span class='output-mod noselect'>MOD: <input class='seamless contained direct update' data-path='abilities.strength.score_manual_mod'> BASE: <input class='seamless contained direct update' data-path='abilities.strength.score_base'></span>
        </div>
        */

        var class_data = get_class(
            classes_internal,
            data.spellcasting.caster_classes[i].class.class,
            data.spellcasting.caster_classes[i].class.subclass
        );
        if (class_data.class.spellcasting_ability == null) {
            if (class_data.subclass.spellcasting_ability == null) {
                var sc_ability = null;
            } else {
                var sc_ability = class_data.subclass.spellcasting_ability;
            }
        } else {
            var sc_ability = class_data.class.spellcasting_ability;
        }
        if (sc_ability == null) {
            continue;
        }
        var sp_atk = get_mod_from_score([
            data.abilities[sc_ability.toLowerCase()].score_base,
            data.abilities[sc_ability.toLowerCase()].score_manual_mod,
            data.abilities[sc_ability.toLowerCase()].score_mod.reduce(function (p, c, i) {
                return p + c;
            }, 0)
        ].reduce(function (p, c, i) {
            return p + c;
        }, 0)) + [
            data.spellcasting.caster_classes[i].mods.attack.manual,
            data.spellcasting.caster_classes[i].mods.attack.automatic.reduce(function (p, c, i) {
                return p + c;
            }, 0)
        ].reduce(function (p, c, i) {
            return p + c;
        }, 0) + data.proficiency_bonus;

        dummy_cstat.append(
            $('<div class="casting-stats-item noselect"></div>')
                .append($('<div class="output class-item" data-style="internal-label"></div>')
                    .append($('<span class="op-content"></span>')
                        .append(
                            $('<span></span>').text(titleCase(data.spellcasting.caster_classes[i].class.class))
                        )
                        .append(cond(data.spellcasting.caster_classes[i].class.subclass == null, '', '<span> - </span>'))
                        .append(
                            $('<span></span>').text(titleCase(cond(data.spellcasting.caster_classes[i].class.subclass == null, '', data.spellcasting.caster_classes[i].class.subclass)))
                        )
                    )
                    .append(
                        $('<span class="label noselect">Class</span>')
                    )
                )
                .append($('<div class="output class-item" data-style="internal-label"></div>')
                    .append($('<span class="op-content"></span>')
                        .append(
                            $('<span></span>').text(sc_ability)
                        )
                    )
                    .append(
                        $('<span class="label noselect">Casting Ability</span>')
                    )
                )
                .append($('<div class="output class-item" data-style="internal-label"></div>')
                    .append($('<span class="op-content"></span>')
                        .append(
                            $('<span></span>').text(8 + get_mod_from_score([
                                data.abilities[sc_ability.toLowerCase()].score_base,
                                data.abilities[sc_ability.toLowerCase()].score_manual_mod,
                                data.abilities[sc_ability.toLowerCase()].score_mod.reduce(function (p, c, i) {
                                    return p + c;
                                }, 0)
                            ].reduce(function (p, c, i) {
                                return p + c;
                            }, 0)) + [
                                data.spellcasting.caster_classes[i].mods.save.manual,
                                data.spellcasting.caster_classes[i].mods.save.automatic.reduce(function (p, c, i) {
                                    return p + c;
                                }, 0)
                            ].reduce(function (p, c, i) {
                                return p + c;
                            }, 0) + data.proficiency_bonus)
                        )
                    )
                    .append(
                        $('<span class="label noselect">Save DC</span>')
                    )
                    .append(
                        $("<span class='edit-btn noselect'><i class='material-icons'>settings</i></span>")
                    )
                    .append(
                        $("<span class='output-mod noselect'>MOD: <input class='seamless contained direct update' data-path='spellcasting.caster_classes." + i + ".mods.save.manual'></span>").hide()
                    )
                )
                .append($('<div class="output class-item" data-style="internal-label"></div>')
                    .append($('<span class="op-content"></span>')
                        .append(
                            $('<span></span>').text(cond(sp_atk >= 0, '+', '') + sp_atk)
                        )
                    )
                    .append(
                        $('<span class="label noselect">Spell Attack</span>')
                    )
                    .append(
                        $("<span class='edit-btn noselect'><i class='material-icons'>settings</i></span>")
                    )
                    .append(
                        $("<span class='output-mod noselect'>MOD: <input class='seamless contained direct update' data-path='spellcasting.caster_classes." + i + ".mods.attack.manual'></span>").hide()
                    )
                )
        );
    }

    $('#cstat-sub').remove();
    $(dummy_cstat).appendTo('#caster-stats');
}
function load_spellcasting(data, classes_internal) {
    if (data.spellcasting.caster_classes.length == 0) {
        return;
    }
    load_caster_stats(data, classes_internal);
    if (data.spellcasting.main_casting != null) {
        for (var l = 0; l < 9; l++) {
            $('#spell-level-' + (l + 1) + ' .slots-current').val(data.spellcasting.main_casting.slots[l].current);
            $('#spell-level-' + (l + 1) + ' .slots-max').text(data.spellcasting.main_casting.slots[l].max);
        }
    } else {
        $('#spell-level-' + (l + 1) + ' .slots-current').val(0).attr('disabled', true);
        $('#spell-level-' + (l + 1) + ' .slots-max').text(0);
    }

    if (data.spellcasting.pact_magic != null) {
        for (var l = 0; l < 5; l++) {
            if (data.spellcasting.pact_magic.slots[l].max == 0) {
                $('#spell-level-' + (l + 1) + ' .pact-magic').remove();
            } else {
                $('#spell-level-' + (l + 1) + ' .slots .slot-content').append(
                    $('<span class="pact-magic"></span>')
                        .append('<span> - </span>')
                        .append($('<input class="seamless-light input contained direct pact-slots-current">').attr('data-path', 'spellcasting.pact-magic.slots.' + l + '.current').val(data.spellcasting.pact_magic.slots[l].current))
                        .append(' / ')
                        .append($('<span class="pact-slots-max"></span>').text(data.spellcasting.pact_magic.slots[l].max))
                        .append(' Pact Slots')
                )
            }
        }
    } else {
        $('.spell-level .pact-magic').remove();
    }

    for (var level = 0; level < data.spellcasting.spells.length; level++) {
        var dummy_spell_list = $('<div class="spells"></div>');
        for (var s = 0; s < data.spellcasting.spells[level].length; s++) {
            dummy_spell_list.append(
                $('<span class="spell-item"></span>')
                    .append(
                        $("<span class='proficiency-button' data-path='spellcasting.spells." + level + "." + s + ".prepared'><span></span></span>")
                    )
                    .append(
                        $('<input class="seamless-light input contained update direct spell-input allowedEmpty">').attr('data-path', 'spellcasting.spells.' + level + '.' + s + '.name')
                    )
                    .on('dblclick', function (event) {
                        if (spells.some(function (v, i, a) {
                            return v.name.toLowerCase() == $(event.delegateTarget).children('.input').val().toLowerCase();
                        })) {
                            for (var item = 0; item < spells.length; item++) {
                                if (spells[item].name.toLowerCase() == $(event.delegateTarget).children('.input').val().toLowerCase()) {
                                    $('#panel-spellcasting .generated-item').remove();
                                    $('#panel-spellcasting').append(
                                        generate_spell(spells[item])
                                            .css({
                                                position: 'absolute',
                                                top: ((event.pageY - $(event.delegateTarget).parents('.spell-level').parent().offset().top) + $(window).scrollTop() + 1.5 * $(event.delegateTarget).parents('.spell-level').height()) + 'px',
                                                left: 'calc(100% + 10px)'
                                            })
                                            .append(
                                                $('<i class="material-icons noselect">close</i>')
                                                    .css({
                                                        position: 'absolute',
                                                        top: '5px',
                                                        right: '5px'
                                                    })
                                                    .on('click', function (event) {
                                                        $(this).parents('.generated-item').remove();
                                                    })
                                            )
                                    );
                                }
                            }
                        }
                    })
            )
        }

        dummy_spell_list.append($(
            $('<span class="spell-item"></span>')
                .append(
                    $('<input class="seamless-light spell-input" placeholder="Add New Spell">').attr('data-level', level).on('change', function (event) {
                        data.spellcasting.spells[$(this).attr('data-level')].push({ name: $(this).val(), prepared: level == 0 });
                        post('/character/' + sid + '/modify/', console.log, {}, {
                            path: 'spellcasting.spells.' + $(this).attr('data-level'),
                            value: data.spellcasting.spells[$(this).attr('data-level')]
                        });
                    })
                )
        ))

        dummy_spell_list.replaceAll('#spell-level-' + level + ' .spells');
    }

}

function load_inventory(data, manual) {
    if (manual == undefined) {
        var dummy_tabs = $('<div id="inventory-tabs" class="noselect noscroll"></div>');
        var tabs = Object.keys(data.inventory);
        for (var t = 0; t < tabs.length; t++) {
            var new_tab = $('<div class="inv-tab"></div>').append(
                $('<input class="seamless input contained direct">')
                    .val(data.inventory[tabs[t]].display_name)
                    .attr('data-path', 'inventory.' + tabs[t] + '.display_name')
                    .on('click', function (event) {
                        $('.inv-tab.selected').removeClass('selected');
                        $(this).parents('.inv-tab').addClass('selected');
                        current_inventory.tab = $(this).parents('.inv-tab').attr('data-tab');
                        load_inventory(JSON.parse(localStorage.getItem('characterData')), true);
                    })
            ).attr('data-tab', tabs[t]);
            if (data.inventory[tabs[t]].removable) {
                new_tab.append(
                    $('<i class="material-icons delete-tab">delete_forever</i>')
                        .on('click', function (event) {
                            bootbox.confirm('Deleting containers cannot be reversed. Continue?', function (result) {
                                if (result) {
                                    delete data.inventory[$(event.delegateTarget).parents('.inv-tab').attr('data-tab')];
                                    current_inventory.tab = 'main';
                                    post('/character/' + sid + '/modify/', console.log, {}, {
                                        path: 'inventory',
                                        value: data.inventory
                                    });
                                }
                            });
                        })
                )
            }
            dummy_tabs.append(new_tab);
        }
        dummy_tabs.on('mousewheel', function (event, delta) {
            this.scrollLeft -= delta * 30;
            event.preventDefault();
        });
        dummy_tabs.children('.inv-tab').removeClass('selected');
        dummy_tabs.children('.inv-tab[data-tab=' + current_inventory.tab + ']').addClass('selected');
        dummy_tabs.append(
            $('<div class="inv-tab-new"></div>')
                .append('<i class="material-icons">add</i>')
                .on('click', function (event) {
                    data.inventory[generate_unique_key(10)] = {
                        'display_name': 'New Container',
                        'coin': {
                            'cp': 0,
                            'sp': 0,
                            'ep': 0,
                            'gp': 0,
                            'pp': 0
                        },
                        'apply_weight': true,
                        'coin_weight': true,
                        'removable': true,
                        'items': [],
                        'current_weight': 0,
                        'max_weight': 0
                    };
                    post('/character/' + sid + '/modify/', console.log, {}, {
                        path: 'inventory',
                        value: data.inventory
                    });
                })
        );
        $(dummy_tabs).replaceAll('#inventory-tabs');
    }

    $('#setting-apply-weight').toggleClass('selected', data.inventory[current_inventory.tab].apply_weight).off('change').on('change', function (event) {
        post('/character/' + sid + '/modify/', console.log, {}, {
            path: 'inventory.' + current_inventory.tab + '.apply_weight',
            value: $(this).hasClass('selected')
        });
    });
    $('#setting-coin-weight').toggleClass('selected', data.inventory[current_inventory.tab].coin_weight).off('change').on('change', function (event) {
        post('/character/' + sid + '/modify/', console.log, {}, {
            path: 'inventory.' + current_inventory.tab + '.coin_weight',
            value: $(this).hasClass('selected')
        });
    });

    $('#current-weight').text(data.inventory[current_inventory.tab].current_weight).css(
        'color',
        cond(
            data.inventory[current_inventory.tab].current_weight <= data.inventory[current_inventory.tab].max_weight || data.inventory[current_inventory.tab].max_weight == 0,
            'black',
            'red'
        )
    );
    if (current_inventory.tab == 'main') {
        $('#max-weight').text(data.inventory[current_inventory.tab].max_weight);
        $('#weight-title').text('Inventory Weight: ');
    } else {
        $('#max-weight').html(
            $('<input class="input seamless-light direct contained">')
                .attr('data-path', 'inventory.' + current_inventory.tab + '.max_weight')
                .val(data.inventory[current_inventory.tab].max_weight)
        );
        $('#weight-title').text('Weight: ');
    }

    var coins = ['cp', 'sp', 'ep', 'gp', 'pp'];
    for (var c = 0; c < coins.length; c++) {
        $('#coin-' + coins[c] + ' input').attr('data-path', 'inventory.' + current_inventory.tab + '.coin.' + coins[c]).val(data.inventory[current_inventory.tab].coin[coins[c]]);
    }

    var itemBox = $('<tbody class="noscroll"></tbody>');
    var items = data.inventory[current_inventory.tab].items;
    for (var i = 0; i < items.length; i++) {
        itemBox.append(
            $('<tr></tr>')
                .attr('data-index', i)
                .append(
                    $('<td class="item-qt"></td>')
                        .append(
                            $('<input class="seamless-light input direct contained" data-type="number" data-min="0">')
                                .attr('data-path', 'inventory.' + current_inventory.tab + '.items.' + i + '.quantity')
                                .val(data.inventory[current_inventory.tab].items[i].quantity)
                        )
                )
                .append(
                    $('<td class="item-name"></td>')
                        .append(
                            $('<input class="seamless-light input direct contained allowedEmpty">')
                                .attr('data-path', 'inventory.' + current_inventory.tab + '.items.' + i + '.name')
                                .val(data.inventory[current_inventory.tab].items[i].name)
                        )
                )
                .append(
                    $('<td class="item-cost"></td>')
                        .append(
                            $('<input class="seamless-light input direct contained allowedEmpty">')
                                .attr('data-path', 'inventory.' + current_inventory.tab + '.items.' + i + '.cost')
                                .val(data.inventory[current_inventory.tab].items[i].cost)
                        )
                )
                .append(
                    $('<td class="item-weight"></td>')
                        .append(
                            $('<input class="seamless-light input direct contained allowedEmpty" data-type="number" data-min="0">')
                                .attr('data-path', 'inventory.' + current_inventory.tab + '.items.' + i + '.weight')
                                .val(data.inventory[current_inventory.tab].items[i].weight)
                        )
                )
        )
    }
    itemBox.append(
        $('<tr id="new-inv-item"></tr>')
            .append(
                $('<td class="item-qt"></td>')
            )
            .append(
                $('<td class="item-name"></td>')
                    .append(
                        $('<input class="seamless-light input" placeholder="New Item">')
                            .on('change',function(event){
                                data.inventory[current_inventory.tab].items.push({
                                    quantity:1,
                                    name:$(this).val(),
                                    weight:0,
                                    cost:'0 gp'
                                });
                                post('/character/' + sid + '/modify/', console.log, {}, {
                                    path: 'inventory.'+current_inventory.tab+'.items',
                                    value: data.inventory[current_inventory.tab].items
                                });
                            })
                    )
            )
            .append(
                $('<td class="item-cost"></td>')
            )
            .append(
                $('<td class="item-weight"></td>')
            )
    )
    $(itemBox).replaceAll('#item-box tbody');
    $('#item-box tbody').scrollTop(current_inventory.scroll);
}


function load_character(_data) {
    var data = _data.character;
    window.localStorage.setItem('characterData', JSON.stringify(data));

    var dynamic = _data.dynamic;
    console.log(data);
    current_data = data;
    current_dynamic_data = dynamic;

    var _int = load_internals(data);
    var races_internal = _int.races;
    var classes_internal = _int.classes;
    var attacks_internal = _int.attacks;
    var gear_internal = _int.gear;

    $('title').text(data.name);
    $('#panel-definition .title span').text(data.name);

    console.log(classes_internal);

    load_races_classes(data, races_internal, classes_internal);
    load_levelxp(data);
    load_hd_ac_init(data, dynamic)

    load_rvi(data);
    load_saves(data);
    load_all_proficiencies(data)

    load_attacks(data, attacks_internal);

    load_equipped(data);
    load_languages(data);
    load_traits(data);

    load_spellcasting(data, classes_internal);
    load_inventory(data);

    load_update_directs(data);
    setup_direct_event_listeners();
    manual_event_listeners();
    update_blocks(data);
}

function pagelocal_update(data) {
    if (data.updates.characters.specific[sid]) {
        get('/character/' + sid, load_character);
    }
}

function update_blocks(data) {
    if ($(window).width() >= 1300) {
        var columns = [
            [
                'definition',
                'proficiencies',
                'spellcasting',
                'appearance'
            ],
            [
                'defense',
                'speeds',
                'equipped',
                'languages',
                'inventory',
                'custom-info'
            ],
            [
                'scores-saves',
                'attacks',
                'traits',
                'background'
            ]
        ];
        var step = 0.33;
    } else if ($(window).width() < 1300 && $(window).width() >= 900) {
        var columns = [
            [
                'definition',
                'scores-saves',
                'speeds',
                'equipped',
                'traits',
                'inventory',
                'appearance'
            ],
            [
                'defense',
                'proficiencies',
                'attacks',
                'languages',
                'spellcasting',
                'background',
                'custom-info'
            ]
        ];
        var step = 0.49;
    } else {
        $('.panel').css({ position: 'relative', top: 'unset', left: 'unset' });
        return;
    }
    var cx = 10;
    for (var c = 0; c < columns.length; c++) {
        var start = 10;
        for (var p = 0; p < columns[c].length; p++) {
            if (data.spellcasting.caster_classes.length == 0 && columns[c][p] == 'spellcasting') {
                $('#panel-' + columns[c][p]).hide();
                continue;
            } else {
                $('#panel-' + columns[c][p]).show();
            }
            $('#panel-' + columns[c][p]).css({
                position: 'absolute',
                top: start + 'px',
                left: cx + 'px'
            });
            start += $('#panel-' + columns[c][p]).height() + 5;
        }
        cx += step * $('#content-box').width() + 5;
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
            } else if (data[i].endpoint == 'weapons') {
                attacks.push(data[i].data);
            } else if (data[i].endpoint == 'armor') {
                armor.push(data[i].data);
            } else if (data[i].endpoint == 'magicitems') {
                magicitems.push(data[i].data);
            } else if (data[i].endpoint == 'spells') {
                spells.push(data[i].data);
            } else {
                equipment.push(data[i].data);
            }

        }
    }, {}, { cats: ['races', 'classes', 'weapons', 'equipment', 'armor', 'magicitems', 'spells'] });
    $('.output-mod').fadeOut(0);
    $(window).on('resize', update_blocks);
});