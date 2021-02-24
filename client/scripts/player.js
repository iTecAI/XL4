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
        measure: 'crosshair'
    }
};

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
    }
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
function startSelector(e) {
    var pos = evGetPercentPosition(e);
    selector = {
        start: {
            x: pos.x,
            y: pos.y
        },
        end: {
            x: 0,
            y: 0
        }
    };
    $('#selection-box')
        .addClass('selecting')
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
    }
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
        }
    };
    return {
        selection: s_copy,
        dimensions: {
            top: top,
            left: left,
            width: width,
            height: height
        },
        collisions: collisions
    };
}

function setup_map_base() {
    var map_container = $('<div id="map-container" class="noselect noscroll"></div>');
    map_container.append($('<img draggable=false>').attr('src', format_loaded_url(current_map_data.map_img)));

    $(map_container).on('mousedown', function (e) {
        if ($(e.target).hasClass('object') || $(e.target).parents('.object').length > 0) {
            if (!current_cmp_data.dms.includes(uid) && (
                ($(e.target).hasClass('obscure') || $(e.target).parents('.obscure').length > 0) ||
                ($(e.target).hasClass('npc') || $(e.target).parents('.npc').length > 0)
            )) {

            } else {
                return;
            }
        }
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            start = { x: e.clientX - xoff, y: e.clientY - yoff };
            panning = true;
        } else if (current_tool == 'measure') {
            measure_start = evGetPercentPosition(e);
            measuring = true;
            $('#measure-tool').remove();
            $('#measuring-container').remove();
            $('#map-container').append(
                $('<div id="measuring-container"></div>')
                    .append(
                        $('<svg id="measure-tool" version="1.1" width="100%" height="100%"></svg>')
                            .css({
                                position: 'absolute',
                                top: '0px',
                                left: '0px'
                            })
                    )
                    .css({
                        position: 'absolute',
                        top: measure_start.y + '%',
                        left: measure_start.x + '%'
                    })
                    .append(
                        $('<span>0 ft.</span>')
                    )
            );

            var svgel = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            svgel.setAttribute('x1', '0');
            svgel.setAttribute('y1', '0');
            svgel.setAttribute('stroke', 'var(--secondary)');
            svgel.setAttribute('stroke-width', '2');
            document.getElementById('measure-tool').appendChild(svgel);
            if (measure_timeout != null) {
                clearTimeout(measure_timeout);
            }
        } else if (current_tool == 'obscure') {
            startSelector(e);
        }
    });
    $(map_container).on('mouseup', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            panning = false;
        } else if (current_tool == 'measure' && measuring) {
            var curpos = evGetPercentPosition(e);
            var dx = (curpos.x - measure_start.x) * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100;
            var dy = (curpos.y - measure_start.y) * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100;
            var dist = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));
            measuring = false;
            if (dist < 1) {
                $('#measuring-container').remove();
            } else {
                measure_timeout = window.setTimeout(function () {
                    $('#measuring-container').remove();
                }, 5000);
            }
        } else if (current_tool == 'obscure') {
            var selector_data = finishSelector();
            if (selector_data.dimensions.left + selector_data.dimensions.width > 100) {
                selector_data.dimensions.width = 100 - selector_data.dimensions.left;
            }
            if (selector_data.dimensions.top + selector_data.dimensions.height > 100) {
                selector_data.dimensions.height = 100 - selector_data.dimensions.top;
            }
            if (Math.abs(selector_data.dimensions.width) < 0.002 || Math.abs(selector_data.dimensions.height) < 0.002 || (selector_data.dimensions.top == 0.0 && selector_data.dimensions.left == 0.0)) {
                return;
            }
            post(
                '/campaign/'+current_cmp_data.id+'/maps/'+current_map_data.id+'/objects/add/',
                console.log,
                {},{
                    object_type: 'obscure',
                    data: {
                        width: selector_data.dimensions.width,
                        height: selector_data.dimensions.height
                    },
                    x: selector_data.dimensions.left,
                    y: selector_data.dimensions.top
                }
            );
        }
    });
    $(map_container).on('mousemove', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        if (current_tool == 'move') {
            if (!panning) {
                return;
            }
            xoff = (e.clientX - start.x);
            yoff = (e.clientY - start.y);
            setTransform(map_container);
        } else if (current_tool == 'measure' && measuring) {
            var curpos = evGetPercentPosition(e);
            if (curpos.x >= measure_start.x && curpos.y >= measure_start.y) {
                var top = measure_start.y;
                var left = measure_start.x;
                var width = curpos.x - measure_start.x;
                var height = curpos.y - measure_start.y;
                var x1 = 0;
                var y1 = 0;
                var x2 = $('#measure-tool').width();
                var y2 = $('#measure-tool').height();
            } else if (curpos.x < measure_start.x && curpos.y >= measure_start.y) {
                var top = measure_start.y;
                var left = curpos.x;
                var width = measure_start.x - curpos.x;
                var height = curpos.y - measure_start.y;
                var x1 = $('#measure-tool').width();
                var y1 = 0;
                var x2 = 0;
                var y2 = $('#measure-tool').height();
            } else if (curpos.x >= measure_start.x && curpos.y < measure_start.y) {
                var top = curpos.y;
                var left = measure_start.x;
                var width = curpos.x - measure_start.x;
                var height = measure_start.y - curpos.y;
                var x1 = 0;
                var y1 = $('#measure-tool').height();
                var x2 = $('#measure-tool').width();
                var y2 = 0;
            } else {
                var top = curpos.y;
                var left = curpos.x;
                var width = measure_start.x - curpos.x;
                var height = measure_start.y - curpos.y;
                var x1 = 0;
                var y1 = 0;
                var x2 = $('#measure-tool').width();
                var y2 = $('#measure-tool').height();
            }

            $('#measuring-container').css({
                top: top + '%',
                left: left + '%',
                height: (height + 0.1) + '%',
                width: (width + 0.1) + '%'
            });
            document.getElementById('measure-tool').children[0].setAttribute('x1', x1);
            document.getElementById('measure-tool').children[0].setAttribute('y1', y1);
            document.getElementById('measure-tool').children[0].setAttribute('x2', x2);
            document.getElementById('measure-tool').children[0].setAttribute('y2', y2);

            var curpos = evGetPercentPosition(e);
            var dx = (curpos.x - measure_start.x) * (current_map_data.dimensions.scale * current_map_data.dimensions.columns) / 100;
            var dy = (curpos.y - measure_start.y) * (current_map_data.dimensions.scale * current_map_data.dimensions.rows) / 100;
            var dist = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));

            $('#measuring-container span').text(dist + ' ft.');
        } else if (current_tool == 'obscure') {
            updateSelector(e);
        }
    });
    $(map_container).on('wheel', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        // take the scale into account with the offset
        var xs = (e.clientX - xoff) / scale,
            ys = (e.clientY - yoff) / scale,
            delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);

        // get scroll direction & set zoom level
        (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);

        if (scale > scale_max) {
            scale = scale_max + 0;
        }
        if (scale < scale_min) {
            scale = scale_min + 0;
        }

        // reverse the offset amount with the new scale
        xoff = e.clientX - xs * scale;
        yoff = e.clientY - ys * scale;

        setTransform(map_container);
    });
    setTransform(map_container);
    return map_container;
}

