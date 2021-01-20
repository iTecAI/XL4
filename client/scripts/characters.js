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
            var char_item = $('<div class="character-box card"></div>');
            char_item.attr({ id: 'cbox-' + ckeys[c], 'data-id': ckeys[c] });
            if (dat.appearance.image) {
                $(char_item).append($('<span class="card-image"></span>').append($('<img>').attr('src', dat.appearance.image)));
            } else {
                $(char_item).append($('<span class="card-image"></span>').append($('<img>').attr('src', 'assets/logo_large.png')));
            }
            $(char_item)
                .append(
                    $('<div class="card-content"></div>')
                        .append(
                            $('<div class="title"></div>').text(dat.name)
                        )
                        .append(
                            $('<div class="content"></div>').text('Level ' + dat.level.level + ' ' + dat.race + ' (' + dat.level.classes.map(function (t, i, a) {
                                return titleCase(t.class) + ' ' + t.level;
                            }).join('/') + ')')
                        )
                )
                .append(
                    $('<div class="buttons"></div>')
                        .append(
                            $('<button class="character-edit"><i class="material-icons">create</i> <span>Edit</span></button>')
                        )
                        .append(
                            $('<button class="character-copy"><i class="material-icons">content_copy</i> <span>Copy</span></button>')
                            .on('click',function(event) {
                                post('/character/'+$(this).parents('.character-box').attr('data-id')+'/duplicate/',console.log,{},{},true);
                            })
                        )
                        .append(
                            $('<button class="character-delete"><i class="material-icons">delete</i> <span>Delete</span></button>')
                            .on('click',function(event) {
                                post('/character/'+$(this).parents('.character-box').attr('data-id')+'/delete/',console.log,{},{},true);
                            })
                        )
                );

            dummy_directory.append(char_item);
        }
        $('#char-directory').html(dummy_directory);
    }, {}, {}, true);
}

$(document).ready(function () {
    load_char_directory();
    $('#add-char').on('click',function(){
        bootbox.prompt('Enter sheet URL.',function(result){
            if (result) {
                if (result.includes('docs.google.com/spreadsheets')) {
                    post('/character/new/',console.log,{},{
                        ctype:'gsheet2.1',
                        url:result
                    },true);
                } else {
                    bootbox.alert('Invalid URL.');
                }
            }
        })
    });
});