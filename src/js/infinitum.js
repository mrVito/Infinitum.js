var Infinitum = (function () {
    "use strict";

    function Infinitum(options, map)
    {
        this.defaults = {
            debug: false,
            template: '#item-template',
            container: 'body',
            contentClass: '',
            spinnerClass: 'loader',
            messageClass: 'message',
            sourceAttr: 'data-load',
            dataPath: 'data',
            nextPagePath: 'next_page',
            totalPagesPath: 'total_pages',
            offset: 0,
            endMessage: 'No more items to load...',
            animation: null,
            waitForImages: false
        };

        this.options = $.extend({}, this.defaults, options);
        this.map = map;
        this.template = this.getTemplateContent();
        this.container = this.getContainer();
        this.placeholderNames = this.getPlaceholderNames();
        this.content = this.insertContent();
        this.spinner = this.insertSpinner();
        this.message = this.insertMessage();
        this.scrollHelper = this.insertScrollHelper();
        this.nextPage = this.parseSource();
        this.totalPages = 0;
        this.page = 0;
        this.loading = false;
        this.canLoad = true;

        this.bindEvents();

        this.check();
    }

    /**
     * Bind event listeners
     */
    Infinitum.prototype.bindEvents = function () {
        $(window).on('scroll', this.check.bind(this));

        this.container.on('infinitum:scrolled-in', this.onScrolledIn.bind(this));
        this.container.on('infinitum:loaded', this.onLoaded.bind(this));
        this.container.on('infinitum:end', this.onEnd.bind(this));
    };

    /**
     * Get container element instance
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.getContainer = function () {
        return $(this.options.container);
    };

    /**
     * Parse data source from attribute
     *
     * @returns {string}
     */
    Infinitum.prototype.parseSource = function () {
        return this.container.attr(this.options.sourceAttr);
    };

    /**
     * Insert content container into main container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertContent = function () {
        var content = $('<div>');
        content.addClass(this.options.contentClass);

        this.container.append(content);

        return content;
    };

    /**
     * Insert scroll-helper element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertScrollHelper = function () {
        var scrollHelper = $('<div>');

        this.container.append(scrollHelper);

        return scrollHelper;
    };

    /**
     * Insert a spinner element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertSpinner = function () {
        var spinner = $('<div>');
        spinner.addClass(this.options.spinnerClass);
        spinner.hide();

        this.container.append(spinner);

        return spinner;
    };

    /**
     * Insert message element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertMessage = function () {
        var message = $('<div>');
        message.addClass(this.options.messageClass);
        message.hide();

        this.container.append(message);

        return message;
    };

    /**
     * Check if scroll helper is in view
     * and we need to load next page
     */
    Infinitum.prototype.check = function () {
        if( ! this.canLoad) {
            return;
        }

        var inView = this.isInView(this.scrollHelper);

        if( ! this.loading && inView) {
            this.container.trigger('infinitum:scrolled-in');
        }
    };

    /**
     * Check if element is in view
     *
     * @param {jQuery} element
     * @returns {boolean}
     */
    Infinitum.prototype.isInView = function (element) {
        var elementPosition = element.offset().top;
        var windowHeight = $(window).height();
        var scrollTop = $(window).scrollTop();

        return elementPosition - scrollTop > 0 && elementPosition - scrollTop < windowHeight - this.options.offset;
    };

    /**
     * Load items from server
     */
    Infinitum.prototype.load = function () {
        this.loading = true;

        if( ! this.nextPage || this.nextPage === void 0) {
            this.container.trigger('infinitum:end');
        }

        $.ajax({
            url: this.nextPage,
            dataType: 'json',
            success: function (data) {
                this.renderResponse(data);
                this.parseNextPage(data);
                this.parseTotalPages(data);
                this.container.trigger('infinitum:loaded');
            }.bind(this),
            error: function (data) {
                this.showMessage('Error: (' + data.status + ") " + data.statusText);
            }.bind(this)
        });
    };

    /**
     * Render a response from server
     *
     * @param respnse
     */
    Infinitum.prototype.renderResponse = function (respnse) {
        var parsed = this.parseResponse(respnse);

        if(parsed === void 0) {
            this.showMessage('Response cannot be parsed');

            return;
        }

        if( ! Array.isArray(parsed)) {
            this.showMessage('Response data must be an array');

            return;
        }

        try {
            this.render(parsed);
        } catch(ex) {
            this.showMessage(ex);
        }
    };

    /**
     * Parse a response from server and prepare for rendering
     *
     * @param response
     */
    Infinitum.prototype.parseResponse = function (response) {
        return this.getProperty(response, this.options.dataPath);
    };

    /**
     * Parse data item for the template
     *
     * @param data
     * @returns {object}
     */
    Infinitum.prototype.parseData = function (data) {
        var _this = this;
        var parsed = {};

        this.placeholderNames.forEach(function (name) {
            var key = _this.map[name];

            if(key === void 0) {
                throw 'Map is missing a property that is defined in the template';
            }

            parsed[name] = _this.getProperty(data, key);
        });

        return parsed;
    };

    /**
     * Parse next page url from server response
     *
     * @param {object} response
     */
    Infinitum.prototype.parseNextPage = function (response) {
        this.nextPage = this.getProperty(response, this.options.nextPagePath);
    };

    /**
     * Parse total page count from server response
     *
     * @param {object} response
     */
    Infinitum.prototype.parseTotalPages = function (response) {
        if(this.totalPages !== 0) {
            return;
        }

        this.totalPages = this.getProperty(response, this.options.totalPagesPath);
    };

    /**
     * Event handler
     * When scroll helper is scrolled into view
     */
    Infinitum.prototype.onScrolledIn = function () {
        this.load();
        this.spinner.show();
    };

    /**
     * Event handler
     * When items are loaded
     */
    Infinitum.prototype.onLoaded = function () {
        this.spinner.hide();

        this.loading = false;
        this.page++;

        if(this.page >= this.totalPages) {
            this.container.trigger('infinitum:end');
        }
    };

    /**
     * Event handler
     * When there is no more items to load
     */
    Infinitum.prototype.onEnd = function () {
        this.showMessage(this.options.endMessage);
    };

    /**
     * Render parsed response
     *
     * @param response
     */
    Infinitum.prototype.render = function (response) {
        var _this = this;

        response.forEach(function (item) {
            try {
                var data = _this.parseData(item);
            } catch(e) {
                throw 'Cannot render template: ' + e;
            }

            var template = _this.renderTemplate(data);
            var element = _this.appendItem(template);

            _this.animate(element);
        });
    };

    /**
     * Animate the element with the transition specified in options
     *
     * @param {JQuery} element
     */
    Infinitum.prototype.animate = function (element) {
        if( ! this.options.animation) {
            return;
        }

        var enterClass = this.options.animation + '-enter';

        element.addClass(this.options.animation);
        element.addClass(enterClass);

        if(this.options.waitForImages) {
            element.find('img').one('load', function () {
                element.removeClass(enterClass);
            });

            return;
        }

        setTimeout(function () {
            element.removeClass(enterClass);
        }, 0);
    };

    /**
     * Append an item to the content container
     *
     * @param item
     */
    Infinitum.prototype.appendItem = function (item) {
        return $(item).appendTo(this.content);
    };

    /**
     * Get plain html content of the template
     * Remove template element from the DOM
     *
     * @returns {string|JQuery}
     */
    Infinitum.prototype.getTemplateContent = function () {
        var $template = $(this.options.template);

        var template = $template.html();

        $template.remove();

        return template;
    };

    /**
     * Render a template with a data provided
     *
     * @param {object} data Data to insert in a template
     * @returns {string}
     */
    Infinitum.prototype.renderTemplate = function (data) {
        var rendered = this.template;

        this.placeholderNames.forEach(function (placeholder) {
            var pattern = new RegExp("{{ *" + placeholder + " *}}", "g");
            rendered = rendered.replace(pattern, data[placeholder])
        });

        return rendered;
    };

    /**
     * Get placeholder names from the template
     *
     * @returns {Array}
     */
    Infinitum.prototype.getPlaceholderNames = function () {
        var names = [];
        var regex = /{{ *([a-zA-Z0-9_]+) *}}/g;

        var match = regex.exec(this.template);
        while (match != null) {
            names.push(match[1]);
            match = regex.exec(this.template);
        }

        return names;
    };

    /**
     * Show a message in the message element
     *
     * @param message
     */
    Infinitum.prototype.showMessage = function (message) {
        if (this.options.debug) {
            this.message.text(message);
        } else {
            this.message.text(this.options.endMessage);
        }

        if(this.message.text()) {
            this.message.show();
        }

        this.spinner.hide();
        this.canLoad = false;
    };

    /**
     * Get property from object using dot notation
     *
     * @param {object} object Object to query
     * @param {string} key Key path (i.e. "item.data.name")
     * @returns {string|number|object|Array}
     */
    Infinitum.prototype.getProperty = function (object, key) {
        var path = key.split('.');

        var index = 0,
            length = path.length;

        while (object != null && index < length) {
            object = object[path[index++]];
        }

        return (index && index == length) ? object : undefined;
    };

    return Infinitum;
})();