function setup_static_elements() {
    return [
        $('<div id="selection-box"></div>')
    ];
}

function draw_obscure(obj) {
    return $('<div class="object obscure"></div>')
        .toggleClass('dm',current_cmp_data.dms.includes(uid))
        .attr('data-oid',obj.id)
        .css({
            top: obj.position.y+'%',
            left: obj.position.x+'%',
            width: obj.data.width+'%',
            height: obj.data.height+'%'
        })
        .on('click', function (event) {
            if (current_tool == 'obscure') {
                post(
                    '/campaign/'+current_cmp_data.id+'/maps/'+current_map_data.id+'/objects/'+$(event.delegateTarget).attr('data-oid')+'/delete/',
                    function(){}
                );
            }
        });
}

function draw_objects() {
    var objects = [];
    var object_keys = Object.keys(current_map_data.objects);
    for (var o = 0; o < object_keys.length; o++) {
        var obj = current_map_data.objects[object_keys[o]];
        switch (obj.type) {
            case 'obscure':
                objects.push(draw_obscure(obj));
        }
    }
    return objects;
}

function draw_map() {
    var player = $('<div id="player"></div>');
    player.append(setup_map_base());
    player.children('#map-container').append(setup_static_elements());
    player.children('#map-container').append(draw_objects());

    player.replaceAll('#player');
    $('#player').attr('data-tool',current_tool);
}

