function processCompendiumListing(data) {
    console.log(data);
    if (data.length == 0) {
        $('#no-content-image').show();
        $('#compendium-area').html('');
        return;
    }
    $('#no-content-image').hide();
    dummy_area = $('<div></div>');

    for (var i=0;i<data.length;i++) {
        var item = data[i].data;
        var endpoint = data[i].endpoint;
        if ($(dummy_area).children('#compendium-category-'+endpoint).length == 0) {
            $(dummy_area).append(
                $('<div></div>')
                .attr('id','compendium-category-'+endpoint)
                .addClass('compendium-category')
                .append(
                    $('<div class="title noselect"></div>').append(
                        $('<span></span>').text(firstUpper(cond(endpoint=='magicitems','Magic Items',endpoint)))
                    )
                )
                .append('<div class="items"></div>')
            );
        }
        if (endpoint == 'monsters') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_creature(item));
        } else if (endpoint == 'spells') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_spell(item));
        } else if (endpoint == 'magicitems') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_magicitem(item));
        } else if (endpoint == 'armor') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_armor(item));
        } else if (endpoint == 'weapons') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_weapon(item));
        } else if (endpoint == 'equipment') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_equipment(item));
        } else if (endpoint == 'sections') {
            $(dummy_area).children('#compendium-category-'+endpoint).children('.items').append(generate_section(item));
        }
    }

    $('#compendium-area').html(dummy_area);
}

$(document).ready(function(){
    //post('/compendium/categories/',processCompendiumListing,{search:'e'},{cats:['spells']});
    $('.content-type').on('click',function(event){
        $('.content-type[data-type='+$(this).attr('data-type')+']').toggleClass('type-selected');
        var selected = $.map($('.content-type.type-selected').toArray(),function(e,i){
            return $(e).attr('data-type');
        });
        if ($('#compendium-search').val().length > 0 && selected.length > 0) {
            post('/compendium/categories/',processCompendiumListing,{search:$('#compendium-search').val()},{cats:selected});
        } else {
            $('#no-content-image').show();
            $('#compendium-area').html('');
        }
    });
    $('#compendium-search').on('change',function(event){
        var selected = $.map($('.content-type.type-selected').toArray(),function(e,i){
            return $(e).attr('data-type');
        });
        if ($('#compendium-search').val().length > 0 && selected.length > 0) {
            post('/compendium/categories/',processCompendiumListing,{search:$('#compendium-search').val()},{cats:selected});
        } else {
            $('#no-content-image').show();
            $('#compendium-area').html('');
        }
    });
});