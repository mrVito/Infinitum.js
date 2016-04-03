var Infinitum = (function () {
    "use strict";

    function Infinitum(map, options)
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

        // Preparing container & template
        this.template = this.getTemplateContent();
        this.container = this.getContainer();
        this.placeholderNames = this.getPlaceholderNames();

        this.bindEvents();

        this.init();
    }

    /**
     * Init infinitum
     */
    Infinitum.prototype.init = function () {
        this.content = this.insertContent();
        this.spinner = this.insertSpinner();
        this.message = this.insertMessage();
        this.scrollHelper = this.insertScrollHelper();
        this.nextPage = this.parseSource();
        this.totalPages = 0;
        this.page = 0;
        this.loading = false;
        this.canLoad = true;
        this.toReload = false;

        this.check();
    };

    /**
     * Bind event listeners
     */
    Infinitum.prototype.bindEvents = function () {
        $(window).on('scroll', this.check.bind(this));

        this.container.on('infinitum:scrolled-in', this.onScrolledIn.bind(this));
        this.container.on('infinitum:reload', this.onReload.bind(this));
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

        if (this.toReload) {
            this.container.trigger('infinitum:reload');
        }
    };

    /**
     * Event handler
     * When is necessary to reload items
     */
    Infinitum.prototype.onReload = function () {
        if (!this.loading) {
            this.container.empty();
            this.init();
        } else {
            this.toReload = true;
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
//# sourceMappingURL=data:application/json;base64,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Q0FBaUIsSUFBakIsRUFBT0osQ0FBUCxFQUF5QkcsQ0FBekIsQ0FBaUNDLENBQWpDLENBQUEsQ0FDSUosQ0FBQSxDQUFTQSxDQUFBLENBQU9DLENBQUEsQ0FBS0UsQ0FBQSxFQUFMLENBQVAsQ0FHYixPQUFRQSxFQUFELEVBQVVBLENBQVYsRUFBbUJDLENBQW5CLENBQTZCSixDQUE3QixDQUFzQ0ssSUFBQUEsRUFWUSxDQWF6RCxPQUFPdEosRUEzZGtCLENBQWI7IiwNCiJzb3VyY2VzIjpbInNvdXJjZWNvZGVfaW5maW5pdHVtLmpzIl0sDQoibmFtZXMiOlsiSW5maW5pdHVtIiwibWFwIiwib3B0aW9ucyIsImRlZmF1bHRzIiwiZGVidWciLCJ0ZW1wbGF0ZSIsImNvbnRhaW5lciIsImNvbnRlbnRDbGFzcyIsInNwaW5uZXJDbGFzcyIsIm1lc3NhZ2VDbGFzcyIsInNvdXJjZUF0dHIiLCJkYXRhUGF0aCIsIm5leHRQYWdlUGF0aCIsInRvdGFsUGFnZXNQYXRoIiwib2Zmc2V0IiwiZW5kTWVzc2FnZSIsImFuaW1hdGlvbiIsIndhaXRGb3JJbWFnZXMiLCIkIiwiZXh0ZW5kIiwiZ2V0VGVtcGxhdGVDb250ZW50IiwiZ2V0Q29udGFpbmVyIiwicGxhY2Vob2xkZXJOYW1lcyIsImdldFBsYWNlaG9sZGVyTmFtZXMiLCJiaW5kRXZlbnRzIiwiaW5pdCIsInByb3RvdHlwZSIsIkluZmluaXR1bS5wcm90b3R5cGUuaW5pdCIsImNvbnRlbnQiLCJpbnNlcnRDb250ZW50Iiwic3Bpbm5lciIsImluc2VydFNwaW5uZXIiLCJtZXNzYWdlIiwiaW5zZXJ0TWVzc2FnZSIsInNjcm9sbEhlbHBlciIsImluc2VydFNjcm9sbEhlbHBlciIsIm5leHRQYWdlIiwicGFyc2VTb3VyY2UiLCJwYWdlIiwidG90YWxQYWdlcyIsImxvYWRpbmciLCJjYW5Mb2FkIiwidG9SZWxvYWQiLCJjaGVjayIsIkluZmluaXR1bS5wcm90b3R5cGUuYmluZEV2ZW50cyIsIndpbmRvdyIsIm9uIiwiYmluZCIsIm9uU2Nyb2xsZWRJbiIsIm9uUmVsb2FkIiwib25Mb2FkZWQiLCJvbkVuZCIsIkluZmluaXR1bS5wcm90b3R5cGUuZ2V0Q29udGFpbmVyIiwiSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZVNvdXJjZSIsImF0dHIiLCJJbmZpbml0dW0ucHJvdG90eXBlLmluc2VydENvbnRlbnQiLCJhZGRDbGFzcyIsImFwcGVuZCIsIkluZmluaXR1bS5wcm90b3R5cGUuaW5zZXJ0U2Nyb2xsSGVscGVyIiwiSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRTcGlubmVyIiwiaGlkZSIsIkluZmluaXR1bS5wcm90b3R5cGUuaW5zZXJ0TWVzc2FnZSIsIkluZmluaXR1bS5wcm90b3R5cGUuY2hlY2siLCJpblZpZXciLCJpc0luVmlldyIsInRyaWdnZXIiLCJJbmZpbml0dW0ucHJvdG90eXBlLmlzSW5WaWV3IiwiZWxlbWVudCIsImVsZW1lbnRQb3NpdGlvbiIsInRvcCIsIndpbmRvd0hlaWdodCIsImhlaWdodCIsInNjcm9sbFRvcCIsImxvYWQiLCJJbmZpbml0dW0ucHJvdG90eXBlLmxvYWQiLCJhamF4IiwidXJsIiwiZGF0YVR5cGUiLCJzdWNjZXNzIiwiZGF0YSIsInJlbmRlclJlc3BvbnNlIiwicGFyc2VOZXh0UGFnZSIsInBhcnNlVG90YWxQYWdlcyIsImVycm9yIiwic2hvd01lc3NhZ2UiLCJzdGF0dXMiLCJzdGF0dXNUZXh0IiwiSW5maW5pdHVtLnByb3RvdHlwZS5yZW5kZXJSZXNwb25zZSIsInJlc3Buc2UiLCJwYXJzZWQiLCJwYXJzZVJlc3BvbnNlIiwiQXJyYXkiLCJpc0FycmF5IiwicmVuZGVyIiwiZXgiLCJJbmZpbml0dW0ucHJvdG90eXBlLnBhcnNlUmVzcG9uc2UiLCJyZXNwb25zZSIsImdldFByb3BlcnR5IiwicGFyc2VEYXRhIiwiSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZURhdGEiLCJfdGhpcyIsImZvckVhY2giLCJuYW1lIiwia2V5IiwiSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZU5leHRQYWdlIiwiSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZVRvdGFsUGFnZXMiLCJJbmZpbml0dW0ucHJvdG90eXBlLm9uU2Nyb2xsZWRJbiIsInNob3ciLCJJbmZpbml0dW0ucHJvdG90eXBlLm9uTG9hZGVkIiwiSW5maW5pdHVtLnByb3RvdHlwZS5vblJlbG9hZCIsImVtcHR5IiwiSW5maW5pdHVtLnByb3RvdHlwZS5vbkVuZCIsIkluZmluaXR1bS5wcm90b3R5cGUucmVuZGVyIiwiaXRlbSIsImUiLCJyZW5kZXJUZW1wbGF0ZSIsImFwcGVuZEl0ZW0iLCJhbmltYXRlIiwiSW5maW5pdHVtLnByb3RvdHlwZS5hbmltYXRlIiwiZW50ZXJDbGFzcyIsImZpbmQiLCJvbmUiLCJyZW1vdmVDbGFzcyIsInNldFRpbWVvdXQiLCJJbmZpbml0dW0ucHJvdG90eXBlLmFwcGVuZEl0ZW0iLCJhcHBlbmRUbyIsIkluZmluaXR1bS5wcm90b3R5cGUuZ2V0VGVtcGxhdGVDb250ZW50IiwiJHRlbXBsYXRlIiwiaHRtbCIsInJlbW92ZSIsIkluZmluaXR1bS5wcm90b3R5cGUucmVuZGVyVGVtcGxhdGUiLCJyZW5kZXJlZCIsInBsYWNlaG9sZGVyIiwicmVwbGFjZSIsInBhdHRlcm4iLCJSZWdFeHAiLCJJbmZpbml0dW0ucHJvdG90eXBlLmdldFBsYWNlaG9sZGVyTmFtZXMiLCJuYW1lcyIsInJlZ2V4IiwibWF0Y2giLCJleGVjIiwicHVzaCIsIkluZmluaXR1bS5wcm90b3R5cGUuc2hvd01lc3NhZ2UiLCJ0ZXh0IiwiSW5maW5pdHVtLnByb3RvdHlwZS5nZXRQcm9wZXJ0eSIsIm9iamVjdCIsInBhdGgiLCJzcGxpdCIsImluZGV4IiwibGVuZ3RoIiwidW5kZWZpbmVkIl0NCn0=
