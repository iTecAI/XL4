// Globals
var params = {
    campaign: null,
    map: null
};
var uid = null;
var current_cmp_data = {
    owner: '',
    id: '',
    settings: {
        rules: {
            variant_encumbrance: false
        }
    },
    name: '',
    maps: {},
    homebrew_creatures: [],
    characters: [],
    dms: [],
    players: [],
    _update: {
        self: false,
        maps: false
    },
    icon: null
};
var current_map_data = {
    campaign: '',
    id: '',
    objects: {},
    name: '',
    map_img: '',
    dimensions: {
        scale: 0,
        columns: 0,
        rows: 0
    },
    initiative: {
        combatants: {},
        current: null,
        active: false
    },
    _update: {
        self: false
    }
};
var current_tool = 'move';
var cursor_tool_map = {
    '#map-container img, .obscure': {
        move: 'move',
        obscure: 'crosshair',
        draw: 'crosshair',
        shape: 'crosshair',
        measure: 'crosshair',
        note: 'text'
    }
};
var note_colors = [
    'white',
    'black',
    'red',
    'blue',
    'green',
    'pink',
    'lightBlue',
    'limeGreen',
    'gray',
    'lightGray'
];
var stats_showing = {};

// Panning/Zooming constants
var scale = 1,
    panning = false,
    xoff = 0,
    yoff = 0,
    start = { x: 0, y: 0 },
    scale_max = 20,
    scale_min = 0.05
function setTransform(element) {
    $(element).css('transform', "translate(" + xoff + "px, " + yoff + "px) scale(" + scale + ")");
}
function getPercentPosition(x, y) {
    return {
        x: (x - $('#map-container').offset().left) / $('#map-container').width() * 100 / scale,
        y: (y - $('#map-container').offset().top) / $('#map-container').height() * 100 / scale
    }
}
function evGetPercentPosition(e) {
    return getPercentPosition(e.clientX, e.clientY);
}

// Measuring vars
var measure_start = { x: 0, y: 0 };
var measuring = false;
var measure_timeout = null;

// Selection box
var selector = {
    start: {
        x: 0,
        y: 0
    },
    end: {
        x: 0,
        y: 0
    },
    type: null
};

function isOverlap(div1, div2) {
    // Div 1 data
    var d1_offset = $(div1).position();
    var d1_height = $(div1).outerHeight(true);
    var d1_width = $(div1).outerWidth(true);
    var d1_distance_from_top = d1_offset.top + d1_height;
    var d1_distance_from_left = d1_offset.left + d1_width;

    // Div 2 data
    var d2_offset = $(div2).position();
    var d2_height = $(div2).outerHeight(true);
    var d2_width = $(div2).outerWidth(true);
    var d2_distance_from_top = d2_offset.top + d2_height;
    var d2_distance_from_left = d2_offset.left + d2_width;

    var not_colliding = (
        d1_distance_from_top < d2_offset.top ||
        d1_offset.top > d2_distance_from_top ||
        d1_distance_from_left < d2_offset.left ||
        d1_offset.left > d2_distance_from_left
    );

    // Return whether it IS colliding
    return !not_colliding;
};

function getRect(x1, y1, x2, y2) {
    if (x2 >= x1 && y2 >= y1) {
        var top = y1;
        var left = x1;
        var width = x2 - x1;
        var height = y2 - y1;
    } else if (x2 < x1 && y2 >= y1) {
        var top = y1;
        var left = x2;
        var width = x1 - x2;
        var height = y2 - y1;
    } else if (x2 >= x1 && y2 < y1) {
        var top = y2;
        var left = x1;
        var width = x2 - x1;
        var height = y1 - y2;
    } else {
        var top = y2;
        var left = x2;
        var width = x1 - x2;
        var height = y1 - y2;
    }
    return {
        top: top,
        left: left,
        width: width,
        height: height
    };
}

