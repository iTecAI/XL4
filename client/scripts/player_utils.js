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

function ftToPercentDimensions(w,h) {
    return {
        w: w / (current_map_data.dimensions.columns * current_map_data.dimensions.scale)*100,
        h: h / (current_map_data.dimensions.rows * current_map_data.dimensions.scale)*100
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
    }
};