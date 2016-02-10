# Infinitum.js

Javascript library for loading things with infinity scroll

## Requirement

Requires jQuery

## Installation

Just download infinitum.js or infinitum.min.js from `dist` dir
and load it in your page.

## Usage

#### Create container

First, create an element that will hold all the items (container)

Like this:

    <div class="container" data-load="server.php"></div>

Container element **must** have a data-load attribute
with a primary source url for items to load from.

(attribute name can be configured in options)

#### Create a template

Then create a template for your items:

    <template id="my-template">
        <h1>I'm {{ name }}<h1>
        <p>{{ greeting }}</p>
    </template>

 - Every item loaded from server will use this template.
 - `<template>` tags are recommended, because they're not
   visible in the document by default.
 - Template **must** have an `id` attribute that you will provide
   as an option when initializing Infinitum. Of course you can use
   a class too, but it's not recommended.
 - You can use "mustache" like syntax for variables
   that will be replaced with the real data.

#### Initialize Infinitum

And then just new-up the class, pass the map object
and some options if needed and You're done.

Wait... A *map object* you say?

Map object is used to map JSON data comming from server
to a variable names defined in your template.

Imagine you have this JSON comming from server:

    {
        'title': 'John',
        'text': {
            'body': 'Hello there'
        }
    }

And we have variables `name` and `greeting` in our template:

    ...
        <h1>I'm {{ name }}<h1>
        <p>{{ greeting }}</p>
    ...

Our goal is to see `title` in place of `name` variable and
`text.body` as the `greeting`. So we define a map for Infinitum
to know that:

    {
        'name': 'title',
        'greeting': 'text.body'
    }

> Object keys are the names of variables in your template and
> values are the "paths" to values in your JSON object.

So now we're ready to initialize Infinitum:

    // Initialize Infinitum
    new Infinitum({
        'name': 'title',
        'greeting': 'text.body'
    }, {
        container: ".container",
        template: "#my-template"
    });

> **Note:** options are not required, but check
> the defaults because it might not be suitable for you

## Available options

 - `debug`: (default: false)

   Debug mode. Displays various error messages at the
   end of container (in the message element).

   When disabled, `endMessage` will be shown on errors.

 - `template`: (default: '#item-template')

   Template element selector.

 - `container`: (default: 'body')

   Container element selector

 - `contentClass`: (default: '')

   Because all items are wrapped in a separate container
   (content container) within the main container you might
   want to add a class to it.

 - `spinnerClass`: (default: 'loader')

   Class to apply to a spinner element.

 - `messageClass`: (default: 'message')

   Class to apply to a message element.

 - `sourceAttr`: (default: 'data-load')

   Attribute to use for parsing a primary source url.

 - `dataPath`: (default: 'data')

   Same way you map your variables with values from JSON
   you also need to map the path of where your data is stored.

   This key in your JSON must hold an **array** of items.

 - `nextPagePath`: (default: 'next_page')

   Path in your JSON to search for an url of the next page.

 - `totalPagesPath`: (default: 'total_pages')

   Path in your JSON to search for a total count of pages.

 - `offset`: (default: 0)

   Scroll offset to use when detecting when to load next page.

 - `endMessage`: (default: 'No more items to load...')

   The message to be shown when all the items have been loaded.

 - `animation`: (default: null)

   Animation class to use when items arrive.

   See [Animation](#Animation) for more details.

 - `waitForImages`: (default: false)

   Enable or disable waiting for images to load
   before animation begins

   See [Animation](#Animation) for more details.

## Animation

Infinitum supports css driven animations by using classes.

All you need to do is define two classes in your css style:
 - The main class of final state of the item. (i.e. `fade`).

   This class will remain applied to the item element.
 - The entrance class with `-enter` appended to the main class name (i.e. `fade-enter`).

   This class is added to the item element only for a single frame and then removed.

   If you enabled `waitForImages` option the entrance class will remain applied
   to the item element until the image is loaded.

A simple example of fade animation:

    .fade {
        opacity: 1;
        transition: opacity 0.3s;
    }

    .fade-enter {
        opacity: 0;
    }

Now just set `animation` option to `fade` and you're done!