function getAngle(start, end) {
    var angle = Math.atan((end.y - start.y) / (end.x - start.x));
    if (end.y <= start.y && end.x >= start.x) { // Quadrant II
        angle += Math.PI;
    } else if (end.y >= start.y && end.x >= start.x) { // Quadrant III
        angle += Math.PI;
    } else if (end.y >= start.y && end.x <= start.x) { // Quadrant IV
        angle += Math.PI * 2;
    }
    if (angle == 2 * Math.PI) {
        angle = 0;
    }

    return angle;
}

function getCollisions(main, selector) {
    var cols = $(selector).toArray().map(function (v, i, a) {
        return [v, isOverlap(main, v)];
    });
    var rcols = [];
    for (var i = 0; i < cols.length; i++) {
        if (cols[i][1]) {
            rcols.push(cols[i][0]);
        }
    }
    return rcols;
}
function startSelector(e, type) {
    var pos = evGetPercentPosition(e);
    selector = {
        start: {
            x: pos.x,
            y: pos.y
        },
        end: {
            x: 0,
            y: 0
        },
        type: cond(type == undefined, 'rectangle', type)
    };
    $('#selection-box')
        .addClass('selecting')
        .addClass(selector.type)
        .css({
            top: selector.start.y + '%',
            left: selector.start.x + '%',
            width: '0%',
            height: '0%'
        });
}
function updateSelector(e) {
    if ($('#selection-box').hasClass('selecting')) {
        selector.end = evGetPercentPosition(e);
        if (selector.end.x >= selector.start.x && selector.end.y >= selector.start.y) {
            var top = selector.start.y;
            var left = selector.start.x;
            var width = selector.end.x - selector.start.x;
            var height = selector.end.y - selector.start.y;
        } else if (selector.end.x < selector.start.x && selector.end.y >= selector.start.y) {
            var top = selector.start.y;
            var left = selector.end.x;
            var width = selector.start.x - selector.end.x;
            var height = selector.end.y - selector.start.y;
        } else if (selector.end.x >= selector.start.x && selector.end.y < selector.start.y) {
            var top = selector.end.y;
            var left = selector.start.x;
            var width = selector.end.x - selector.start.x;
            var height = selector.start.y - selector.end.y;
        } else {
            var top = selector.end.y;
            var left = selector.end.x;
            var width = selector.start.x - selector.end.x;
            var height = selector.start.y - selector.end.y;
        }

        $('#selection-box')
            .css({
                top: top + '%',
                left: left + '%',
                width: width + '%',
                height: height + '%'
            });
        return {
            top: top,
            left: left,
            width: width,
            height: height
        };
    }
    return {
        top: 0,
        left: 0,
        width: 0,
        height: 0
    };
}
function finishSelector() {
    var collisions = getCollisions('#selection-box', '.object');
    $('#selection-box').removeClass('selecting');
    var s_copy = JSON.parse(JSON.stringify(selector));
    if (selector.end.x >= selector.start.x && selector.end.y >= selector.start.y) {
        var top = selector.start.y;
        var left = selector.start.x;
        var width = selector.end.x - selector.start.x;
        var height = selector.end.y - selector.start.y;
    } else if (selector.end.x < selector.start.x && selector.end.y >= selector.start.y) {
        var top = selector.start.y;
        var left = selector.end.x;
        var width = selector.start.x - selector.end.x;
        var height = selector.end.y - selector.start.y;
    } else if (selector.end.x >= selector.start.x && selector.end.y < selector.start.y) {
        var top = selector.end.y;
        var left = selector.start.x;
        var width = selector.end.x - selector.start.x;
        var height = selector.start.y - selector.end.y;
    } else {
        var top = selector.end.y;
        var left = selector.end.x;
        var width = selector.start.x - selector.end.x;
        var height = selector.start.y - selector.end.y;
    }
    selector = {
        start: {
            x: 0,
            y: 0
        },
        end: {
            x: 0,
            y: 0
        },
        type: null
    };
    return {
        selection: s_copy,
        dimensions: {
            top: top,
            left: left,
            width: width,
            height: height
        },
        collisions: collisions,
        type: s_copy.type
    };
}

