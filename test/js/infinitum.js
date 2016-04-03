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
        this.template = this.getTemplateContent();
        this.container = this.getContainer();
        this.placeholderNames = this.getPlaceholderNames();

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

        this.unbindEvents();
        this.bindEvents();

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
     * Unbind event listeners
     */
    Infinitum.prototype.unbindEvents = function () {
        $(window).off('scroll', this.check);

        this.container.off('infinitum:scrolled-in', this.onScrolledIn);
        this.container.off('infinitum:reload', this.onReload);
        this.container.off('infinitum:loaded', this.onLoaded);
        this.container.off('infinitum:end', this.onEnd);
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
     * When is necessary to reload items
     */
    Infinitum.prototype.onReload = function () {
        this.container.empty();
        this.init();
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
//# sourceMappingURL=data:application/json;base64,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UUFBQWlDLEtBQUEsRUFDQSxLQUFBdEIsUUFBQSxDQUFlLENBQUEsQ0Faa0MsQ0FzQnJEeEMsRUFBQXlCLFVBQUEwRSxZQUFBO0FBQWtDK0MsUUFBUyxDQUFDQyxDQUFELENBQVMxQyxDQUFULENBQWMsQ0FNckQsSUFMQSxJQUFJMkMsRUFBTzNDLENBQUE0QyxNQUFBLENBQVUsR0FBVixDQUFYLENBRUlDLEVBQVEsQ0FGWixDQUdJQyxFQUFTSCxDQUFBRyxPQUViLENBQWlCLElBQWpCLEVBQU9KLENBQVAsRUFBeUJHLENBQXpCLENBQWlDQyxDQUFqQyxDQUFBLENBQ0lKLENBQUEsQ0FBU0EsQ0FBQSxDQUFPQyxDQUFBLENBQUtFLENBQUEsRUFBTCxDQUFQLENBR2IsT0FBUUEsRUFBRCxFQUFVQSxDQUFWLEVBQW1CQyxDQUFuQixDQUE2QkosQ0FBN0IsQ0FBc0NLLElBQUFBLEVBVlEsQ0FhekQsT0FBT3hKLEVBN2RrQixDQUFiOyIsDQoic291cmNlcyI6WyJzb3VyY2Vjb2RlX2luZmluaXR1bS5qcyJdLA0KIm5hbWVzIjpbIkluZmluaXR1bSIsIm1hcCIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlYnVnIiwidGVtcGxhdGUiLCJjb250YWluZXIiLCJjb250ZW50Q2xhc3MiLCJzcGlubmVyQ2xhc3MiLCJtZXNzYWdlQ2xhc3MiLCJzb3VyY2VBdHRyIiwiZGF0YVBhdGgiLCJuZXh0UGFnZVBhdGgiLCJ0b3RhbFBhZ2VzUGF0aCIsIm9mZnNldCIsImVuZE1lc3NhZ2UiLCJhbmltYXRpb24iLCJ3YWl0Rm9ySW1hZ2VzIiwiJCIsImV4dGVuZCIsImdldFRlbXBsYXRlQ29udGVudCIsImdldENvbnRhaW5lciIsInBsYWNlaG9sZGVyTmFtZXMiLCJnZXRQbGFjZWhvbGRlck5hbWVzIiwiaW5pdCIsInByb3RvdHlwZSIsIkluZmluaXR1bS5wcm90b3R5cGUuaW5pdCIsImNvbnRlbnQiLCJpbnNlcnRDb250ZW50Iiwic3Bpbm5lciIsImluc2VydFNwaW5uZXIiLCJtZXNzYWdlIiwiaW5zZXJ0TWVzc2FnZSIsInNjcm9sbEhlbHBlciIsImluc2VydFNjcm9sbEhlbHBlciIsIm5leHRQYWdlIiwicGFyc2VTb3VyY2UiLCJwYWdlIiwidG90YWxQYWdlcyIsImxvYWRpbmciLCJjYW5Mb2FkIiwidW5iaW5kRXZlbnRzIiwiYmluZEV2ZW50cyIsImNoZWNrIiwiSW5maW5pdHVtLnByb3RvdHlwZS5iaW5kRXZlbnRzIiwid2luZG93Iiwib24iLCJiaW5kIiwib25TY3JvbGxlZEluIiwib25SZWxvYWQiLCJvbkxvYWRlZCIsIm9uRW5kIiwiSW5maW5pdHVtLnByb3RvdHlwZS51bmJpbmRFdmVudHMiLCJvZmYiLCJJbmZpbml0dW0ucHJvdG90eXBlLmdldENvbnRhaW5lciIsIkluZmluaXR1bS5wcm90b3R5cGUucGFyc2VTb3VyY2UiLCJhdHRyIiwiSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRDb250ZW50IiwiYWRkQ2xhc3MiLCJhcHBlbmQiLCJJbmZpbml0dW0ucHJvdG90eXBlLmluc2VydFNjcm9sbEhlbHBlciIsIkluZmluaXR1bS5wcm90b3R5cGUuaW5zZXJ0U3Bpbm5lciIsImhpZGUiLCJJbmZpbml0dW0ucHJvdG90eXBlLmluc2VydE1lc3NhZ2UiLCJJbmZpbml0dW0ucHJvdG90eXBlLmNoZWNrIiwiaW5WaWV3IiwiaXNJblZpZXciLCJ0cmlnZ2VyIiwiSW5maW5pdHVtLnByb3RvdHlwZS5pc0luVmlldyIsImVsZW1lbnQiLCJlbGVtZW50UG9zaXRpb24iLCJ0b3AiLCJ3aW5kb3dIZWlnaHQiLCJoZWlnaHQiLCJzY3JvbGxUb3AiLCJsb2FkIiwiSW5maW5pdHVtLnByb3RvdHlwZS5sb2FkIiwiYWpheCIsInVybCIsImRhdGFUeXBlIiwic3VjY2VzcyIsImRhdGEiLCJyZW5kZXJSZXNwb25zZSIsInBhcnNlTmV4dFBhZ2UiLCJwYXJzZVRvdGFsUGFnZXMiLCJlcnJvciIsInNob3dNZXNzYWdlIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsIkluZmluaXR1bS5wcm90b3R5cGUucmVuZGVyUmVzcG9uc2UiLCJyZXNwbnNlIiwicGFyc2VkIiwicGFyc2VSZXNwb25zZSIsIkFycmF5IiwiaXNBcnJheSIsInJlbmRlciIsImV4IiwiSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZVJlc3BvbnNlIiwicmVzcG9uc2UiLCJnZXRQcm9wZXJ0eSIsInBhcnNlRGF0YSIsIkluZmluaXR1bS5wcm90b3R5cGUucGFyc2VEYXRhIiwiX3RoaXMiLCJmb3JFYWNoIiwibmFtZSIsImtleSIsIkluZmluaXR1bS5wcm90b3R5cGUucGFyc2VOZXh0UGFnZSIsIkluZmluaXR1bS5wcm90b3R5cGUucGFyc2VUb3RhbFBhZ2VzIiwiSW5maW5pdHVtLnByb3RvdHlwZS5vblNjcm9sbGVkSW4iLCJzaG93IiwiSW5maW5pdHVtLnByb3RvdHlwZS5vbkxvYWRlZCIsIkluZmluaXR1bS5wcm90b3R5cGUub25SZWxvYWQiLCJlbXB0eSIsIkluZmluaXR1bS5wcm90b3R5cGUub25FbmQiLCJJbmZpbml0dW0ucHJvdG90eXBlLnJlbmRlciIsIml0ZW0iLCJlIiwicmVuZGVyVGVtcGxhdGUiLCJhcHBlbmRJdGVtIiwiYW5pbWF0ZSIsIkluZmluaXR1bS5wcm90b3R5cGUuYW5pbWF0ZSIsImVudGVyQ2xhc3MiLCJmaW5kIiwib25lIiwicmVtb3ZlQ2xhc3MiLCJzZXRUaW1lb3V0IiwiSW5maW5pdHVtLnByb3RvdHlwZS5hcHBlbmRJdGVtIiwiYXBwZW5kVG8iLCJJbmZpbml0dW0ucHJvdG90eXBlLmdldFRlbXBsYXRlQ29udGVudCIsIiR0ZW1wbGF0ZSIsImh0bWwiLCJyZW1vdmUiLCJJbmZpbml0dW0ucHJvdG90eXBlLnJlbmRlclRlbXBsYXRlIiwicmVuZGVyZWQiLCJwbGFjZWhvbGRlciIsInJlcGxhY2UiLCJwYXR0ZXJuIiwiUmVnRXhwIiwiSW5maW5pdHVtLnByb3RvdHlwZS5nZXRQbGFjZWhvbGRlck5hbWVzIiwibmFtZXMiLCJyZWdleCIsIm1hdGNoIiwiZXhlYyIsInB1c2giLCJJbmZpbml0dW0ucHJvdG90eXBlLnNob3dNZXNzYWdlIiwidGV4dCIsIkluZmluaXR1bS5wcm90b3R5cGUuZ2V0UHJvcGVydHkiLCJvYmplY3QiLCJwYXRoIiwic3BsaXQiLCJpbmRleCIsImxlbmd0aCIsInVuZGVmaW5lZCJdDQp9=
