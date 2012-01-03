define([
	"aloha/core",
	"aloha/jquery",
	"ui/ui"
],
function( Aloha, jQuery, Ui ) {

	/**
	 * The (local) `Tab` class defines an object that represents a collection
	 * of related component groups to be rendered together on the toolbar. Tabs
	 * are organized by feature and functionality so that related controls can
	 * be brought in and out of view depending on whether they are appropriate
	 * for a given user context.
	 *
	 * Tabs can be defined declaritivly in the Aloha configuration in the
	 * following manner:

		Aloha.settings.toolbar.tabs: [
			{
				label: 'Lists',
				activateOn: 'ul,ol,*.parent(.aloha-editable ul,.aloha-editable ol)',
				components: [ [ 'orderedList', 'unorderedList' ] ]
			}
		]

	 * Alternatively, tabs can also be created imperatively in this way:
	 * `new Tab( options, editable )`.
	 *
	 * The basic ui functionality of tabs is provided by jQuery UI Tabs.
	 *
	 * @param {object} options Information about the tab to be created,
	 *                         including the tab's label, and array of
	 *                         component groups it will contain.
	 * @param {Aloha.Editable} editable The editable who's toolbar this tab
	 *                                  will belong to.
	 * @constructor
	 */
	var Tab = function( options, editable ) {

		/**
		 * A unique identifier for this tab.
		 * @type {string}
		 */
		this.uid = null;

		/**
		 * Clickable tab handle which pairs with a corresponding panel element.
		 * @type {jQuery<HTMLElement>}
		 */
		this.handle = null;

		/**
		 * The container element for this tab's panel.
		 * @type {jQuery<HTMLElement>}
		 */
		this.panel = null;

		/**
		 * The editable to which this tab is attached to.
		 * @type {jQuery<HTMLElement>}
		 */
		this.editable = null;

		/**
		 * A positive integer denoting the zero-base index of this tab's
		 * position in the set toolbar tabs for a given editable.
		 * @type {number}
		 */
		this.index = null;

		/**
		 * True if this tab is activated.
		 * @type {boolean}
		 */
		this.activated = false;

        /**
         * Given a value which represents an activateOn test, coerce the value
		 * into a predicate function.
		 * @param {string|boolean|function():boolean} activateOn
		 * @return {function():boolean}
         */
        var coerceActivateOnToPredicate = function( activateOn ) {
			switch( typeof activateOn ) {
			case 'function':
				return activateOn;
			case 'boolean':
				return function() {
					return activateOn;
				};
			case 'string':
				return function( el ) {
					return el ? jQuery( el ).is( activateOn ) : false;
				};
			case 'undefined':
				return function() {
					return true;
				};
			default:
				return function() {
					return false;
				};
			}
        };

		this.shouldActivate = coerceActivateOnToPredicate( options.activateOn );
		this.init.apply( this, arguments );
	};

	//
	// Prototype methods for the Tab object.
	//

	(function() {

		/**
		 * Initialize a tab, with its options.
		 * @param {object} options Information about the tab to be created,
		 *                         including the tab's label, and array of
		 *                         component groups.
		 * @param {Aloha.Editable} editable The editable who's toolbar this tab
	 	 *                                  will belong to.
	 	 */
		this.init = function( options, editable ) {
			this.container = editable.toolbar.find( '.aloha-toolbar-tabs-container' );

			// console.assert( this.container.length === 1 )	

			this.uid = options.uid;
			this.editable = editable;
			this.index = editable.tabs.length;

			this.handle = jQuery(
				  '<li>'
				+   '<a href="#' + this.uid + '">'
				+		options.label
				+   '</a>'
				+ '</li>'
			);

			var panel = this.panel = jQuery( '<div>', { id : this.uid });

			jQuery.each( options.components, function() {
				var group = jQuery( '<div>', {
					'class': 'aloha-toolbar-group'
				}).appendTo( panel );

				// <a id="render-components"></a>
				// For each control, we render a new instance and append it to
				// the group.
				jQuery.each( this, function() {
					var component = Aloha.ui.render( this, editable );
					group.append( component.element );
				});
			});

			this.handle
			    .appendTo( this.container.find( 'ul.aloha-toolbar-tab-handles' ))
				.hide();

			this.panel
			    .appendTo( this.container.find( '.aloha-toolbar-tabs-panels' ))
				.hide();
		};

		/**
		 * A predicate that returns true if the user's selection change results
		 * in a selection which can be manipulated with the controls of this
		 * tab.
		 * @param {HTMLElement} node
		 * @param {Range} range The range of the current selection.
		 * @return {boolean} True if this tab should be shown on the toolbar.
		 */
		this.shouldActivate = function( node, range ) {
			return true;
		};

		/**
		 * Given an array of elements, activate this tab if any of the nodes in
		 * `elements` returns true when passed to the `shouldActivate`
		 * predicate. Otherwise deactivate the tab.
		 * @param {Array.<HTMLElement>} elements The effective elements any of
		 *                                       which may activate the tab.
		 */
		this.shouldActivateForElements = function( elements ) {
			// Add a null object to the elements array so that we can test
			// whether the panel should be activated when we have no effective
			// elements in the current selection.
			elements.push( null );

			var shouldActivate = this.shouldActivate;
			var j = elements.length;

			while ( j ) {
				if ( shouldActivate( elements[ --j ] ) ) {
					return true;
				}
			}

			return false;
		};

		/**
		 * Make this tab accessible on the toolbar.
		 */
		this.activate = function() {
			var tabs = this.container.find( 'ul.aloha-toolbar-tab-handles>li' );

			if ( tabs.length ) {
				this.show();
				this.activated = true;

				// If no tabs are selected, then select the tab which was just
				// activated.
				if ( this.container.find( '.ui-tabs-active' ).length == 0 ) {
					this.container.tabs( 'select', this.index );
				} else if ( this.container.tabs( 'option', 'selected' )
				            == this.index ) {
					this.container.tabs( 'select', this.index );
				}
			}
		};

		/**
		 * Make this tab disappear from the toolbar.
		 */
		this.deactivate = function() {
			var tabs = this.container.find( 'ul.aloha-toolbar-tab-handles>li' );

			if ( tabs.length ) {
				this.hide();
				this.activated = false;

				// If the tab we just deactivated was the selected tab, then we
				// need to selected another tab in its stead. We select the
				// first activated tab we find, or else we deselect all tabs.
				if ( this.index == this.container.tabs( 'option', 'selected' ) ) {
					var tabs = this.editable.tabs;

					for ( var i = 0; i < tabs.length; ++i ) {
						if ( tabs[i].activated ) {
							this.container.tabs( 'select', i );
							return;
						}
					}

					// This does not work...
					// this.container.tabs( 'select', -1 );

					this.handle.removeClass( 'ui-tabs-active' );
				}
			}
		};

		this.hide = function() {
			this.handle.hide();
			// this.panel.hide();
		};

		this.show = function() {
			this.handle.show();
			// Defer the showing of tab panels to occure when the tab is
			// selected.
			// this.panel.show();
		};

	}).call( Tab.prototype );

	// The toolbar is configured via `settings.toolbar` and is defined as
	// an array of tabs with component groups, where the groups are arrays of
	// controls.
	//
	// There are separate components for each editable,
	// but only the components for the active editable are shown.
	//
	// As a container for tabs, the toolbar serves to group together groups of
	// control components so that they can be shown and hidden together in their
	// feature/functional set. For exmaple groups of table controls would be
	// placed in a table tab, groups of list controls in an image tab, and so
	// forth.
	Ui.toolbar = {

		// The `active` property tracks which editable instance is currently active.
		active: null,

		// The `create()` method does all of the one-time setup needed to create the toolbar.
		// This should be called when Aloha is fully loaded.
		create: function() {
			var toolbar = this;
			this.element = jQuery( "<div>", {
				"class": "aloha-ui aloha-toolbar",
				mousedown: function() {
					if ( Aloha.activeEditable ) {
						toolbar.range = Aloha.getSelection().getRangeAt( 0 );
						// TODO: this overlaps with toolbar.active
						toolbar.editable = Aloha.activeEditable;
					}
				}
			})
			.hide()
			.appendTo( "body" );

			this.subscribeEventHandlers( toolbar );
		},

		/**
		 * Generate containers for tabs inside the toolbar wrapper div, and
		 * inflates tabs from an of tab definition.
		 * Invokes jQueryUI Tabs on the container created inside the toolbar.
		 * @param {Array.<Object>} tabs Tab settings from `toolbar.settings`.
		 * @param {Aloha.Editable} editable The editable whose toolbar will
		 *                                  hold the inflated tags.
		 */
		initializeTabs: function( tabs, editable ) {
			editable.tabs = editable.tabs || [];

			var container = jQuery( editable.toolbar )
									.find( '.aloha-toolbar-tabs-container' );

			var tabsHandles = jQuery( '<ul>', {
				'class': 'aloha-toolbar-tab-handles'
			}).appendTo( container );

			var tabsPanels = jQuery( '<div>', {
				'class': 'aloha-toolbar-tabs-panels'
			}).appendTo( container );


			var tab;
			var tabsUidPrefix = GENTICS.Utils.guid() + '-';
			var j = tabs.length;

			for ( var i = 0; i < j; ++i ) {
				tab = tabs[i];
				tab.uid = tabsUidPrefix + i;
				tab.label = tab.label || '';
				editable.tabs.push( new Tab( tabs[i], editable ));
			};

			container.tabs();
		},

		// The `render()` method is called once per editable to create all components
		// associated with the editable.
		render: function( editable ) {
			// All components are contained in a div specific to the editable
			// to make it easy to show and hide the controls an activate/deactivate.
			// The editable instance gets a reference to this div.
			editable.toolbar = jQuery( "<div>", {
				"class": "aloha-toolbar-wrap"
			});

			// Prepare a list of tabs by reading the toolbar settings.

			var tabs;
			var numUnnamedTabs = 0;

			if ( editable.settings.toolbar.tabs
			     && editable.settings.toolbar.tabs.length ) {
				 tabs = editable.settings.toolbar.tabs;
			} else {
				// TODO(petro@gentics.com): For now we automatically create
				// a tab if we encounter a `components` property that has not
				// been defined within a tab. But we should move to canonize
				// the way that the toolbar is configured so that the
				// `component` array must be defined within a tab object.

				tabs = [{
					label: 'Unnamed #' + ( ++numUnnamedTabs ),
					activateOn: true, // never hide this tab
					components: editable.settings.toolbar.components
				}];
			}

			jQuery( '<div>', {
				'class': 'aloha-toolbar-tabs-container'
			})
			.appendTo( editable.toolbar );

			this.initializeTabs( tabs, editable );
		},

		show: function( editable ) {
			// If this is the first time we're showing the toolbar for this
			// editable, then we need to render the controls first.
			if ( !editable.toolbar ) {
				this.render( editable );
			}

			// We hide any active controls and show this editable's controls.
			this.element.children().detach();
			this.element.append( editable.toolbar );
			this.element.fadeIn();
			this.active = editable;
		},

		hide: function( editable ) {
			if ( !Aloha.eventHandled ) {
				this.active = null;
				this.element.fadeOut(function() {
					editable.toolbar.detach();
				});
			}
		},

		/**
		 * Bind the necessary event handlers for the toolbar.
		 * @param {ui.toolbar} toolbar
		 */
		subscribeEventHandlers: function( toolbar ) {
			Aloha.bind( 'aloha-selection-changed', function( event, range ) {
				toolbar.checkActiveTabs( range );
			});

			// When an editable is activated, we show its associated controls.
			Aloha.bind( "aloha-editable-activated", function( event, alohaEvent ) {
				toolbar.show( alohaEvent.editable );
			});

			// When an editable is deactivated, we hide its associated controls.
			// This is currently disabled because we didn't want to implement the
			// logic for not deactivating the editable when the toolbar gains focus.
			Aloha.bind( "aloha-editable-deactivated", function( event, alohaEvent ) {
				toolbar.active = false;
				// Wait if another editable activates the toolbar
				setTimeout( function() {
					if ( !toolbar.active ) {
						toolbar.hide( alohaEvent.editable );
					}
				}, 10 );
			});

			// Flag the next selection change event to be ignored whenever the
			// toolbar is clicked.

			var editable = Aloha.activeEditable && Aloha.activeEditable.obj;

			if ( editable ) {
				editable.mousedown( function( ev ) {
					ev.originalEvent.stopSelectionUpdate = true;
					Aloha.eventHandled = true;
					//e.stopSelectionUpdate = true;
				});

				editable.mouseup( function( ev ) {
					ev.originalEvent.stopSelectionUpdate = true;
					Aloha.eventHandled = false;
				});
			}
		},

		/**
		 * Determine the effective elements at the current selection. Then
		 * iterates all tabs associated with this editable's toolbar and check
		 * whether the tab should be activated for any of the effective elements
		 * in the current selection.
		 * @param {Aloha.RangeObject} range
		 */
		 checkActiveTabs: function( range ) {
		 	var effective = [];

			if ( typeof range != 'undefined' && range.markupEffectiveAtStart ) {
				var l = range.markupEffectiveAtStart.length;

				for ( var i = 0; i < l; ++i ) {
					effective.push( range.markupEffectiveAtStart[i] );
				}
			}

			if ( this.active ) {
				jQuery.each( this.active.tabs, function() {
					if ( this.shouldActivateForElements( effective ) ) {
						if ( !this.activated ) {
							this.activate();
						}
					} else {
						if ( this.activated ) {
							this.deactivate();
						}
					}
				});
			}
		}

	};

	Ui.toolbar.create();
	return Ui.toolbar;
});