function update_settings() {
    $('#map-name').val(current_map_data.name);
    $('#map-cols').val(current_map_data.dimensions.columns);
    $('#map-rows').val(current_map_data.dimensions.rows);
    $('#map-scale').val(current_map_data.dimensions.scale);
}

function prep_dynamic_event_listeners() {
    Object.keys(cursor_tool_map).map(function (v) {
        $(v).off('mousemove').on('mousemove', function (event) {
            for (var i = 0; i < Object.keys(cursor_tool_map).length; i++) {
                if ($(this).is(Object.keys(cursor_tool_map)[i])) {
                    $(this).css('cursor', cursor_tool_map[Object.keys(cursor_tool_map)[i]][current_tool]);
                }
            }
        });
    });
}

function toolbar_check() {
    $('#toolbar .dm-tool').toggle(current_cmp_data.dms.includes(uid));
}

function overall_update(data) {
    current_map_data = data;
    get('/campaign/' + data.campaign + '/', function (_data) {
        current_cmp_data = _data;
        update_settings()
        draw_map();

        prep_dynamic_event_listeners();
        toolbar_check();
    });
}

function pagelocal_update(data) {
    if (data.updates.campaigns.global || data.updates.campaigns.specific[params.campaign] || data.updates.maps.global || data.updates.maps.specific[params.map]) {
        get(
            '/campaign/' + params.campaign + '/maps/' + params.map + '/',
            overall_update
        );
    }
}

$(document).ready(function () {
    params = parse_query_string();
    if (Object.keys(params).length != 2) {
        bootbox.alert('Error fetching map. Returning to campaign page.', function () {
            window.location = '/campaigns';
        });
    } else {
        get(
            '/campaign/' + params.campaign + '/maps/' + params.map + '/',
            overall_update
        ).fail(function (result) {
            console.log(result);
            bootbox.alert('Error fetching map: ' + result.responseJSON.result + '<br>Returning to campaign page.', function () {
                window.location = '/campaigns';
            });
        });

        $('#map-name').on('change', function (event) {
            post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                path: 'name',
                value: $(this).val()
            });
        });
        $('#map-cols').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.columns',
                    value: Number($(this).val())
                });
            }
        });
        $('#map-rows').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.rows',
                    value: Number($(this).val())
                });
            }
        });
        $('#map-scale').on('change', function (event) {
            if (!isNaN(Number($(this).val()))) {
                post('/campaign/' + params.campaign + '/maps/' + params.map + '/modify/', function () { }, {}, {
                    path: 'dimensions.scale',
                    value: Number($(this).val())
                });
            }
        });

        $('#toolbar button').on('click', function (event) {
            if ($(this).attr('data-tool') == 'home') {
                xoff = 0;
                yoff = 0;
                scale = 1;
                setTransform('#map-container');
                return;
            }
            $('#toolbar button.selected').removeClass('selected');
            current_tool = $(this).attr('data-tool');
            $(this).addClass('selected');
            $('#measuring-container').remove();
            $('#player').attr('data-tool',current_tool);
        });
    }
});