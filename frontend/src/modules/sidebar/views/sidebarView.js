// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {

	var Origin = require('core/origin');
	var OriginView = require('core/views/originView');
    var SidebarFilterView = require('./sidebarFilterView');

	var Sidebar = OriginView.extend({

		className: 'sidebar',

		initialize: function() {
			this.render();
      this.$el.find('.collapse-sidebar').on('click', this.toggleSidebar);
			this.listenTo(Origin, 'sidebar:sidebarContainer:update', this.updateViews);
			this.listenTo(Origin, 'sidebar:sidebarFilter:add', this.addFilterView);
			this.listenTo(Origin, 'sidebar:sidebarContainer:hide', this.hideSidebar);
		},

		updateViews: function($element, options) {
			$('html').removeClass('sidebar-hide');

			// Check if options exists
			var options = (options || {});

			// If backButton option setup backButton
			if (options.backButtonText && options.backButtonRoute) {
				this.setupBackButtonRoute(options);
			} else {
				this.removeBackButtonRoute();
			}

			// Append new view into sidebar
			// Append is better here so we can animate the current view out
			this.$('.sidebar-item-container').append($element);

		},

		hideSidebar: function() {
			$('html').addClass('sidebar-hide');
		},

		setupBackButtonRoute: function(options) {
			// If breadcrumb, render template and animate in
			var template = Handlebars.templates['sidebarBreadcrumb'];
			this.$('.sidebar-breadcrumb').html(template(options));
			_.defer(function() {
				this.$('.sidebar-breadcrumb').velocity({'top': '0px', 'opacity': 1}, function() {
					Origin.trigger('sidebar:views:animateIn');
				});
			});
		},

		removeBackButtonRoute: function() {
			// If breadcrumb needs removing, animate out and trigger animateIn for the new view
			this.$('.sidebar-breadcrumb').velocity({'top': '-40px', 'opacity': 0}, function() {
				$(this).empty();
				Origin.trigger('sidebar:views:animateIn');
			});
		},

		addFilterView: function(options) {
			Origin.trigger('sidebar:sidebarFilter:remove');
			$('body').append(new SidebarFilterView(options).$el);
		},

    toggleSidebar: function() {
      var contentWrapper = $('#content_wrapper');
      var collapseIcon = $('.collapse-sidebar i');
      var sidebarInner = $('.sidebar-inner');

      if (contentWrapper.hasClass('folded')) {
        contentWrapper.removeClass('folded');
        collapseIcon.addClass('fa-chevron-circle-left').removeClass('fa-chevron-circle-right');
        sidebarInner.removeClass('display-none').velocity({ 'left': '0%', 'opacity': 1 }, {
          duration: 200,
          easing: "easeOutQuad"
        });
      } else {
        contentWrapper.addClass('folded');
        collapseIcon.removeClass('fa-chevron-circle-left').addClass('fa-chevron-circle-right');
        sidebarInner.velocity({ 'left': '0%', 'opacity': 0 }, {
          duration: 200,
          easing: "easeOutQuad",
          complete: function() {
            var that = this;
            setTimeout(function() {
              window.dispatchEvent(new Event('resize'));
              $(that).addClass('display-none');
            }, 250);
          }
        });
      }
    }
	}, {
		template: 'sidebar'
	});

	return Sidebar;

});
