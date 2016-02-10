$(document).ready(function () {
    "use strict";

    new Infinitum({
        container: ".container",
        contentClass: 'row',
        nextPagePath: 'next_page',
        offset: 100,
        debug: true,
        endMessage: "No more items...",
        animation: 'pop-in',
        waitForImages: true
    },{
        name: 'title',
        body: 'text.body',
        url: 'image'
    });
});