function ftToPercentDimensions(w, h) {
    return {
        w: w / (current_map_data.dimensions.columns * current_map_data.dimensions.scale) * 100,
        h: h / (current_map_data.dimensions.rows * current_map_data.dimensions.scale) * 100
    };
}

var size_map = {
    tiny: 2.5,
    small: 5,
    medium: 5,
    large: 10,
    huge: 15,
    gargantuan: 20
};

// Context Menus
var custom_ctx = {
    delete: {
        dms: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'object'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'owned'
                    ]
                },
                {
                    match_type: 'any',
                    match: [
                        'shape'
                    ]
                }
            ]
        }
    },
    visibility_off: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'note',
                        'player-visible'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'shape',
                        'player-visible'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'npc',
                        'player-visible'
                    ]
                }
            ]
        },
        players: {}
    },
    visibility_on: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'note',
                        'player-invisible'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'shape',
                        'player-invisible'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'npc',
                        'player-invisible'
                    ]
                }
            ]
        },
        players: {}
    },
    color_cycle: {
        dms: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'note',
                        'shape'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'note',
                        'shape'
                    ]
                }
            ]
        }
    },
    add_character: {
        dms: {
            selector: [
                {
                    match_type: 'any',
                    match: [
                        '#map-container',
                        '#map-container > img'
                    ]
                }
            ],
            predicate: [
                {
                    match_type: 'any',
                    match: [
                        'has_character_in_campaign'
                    ]
                },
                {
                    match_type: 'not any',
                    match: [
                        'all_characters_in_map'
                    ]
                }
            ]
        },
        players: {
            selector: [
                {
                    match_type: 'any',
                    match: [
                        '#map-container',
                        '#map-container > img'
                    ]
                }
            ],
            predicate: [
                {
                    match_type: 'any',
                    match: [
                        'has_character_in_campaign'
                    ]
                },
                {
                    match_type: 'not any',
                    match: [
                        'all_characters_in_map'
                    ]
                }
            ]
        }
    },
    edit: {
        dms: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'character'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'owned'
                    ]
                }
            ]
        }
    },
    hide_stats: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'npc-full',
                        'showing-stats'
                    ]
                }
            ]
        },
        players: {}
    },
    show_stats: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'npc-full',
                        'hiding-stats'
                    ]
                }
            ]
        },
        players: {}
    },
    disable_background: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'token',
                        'background'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'background',
                        'owned'
                    ]
                }
            ]
        }
    },
    enable_background: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'token',
                        'no-background'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'no-background',
                        'owned'
                    ]
                }
            ]
        }
    },
    add_npc: {
        dms: {
            selector: [
                {
                    match_type: 'any',
                    match: [
                        '#map-container',
                        '#map-container > img'
                    ]
                }
            ]
        },
        players: {

        }
    },
    roll_init: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'npc',
                        '!in-initiative'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'character',
                        '!in-initiative'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        '!in-initiative',
                        'owned'
                    ]
                }
            ]
        }
    },
    attack: {
        dms: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'npc',
                        'character'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'any',
                    match: [
                        'npc',
                        'character'
                    ]
                }
            ]
        }
    },
    init_remove: {
        dms: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'npc',
                        'in-initiative'
                    ]
                },
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'in-initiative'
                    ]
                }
            ]
        },
        players: {
            classes: [
                {
                    match_type: 'all',
                    match: [
                        'character',
                        'in-initiative',
                        'owned'
                    ]
                }
            ]
        }
    }
};

function round_to_nearest(n, r) {
    return Math.round(n / r) * r;
}

