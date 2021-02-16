function pagelocal_update(data) {
    if (data.updates.characters.global) {
        load_char_directory();
    }
}

function load_char_directory() {
    get('/character/expanded/', function (data) {
        console.log(data);

        var dummy_directory = $('<div></div>');
        var ckeys = Object.keys(data);
        for (var c = 0; c < ckeys.length; c++) {
            var dat = data[ckeys[c]];
            var char_item = make_character_card(dat, ckeys[c]);

            dummy_directory.append(char_item);
        }
        $('#char-directory').html(dummy_directory);
    }, {}, {}, true);
}

$(document).ready(function () {
    load_char_directory();
    $('#add-char').on('click', function () {
        bootbox.prompt('Enter sheet URL.', function (result) {
            if (result) {
                if (result.includes('docs.google.com/spreadsheets')) {
                    post('/character/new/', console.log, {}, {
                        ctype: 'gsheet2.1',
                        url: result
                    }, true);
                } else {
                    bootbox.alert('Invalid URL.');
                }
            }
        })
    });
});