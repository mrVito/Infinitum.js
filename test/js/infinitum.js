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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZmluaXR1bS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJpbmZpbml0dW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgSW5maW5pdHVtID0gKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGZ1bmN0aW9uIEluZmluaXR1bShtYXAsIG9wdGlvbnMpXG4gICAge1xuICAgICAgICB0aGlzLmRlZmF1bHRzID0ge1xuICAgICAgICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgICAgICAgdGVtcGxhdGU6ICcjaXRlbS10ZW1wbGF0ZScsXG4gICAgICAgICAgICBjb250YWluZXI6ICdib2R5JyxcbiAgICAgICAgICAgIGNvbnRlbnRDbGFzczogJycsXG4gICAgICAgICAgICBzcGlubmVyQ2xhc3M6ICdsb2FkZXInLFxuICAgICAgICAgICAgbWVzc2FnZUNsYXNzOiAnbWVzc2FnZScsXG4gICAgICAgICAgICBzb3VyY2VBdHRyOiAnZGF0YS1sb2FkJyxcbiAgICAgICAgICAgIGRhdGFQYXRoOiAnZGF0YScsXG4gICAgICAgICAgICBuZXh0UGFnZVBhdGg6ICduZXh0X3BhZ2UnLFxuICAgICAgICAgICAgdG90YWxQYWdlc1BhdGg6ICd0b3RhbF9wYWdlcycsXG4gICAgICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgICAgICBlbmRNZXNzYWdlOiAnTm8gbW9yZSBpdGVtcyB0byBsb2FkLi4uJyxcbiAgICAgICAgICAgIGFuaW1hdGlvbjogbnVsbCxcbiAgICAgICAgICAgIHdhaXRGb3JJbWFnZXM6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIHRoaXMuZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLm1hcCA9IG1hcDtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMuZ2V0VGVtcGxhdGVDb250ZW50KCk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy5nZXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5wbGFjZWhvbGRlck5hbWVzID0gdGhpcy5nZXRQbGFjZWhvbGRlck5hbWVzKCk7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMuaW5zZXJ0Q29udGVudCgpO1xuICAgICAgICB0aGlzLnNwaW5uZXIgPSB0aGlzLmluc2VydFNwaW5uZXIoKTtcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGhpcy5pbnNlcnRNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuc2Nyb2xsSGVscGVyID0gdGhpcy5pbnNlcnRTY3JvbGxIZWxwZXIoKTtcbiAgICAgICAgdGhpcy5uZXh0UGFnZSA9IHRoaXMucGFyc2VTb3VyY2UoKTtcbiAgICAgICAgdGhpcy50b3RhbFBhZ2VzID0gMDtcbiAgICAgICAgdGhpcy5wYWdlID0gMDtcbiAgICAgICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FuTG9hZCA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG5cbiAgICAgICAgdGhpcy5jaGVjaygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnQgbGlzdGVuZXJzXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHdpbmRvdykub24oJ3Njcm9sbCcsIHRoaXMuY2hlY2suYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIub24oJ2luZmluaXR1bTpzY3JvbGxlZC1pbicsIHRoaXMub25TY3JvbGxlZEluLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5vbignaW5maW5pdHVtOmxvYWRlZCcsIHRoaXMub25Mb2FkZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLm9uKCdpbmZpbml0dW06ZW5kJywgdGhpcy5vbkVuZC5iaW5kKHRoaXMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbnRhaW5lciBlbGVtZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7SlF1ZXJ5fGpRdWVyeXxIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldENvbnRhaW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQodGhpcy5vcHRpb25zLmNvbnRhaW5lcik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIGRhdGEgc291cmNlIGZyb20gYXR0cmlidXRlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucGFyc2VTb3VyY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRhaW5lci5hdHRyKHRoaXMub3B0aW9ucy5zb3VyY2VBdHRyKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IGNvbnRlbnQgY29udGFpbmVyIGludG8gbWFpbiBjb250YWluZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtKUXVlcnl8alF1ZXJ5fEhUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuaW5zZXJ0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSAkKCc8ZGl2PicpO1xuICAgICAgICBjb250ZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250ZW50Q2xhc3MpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcblxuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IHNjcm9sbC1oZWxwZXIgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRTY3JvbGxIZWxwZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY3JvbGxIZWxwZXIgPSAkKCc8ZGl2PicpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChzY3JvbGxIZWxwZXIpO1xuXG4gICAgICAgIHJldHVybiBzY3JvbGxIZWxwZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluc2VydCBhIHNwaW5uZXIgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRTcGlubmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3Bpbm5lciA9ICQoJzxkaXY+Jyk7XG4gICAgICAgIHNwaW5uZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnNwaW5uZXJDbGFzcyk7XG4gICAgICAgIHNwaW5uZXIuaGlkZSgpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChzcGlubmVyKTtcblxuICAgICAgICByZXR1cm4gc3Bpbm5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IG1lc3NhZ2UgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWVzc2FnZSA9ICQoJzxkaXY+Jyk7XG4gICAgICAgIG1lc3NhZ2UuYWRkQ2xhc3ModGhpcy5vcHRpb25zLm1lc3NhZ2VDbGFzcyk7XG4gICAgICAgIG1lc3NhZ2UuaGlkZSgpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChtZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgc2Nyb2xsIGhlbHBlciBpcyBpbiB2aWV3XG4gICAgICogYW5kIHdlIG5lZWQgdG8gbG9hZCBuZXh0IHBhZ2VcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiggISB0aGlzLmNhbkxvYWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpblZpZXcgPSB0aGlzLmlzSW5WaWV3KHRoaXMuc2Nyb2xsSGVscGVyKTtcblxuICAgICAgICBpZiggISB0aGlzLmxvYWRpbmcgJiYgaW5WaWV3KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci50cmlnZ2VyKCdpbmZpbml0dW06c2Nyb2xsZWQtaW4nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBlbGVtZW50IGlzIGluIHZpZXdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pc0luVmlldyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBlbGVtZW50UG9zaXRpb24gPSBlbGVtZW50Lm9mZnNldCgpLnRvcDtcbiAgICAgICAgdmFyIHdpbmRvd0hlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIHNjcm9sbFRvcCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcblxuICAgICAgICByZXR1cm4gZWxlbWVudFBvc2l0aW9uIC0gc2Nyb2xsVG9wID4gMCAmJiBlbGVtZW50UG9zaXRpb24gLSBzY3JvbGxUb3AgPCB3aW5kb3dIZWlnaHQgLSB0aGlzLm9wdGlvbnMub2Zmc2V0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGl0ZW1zIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvYWRpbmcgPSB0cnVlO1xuXG4gICAgICAgIGlmKCAhIHRoaXMubmV4dFBhZ2UgfHwgdGhpcy5uZXh0UGFnZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci50cmlnZ2VyKCdpbmZpbml0dW06ZW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLm5leHRQYWdlLFxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNwb25zZShkYXRhKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcnNlTmV4dFBhZ2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJzZVRvdGFsUGFnZXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXIudHJpZ2dlcignaW5maW5pdHVtOmxvYWRlZCcpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93TWVzc2FnZSgnRXJyb3I6ICgnICsgZGF0YS5zdGF0dXMgKyBcIikgXCIgKyBkYXRhLnN0YXR1c1RleHQpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgYSByZXNwb25zZSBmcm9tIHNlcnZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc3Buc2VcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLnJlbmRlclJlc3BvbnNlID0gZnVuY3Rpb24gKHJlc3Buc2UpIHtcbiAgICAgICAgdmFyIHBhcnNlZCA9IHRoaXMucGFyc2VSZXNwb25zZShyZXNwbnNlKTtcblxuICAgICAgICBpZihwYXJzZWQgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgdGhpcy5zaG93TWVzc2FnZSgnUmVzcG9uc2UgY2Fubm90IGJlIHBhcnNlZCcpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiggISBBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoJ1Jlc3BvbnNlIGRhdGEgbXVzdCBiZSBhbiBhcnJheScpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIocGFyc2VkKTtcbiAgICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICAgICAgdGhpcy5zaG93TWVzc2FnZShleCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUGFyc2UgYSByZXNwb25zZSBmcm9tIHNlcnZlciBhbmQgcHJlcGFyZSBmb3IgcmVuZGVyaW5nXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLnBhcnNlUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHkocmVzcG9uc2UsIHRoaXMub3B0aW9ucy5kYXRhUGF0aCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIGRhdGEgaXRlbSBmb3IgdGhlIHRlbXBsYXRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZURhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgcGFyc2VkID0ge307XG5cbiAgICAgICAgdGhpcy5wbGFjZWhvbGRlck5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBfdGhpcy5tYXBbbmFtZV07XG5cbiAgICAgICAgICAgIGlmKGtleSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ01hcCBpcyBtaXNzaW5nIGEgcHJvcGVydHkgdGhhdCBpcyBkZWZpbmVkIGluIHRoZSB0ZW1wbGF0ZSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBhcnNlZFtuYW1lXSA9IF90aGlzLmdldFByb3BlcnR5KGRhdGEsIGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIG5leHQgcGFnZSB1cmwgZnJvbSBzZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucGFyc2VOZXh0UGFnZSA9IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICB0aGlzLm5leHRQYWdlID0gdGhpcy5nZXRQcm9wZXJ0eShyZXNwb25zZSwgdGhpcy5vcHRpb25zLm5leHRQYWdlUGF0aCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIHRvdGFsIHBhZ2UgY291bnQgZnJvbSBzZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucGFyc2VUb3RhbFBhZ2VzID0gZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmKHRoaXMudG90YWxQYWdlcyAhPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50b3RhbFBhZ2VzID0gdGhpcy5nZXRQcm9wZXJ0eShyZXNwb25zZSwgdGhpcy5vcHRpb25zLnRvdGFsUGFnZXNQYXRoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRXZlbnQgaGFuZGxlclxuICAgICAqIFdoZW4gc2Nyb2xsIGhlbHBlciBpcyBzY3JvbGxlZCBpbnRvIHZpZXdcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLm9uU2Nyb2xsZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sb2FkKCk7XG4gICAgICAgIHRoaXMuc3Bpbm5lci5zaG93KCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXJcbiAgICAgKiBXaGVuIGl0ZW1zIGFyZSBsb2FkZWRcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLm9uTG9hZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNwaW5uZXIuaGlkZSgpO1xuXG4gICAgICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhZ2UrKztcblxuICAgICAgICBpZih0aGlzLnBhZ2UgPj0gdGhpcy50b3RhbFBhZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci50cmlnZ2VyKCdpbmZpbml0dW06ZW5kJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRXZlbnQgaGFuZGxlclxuICAgICAqIFdoZW4gdGhlcmUgaXMgbm8gbW9yZSBpdGVtcyB0byBsb2FkXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5vbkVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zaG93TWVzc2FnZSh0aGlzLm9wdGlvbnMuZW5kTWVzc2FnZSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBwYXJzZWQgcmVzcG9uc2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgcmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF90aGlzLnBhcnNlRGF0YShpdGVtKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIHRocm93ICdDYW5ub3QgcmVuZGVyIHRlbXBsYXRlOiAnICsgZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gX3RoaXMucmVuZGVyVGVtcGxhdGUoZGF0YSk7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IF90aGlzLmFwcGVuZEl0ZW0odGVtcGxhdGUpO1xuXG4gICAgICAgICAgICBfdGhpcy5hbmltYXRlKGVsZW1lbnQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQW5pbWF0ZSB0aGUgZWxlbWVudCB3aXRoIHRoZSB0cmFuc2l0aW9uIHNwZWNpZmllZCBpbiBvcHRpb25zXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0pRdWVyeX0gZWxlbWVudFxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuYW5pbWF0ZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmKCAhIHRoaXMub3B0aW9ucy5hbmltYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlbnRlckNsYXNzID0gdGhpcy5vcHRpb25zLmFuaW1hdGlvbiArICctZW50ZXInO1xuXG4gICAgICAgIGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmFuaW1hdGlvbik7XG4gICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoZW50ZXJDbGFzcyk7XG5cbiAgICAgICAgaWYodGhpcy5vcHRpb25zLndhaXRGb3JJbWFnZXMpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZmluZCgnaW1nJykub25lKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoZW50ZXJDbGFzcyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGVudGVyQ2xhc3MpO1xuICAgICAgICB9LCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kIGFuIGl0ZW0gdG8gdGhlIGNvbnRlbnQgY29udGFpbmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuYXBwZW5kSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiAkKGl0ZW0pLmFwcGVuZFRvKHRoaXMuY29udGVudCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBwbGFpbiBodG1sIGNvbnRlbnQgb2YgdGhlIHRlbXBsYXRlXG4gICAgICogUmVtb3ZlIHRlbXBsYXRlIGVsZW1lbnQgZnJvbSB0aGUgRE9NXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfEpRdWVyeX1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldFRlbXBsYXRlQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0ZW1wbGF0ZSA9ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKTtcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSAkdGVtcGxhdGUuaHRtbCgpO1xuXG4gICAgICAgICR0ZW1wbGF0ZS5yZW1vdmUoKTtcblxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBhIHRlbXBsYXRlIHdpdGggYSBkYXRhIHByb3ZpZGVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSBEYXRhIHRvIGluc2VydCBpbiBhIHRlbXBsYXRlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLnJlbmRlclRlbXBsYXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJlbmRlcmVkID0gdGhpcy50ZW1wbGF0ZTtcblxuICAgICAgICB0aGlzLnBsYWNlaG9sZGVyTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAocGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgIHZhciBwYXR0ZXJuID0gbmV3IFJlZ0V4cChcInt7ICpcIiArIHBsYWNlaG9sZGVyICsgXCIgKn19XCIsIFwiZ1wiKTtcbiAgICAgICAgICAgIHJlbmRlcmVkID0gcmVuZGVyZWQucmVwbGFjZShwYXR0ZXJuLCBkYXRhW3BsYWNlaG9sZGVyXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlbmRlcmVkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGxhY2Vob2xkZXIgbmFtZXMgZnJvbSB0aGUgdGVtcGxhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldFBsYWNlaG9sZGVyTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtdO1xuICAgICAgICB2YXIgcmVnZXggPSAve3sgKihbYS16QS1aMC05X10rKSAqfX0vZztcblxuICAgICAgICB2YXIgbWF0Y2ggPSByZWdleC5leGVjKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgICAgICAgbmFtZXMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgICBtYXRjaCA9IHJlZ2V4LmV4ZWModGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmFtZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3cgYSBtZXNzYWdlIGluIHRoZSBtZXNzYWdlIGVsZW1lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5zaG93TWVzc2FnZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlLnRleHQodGhpcy5vcHRpb25zLmVuZE1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy5tZXNzYWdlLnRleHQoKSkge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3Bpbm5lci5oaWRlKCk7XG4gICAgICAgIHRoaXMuY2FuTG9hZCA9IGZhbHNlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvcGVydHkgZnJvbSBvYmplY3QgdXNpbmcgZG90IG5vdGF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0IE9iamVjdCB0byBxdWVyeVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgS2V5IHBhdGggKGkuZS4gXCJpdGVtLmRhdGEubmFtZVwiKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVtYmVyfG9iamVjdHxBcnJheX1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldFByb3BlcnR5ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgICAgIHZhciBwYXRoID0ga2V5LnNwbGl0KCcuJyk7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlIChvYmplY3QgIT0gbnVsbCAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgb2JqZWN0ID0gb2JqZWN0W3BhdGhbaW5kZXgrK11dO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChpbmRleCAmJiBpbmRleCA9PSBsZW5ndGgpID8gb2JqZWN0IDogdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gSW5maW5pdHVtO1xufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