function generate_creature_editable(creature, dynamic, oid) {
    var main = $('<div class="small-box-shadow generated-item creature noscroll"></div>');
    main.attr('data-oid', oid).attr('data-npc', JSON.stringify(creature)).attr('data-dynamic', JSON.stringify(dynamic));
    var converter = new showdown.Converter({ tables: true, strikethrough: true });
    var basicInfo = $('<div class="basic-info noselect"></div>')
        .append(
            $('<div class="name"></div>')
                .append(
                    $('<input class="npc-stat-mod" style="margin-bottom: 5px">')
                        .val(creature.name)
                        .on('change', function (event) {
                            post(
                                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).parents('.basic-info').parents('.creature').attr('data-oid') + '/modify/',
                                function () { }, {}, {
                                    path: 'data.name',
                                    value: $(this).val()
                                }
                            );
                        })
                )
                .append(
                    $('<div class="name-subtitle"></div>')
                        .append(
                            $('<span class="size"></span>').append(
                                $('<select class="npc-stat-mod"></select>')
                                    .append('<option value="tiny">Tiny</option>')
                                    .append('<option value="small">Small</option>')
                                    .append('<option value="medium">Medium</option>')
                                    .append('<option value="large">Large</option>')
                                    .append('<option value="huge">Huge</option>')
                                    .append('<option value="gargantuan">Gargantuan</option>')
                                    .val(creature.size.toLowerCase())
                                    .on('change', function (event) {
                                        post(
                                            '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).parents('.basic-info').parents('.creature').attr('data-oid') + '/modify/',
                                            function () { }, {}, {
                                                path: 'data.size',
                                                value: $(this).val().toLowerCase()
                                            }
                                        );
                                    })
                                    .css({
                                        color: 'var(--dnd1)'
                                    })
                            )
                        )
                        .append('<span> </span>')
                        .append(
                            $('<span class="type"></span>').text(creature.creature_type)
                        )
                        .append('<span>, </span>')
                        .append(
                            $('<span class="alignment"></span>').text(creature.alignment)
                        )
                        .append(
                            $('<div class="cr"></div>')
                                .append(
                                    $('<span class="cr-title">CR </span>')
                                )
                                .append(
                                    $('<span class="cr-val"></span>').text(creature.challenge_rating)
                                )
                        )
                )
        );

    main.append(basicInfo);

    var skills = $('<div class="skills"></div>')
        .append($('<span class="smallstat-title">Skills</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.skills), function (e, i) {
            var item = creature.skills[e];
            if (item.override) {
                var value = item.value;
            } else if (item.proficient) {
                var value = Math.floor((Number(creature.abilities[item.ability].score) - 10) / 2) + creature.proficiency_bonus + cond(item.expert, creature.proficiency_bonus, 0);
            } else {
                return null;
            }
            return $.map(e.split('_'), function (x, j) {
                return firstUpper(x);
            }).join(' ') + ' ' + cond(value >= 0, '+', '') + value;
        }).join(', ')));
    if ($(skills).children('.smallstat-value').text().length == 0) {
        skills = null;
    }

    var saves = $('<div class="saves"></div>')
        .append($('<span class="smallstat-title">Saving Throws</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.abilities), function (e, i) {
            var item = creature.abilities[e];
            if (!item.save_proficient && !item.save_override) {
                return null;
            }
            if (item.save_override != null) {
                var value = item.save_override;
            } else {
                var value = Math.floor((Number(item.score) - 10) / 2) + cond(item.save_proficient, creature.proficiency_bonus, 0);
            }
            return firstUpper(e.slice(0, 3)) + ' ' + cond(value >= 0, '+', '') + value;
        }).join(', ')));
    if ($(saves).children('.smallstat-value').text().length == 0) {
        saves = null;
    }

    var vuln = $('<div class="vulnerabilities"></div>')
        .append($('<span class="smallstat-title">Vulnerabilities</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.vulnerabilities), function (e, i) {
            var item = creature.vulnerabilities[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(vuln).children('.smallstat-value').text().length == 0) {
        vuln = null;
    }
    var resist = $('<div class="resistances"></div>')
        .append($('<span class="smallstat-title">Resistances</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.resistances), function (e, i) {
            var item = creature.resistances[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(resist).children('.smallstat-value').text().length == 0) {
        resist = null;
    }
    var immune = $('<div class="immunities"></div>')
        .append($('<span class="smallstat-title">Immunities</span>'))
        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.immunities), function (e, i) {
            var item = creature.immunities[e];
            return item.type + cond(item.flags.length > 0, ' (' + item.flags.join(', ') + ')', '');
        }).join(', ')));
    if ($(immune).children('.smallstat-value').text().length == 0) {
        immune = null;
    }

    var traits = $('<div class="special-abilities"></div>');
    for (var i = 0; i < creature.traits.length; i++) {
        traits.append(
            $('<div class="trait"></div>')
                .append($('<span class="trait-title"></span>').text(creature.traits[i].name + '. '))
                .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.traits[i].desc)))
        );
    }

    var actions = $('<div class="actions"></div>');
    for (var i = 0; i < creature.actions.length; i++) {
        var action = $('<div class="trait"></div>')
            .append($('<span class="trait-title"></span>').text(creature.actions[i].name + '. '))
            .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.actions[i].desc)));
        if (creature.actions[i].automated) {
            action.append(
                $('<div class="action-automated"></div>')
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Type:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(creature.actions[i].type))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Bonus:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(cond(creature.actions[i].bonus >= 0, '+', '') + creature.actions[i].bonus))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Reach/Range:</span>'))
                            .append($('<span class="smallstat-value"></span>').text(creature.actions[i].range.toString().replace(',', ' / ') + ' ft.'))
                    )
                    .append(
                        $('<div class="automation-item"></div>')
                            .append($('<span class="smallstat-title">Damage:</span>'))
                            .append($('<span class="smallstat-value"></span>').html($.map(creature.actions[i].damages, function (e, i) {
                                return e.average + ' (' + e.roll + ') ' + e.type + ' damage';
                            }).join(' <b>plus</b> ')))
                    )
            );
        }

        actions.append(action);
    }

    if (creature.legendary_actions != null) {
        var legendary_actions = $('<div class="legendary_actions"></div>');
        var ldesc = creature.legendary_actions.description;
        for (var i = 0; i < creature.legendary_actions.actions.length; i++) {
            legendary_actions.append(
                $('<div class="trait"></div>')
                    .append($('<span class="trait-title"></span>').text(creature.legendary_actions.actions[i].name + '. '))
                    .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.legendary_actions.actions[i].desc)))
            );
        }
    }
    if (creature.reactions.length > 0) {
        var reactions = $('<div class="reactions"></div>');
        for (var i = 0; i < creature.reactions.length; i++) {
            reactions.append(
                $('<div class="trait"></div>')
                    .append($('<span class="trait-title"></span>').text(creature.reactions[i].name + '. '))
                    .append($('<span class="trait-desc"></span>').html(converter.makeHtml(creature.reactions[i].desc)))
            );
        }
    }

    var expanded = $('<div class="expanded-monster"></div>')
        .append($('<div class="monster-separator"></div>'))
        .append(
            $('<div class="ac"></div>')
                .append($('<span class="smallstat-title">Armor Class</span>'))
                .append($('<span class="smallstat-value"></span>').append(
                    $('<input class="npc-stat-mod">')
                        .val(creature.armor_class.base)
                        .on('change', function (event) {
                            post(
                                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).parents('.expanded-monster').parents('.creature').attr('data-oid') + '/modify/',
                                function () { }, {}, {
                                path: 'data.armor_class.base',
                                value: Number($(this).val())
                            }
                            );
                        })
                ))
        )
        .append(
            $('<div class="hp"></div>')
                .append($('<span class="smallstat-title">Hit Points</span>'))
                .append($('<span class="smallstat-value"></span>').append(
                    $('<input class="npc-stat-mod">')
                        .val(dynamic.hp)
                        .on('change', function (event) {
                            post(
                                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).parents('.expanded-monster').parents('.creature').attr('data-oid') + '/modify/',
                                function () { }, {}, {
                                path: 'dynamic.hp',
                                value: Number($(this).val())
                            }
                            );
                        })
                ).append(' / ').append(
                    $('<input class="npc-stat-mod">')
                        .val(creature.hit_points.max)
                        .on('change', function (event) {
                            post(
                                '/campaign/' + current_cmp_data.id + '/maps/' + current_map_data.id + '/objects/' + $(this).parents('.expanded-monster').parents('.creature').attr('data-oid') + '/modify/',
                                function () { }, {}, {
                                path: 'data.hit_points.max',
                                value: Number($(this).val())
                            }
                            );
                        })
                )
                )
                .append(
                    $('<div class="speeds"></div>')
                        .append($('<span class="smallstat-title">Speed</span>'))
                        .append($('<span class="smallstat-value"></span>').text($.map(Object.keys(creature.speeds), function (e, i) {
                            if (e == 'hover') {
                                return null;
                            }
                            return e + ' ' + creature.speeds[e].base + ' ft.';
                        }).join(', ')))
                )
                .append($('<div class="monster-separator"></div>'))
                .append(
                    $('<table class="ability-table"></table>')
                        .append(
                            $('<thead><tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr></thead>')
                        )
                        .append(
                            $('<tbody></tbody>')
                                .append(
                                    $('<tr></tr>')
                                        .append(
                                            $('<td>' + $.map(Object.keys(creature.abilities), function (e, i) {
                                                var e = creature.abilities[e];
                                                return e.score_base + ' (' + cond(Math.floor((Number(e.score_base) - 10) / 2) >= 0, '+', '') + Math.floor((Number(e.score_base) - 10) / 2) + ')';
                                            }).join('</td><td>') + '</td>')
                                        )
                                )
                        )
                )
                .append($('<div class="monster-separator"></div>'))
                .append(saves)
                .append(skills)
                .append(vuln)
                .append(resist)
                .append(immune)
                .append(
                    cond(
                        creature.condition_immunities.length > 0,
                        $('<div class="condition_immunities"></div>')
                            .append($('<span class="smallstat-title">Condition Immunities</span>'))
                            .append($('<span class="smallstat-value"></span>').text(creature.condition_immunities.join(', '))),
                        ''
                    )
                )
                .append(
                    $('<div class="senses"></div>')
                        .append($('<span class="smallstat-title">Senses</span>'))
                        .append($('<span class="smallstat-value"></span>').text('passive Perception ' + (10 + cond(
                            creature.skills.perception.override,
                            creature.skills.perception.value,
                            Math.floor((Number(creature.abilities.wisdom.score) - 10) / 2) + cond(creature.skills.perception.proficient, creature.proficiency_bonus, 0) + cond(creature.skills.perception.expert, creature.proficiency_bonus, 0)
                        )) + cond(Object.keys(creature.senses).length > 0, ', ', '') + $.map(Object.keys(creature.senses), function (e, i) {
                            return e + ' ' + creature.senses[e] + ' ft.';
                        }).join(', ')))
                )
                .append(
                    $('<div class="languages"></div>')
                        .append($('<span class="smallstat-title">Languages</span>'))
                        .append($('<span class="smallstat-value"></span>').text(cond(creature.languages.length > 0 && creature.languages[0].length > 0, creature.languages.join(', '), '-')))
                )
                .append(
                    $('<div class="cr-small"></div>')
                        .append($('<span class="smallstat-title">Challenge</span>'))
                        .append($('<span class="smallstat-value"></span>').text(creature.challenge_rating + cond(Object.keys(CRXP).includes(creature.challenge_rating.toString()), ' (' + CRXP[creature.challenge_rating.toString()] + ' XP)', '')))
                )
                .append($('<div class="monster-separator"></div>'))
                .append(traits)
                .append($('<div class="actions-title">Actions</div>'))
                .append(actions)
                .append(cond(legendary_actions != undefined, $('<div class="actions-title">Legendary Actions</div>'), null))
                .append(cond(legendary_actions != undefined, $('<div class="actions-desc"></div>').text(ldesc), null))
                .append(cond(legendary_actions != undefined, legendary_actions, null))
                .append(cond(reactions != undefined, $('<div class="actions-title">Reactions</div>'), null))
                .append(cond(reactions != undefined, reactions, null))
        );

    main.append(expanded);

    return main;
}
