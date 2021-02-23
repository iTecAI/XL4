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

function setup_map_base() {
    var map_container = $('<div id="map-container"></div>');
    map_container.append($('<img>').attr('src', format_loaded_url(current_map_data.map_img)));

    $(map_container).on('mousedown', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        start = { x: e.clientX - xoff, y: e.clientY - yoff };
        panning = true;
    });
    $(map_container).on('mouseup', function (e) {
        panning = false;
    });
    $(map_container).on('mousemove', function (e) {
        e.preventDefault();
        e = e.originalEvent;
        if (!panning) {
            return;
        }
        xoff = (e.clientX - start.x);
        yoff = (e.clientY - start.y);
        setTransform(map_container);
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
    return map_container;
}

function draw_map() {
    var player = $('<div id="player"></div>');
    player.append(setup_map_base());

    player.replaceAll('#player');
}

function overall_update(data) {
    current_map_data = data;
    get('/campaign/' + data.campaign + '/', function (_data) { current_cmp_data = _data; });
    draw_map();
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
    get(
        '/campaign/' + params.campaign + '/maps/' + params.map + '/',
        overall_update
    );
});