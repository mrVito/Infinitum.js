$(document).ready(function () {
    "use strict";

    new Infinitum({
        container: ".container",
        contentClass: 'row',
        nextPagePath: 'next_page',
        offset: 100,
        debug: true
    },{
        name: 'test',
        url: 'image'
    });
});