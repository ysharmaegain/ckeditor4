/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

( function() {
	'use strict';

	var stylesLoaded = false,
		arrTools = CKEDITOR.tools.array,
		htmlEncode = CKEDITOR.tools.htmlEncode,
		EmojiDropdown = CKEDITOR.tools.createClass( {
			$: function( editor, plugin ) {
				var lang = this.lang = editor.lang.emoji,
					self = this,
					ICON_SIZE = 21;

				this.listeners = [];
				this.plugin = plugin;
				this.editor = editor;
				this.groups = [
						{
							name: 'people',
							sectionName: lang.groups.people,
							svgId: 'cke4-icon-emoji-2',
							position: {
								x: -1 * ICON_SIZE,
								y: 0
							},
							items: []
						},
						{
							name: 'nature',
							sectionName: lang.groups.nature,
							svgId: 'cke4-icon-emoji-3',
							position: {
								x: -2 * ICON_SIZE,
								y: 0
							},
							items: []
						},
						{
							name: 'food',
							sectionName: lang.groups.food,
							svgId: 'cke4-icon-emoji-4',
							position: {
								x: -3 * ICON_SIZE,
								y: 0
							},
							items: []
						},
						{
							name: 'travel',
							sectionName: lang.groups.travel,
							svgId: 'cke4-icon-emoji-6',
							position: {
								x: -2 * ICON_SIZE,
								y: -1 * ICON_SIZE
							},
							items: []
						},
						{
							name: 'activities',
							sectionName: lang.groups.activities,
							svgId: 'cke4-icon-emoji-5',
							position: {
								x: -4 * ICON_SIZE,
								y: 0
							},
							items: []
						},
						{
							name: 'objects',
							sectionName: lang.groups.objects,
							svgId: 'cke4-icon-emoji-7',
							position: {
								x: 0,
								y: -1 * ICON_SIZE
							},
							items: []
						},
						{
							name: 'symbols',
							sectionName: lang.groups.symbols,
							svgId: 'cke4-icon-emoji-8',
							position: {
								x: -1 * ICON_SIZE,
								y: -1 * ICON_SIZE
							},
							items: []
						},
						{
							name: 'flags',
							sectionName: lang.groups.flags,
							svgId: 'cke4-icon-emoji-9',
							position: {
								x: -3 * ICON_SIZE,
								y: -1 * ICON_SIZE
							},
							items: []
						}
					];

				// Keeps html elements references to not find them again.
				this.elements = {};

				// Below line might be removable
				editor.ui.addToolbarGroup( 'emoji', 'insert' );
				// Name is responsible for icon name also.
				editor.ui.add( 'EmojiPanel', CKEDITOR.UI_PANELBUTTON, {
					label: 'emoji',
					title: lang.title,
					modes: { wysiwyg: 1 },
					editorFocus: 0,
					toolbar: 'insert',
					panel: {
						css: [
							CKEDITOR.skin.getPath( 'editor' ),
							plugin.path + 'skins/default.css'
						],
						attributes: {
							role: 'listbox',
							'aria-label': lang.title
						},
						markFirst: false
					},

					onBlock: function( panel, block ) {
						var keys = block.keys,
							rtl = editor.lang.dir === 'rtl';

						keys[ rtl ? 37 : 39 ] = 'next'; // ARROW-RIGHT
						keys[ 40 ] = 'next'; // ARROW-DOWN
						keys[ 9 ] = 'next'; // TAB
						keys[ rtl ? 39 : 37 ] = 'prev'; // ARROW-LEFT
						keys[ 38 ] = 'prev'; // ARROW-UP
						keys[ CKEDITOR.SHIFT + 9 ] = 'prev'; // SHIFT + TAB
						keys[ 32 ] = 'click'; // SPACE

						self.blockElement = block.element;
						self.emojiList = self.editor._.emoji.list;

						self.addEmojiToGroups();

						block.element.getAscendant( 'html' ).addClass( 'cke_emoji' );
						block.element.getDocument().appendStyleSheet( CKEDITOR.getUrl( CKEDITOR.basePath + 'contents.css' ) );
						block.element.addClass( 'cke_emoji-panel_block' );
						block.element.setHtml( self.createEmojiBlock() );
						block.element.removeAttribute( 'title' );
						panel.element.addClass( 'cke_emoji-panel' );

						self.items = block._.getItems();

						self.blockObject = block;
						self.elements.emojiItems = block.element.find( '.cke_emoji-outer_emoji_block li > a' );
						self.elements.sectionHeaders = block.element.find( '.cke_emoji-outer_emoji_block h2' );
						self.elements.input = block.element.findOne( 'input' );
						self.inputIndex = self.getItemIndex( self.items, self.elements.input );
						self.elements.emojiBlock = block.element.findOne( '.cke_emoji-outer_emoji_block' );
						self.elements.navigationItems = block.element.find( 'nav li' );
						self.elements.statusIcon = block.element.findOne( '.cke_emoji-status_icon' );
						self.elements.statusDescription = block.element.findOne( 'p.cke_emoji-status_description' );
						self.elements.statusName = block.element.findOne( 'p.cke_emoji-status_full_name' );
						self.elements.sections = block.element.find( 'section' );
						self.registerListeners();

					},

					onOpen: self.openReset()
				} );
			},
			proto: {
				registerListeners: function() {
					arrTools.forEach( this.listeners, function( item ) {
						var root = this.blockElement,
							selector = item.selector,
							listener = item.listener,
							event = item.event,
							ctx = item.ctx || this;

						arrTools.forEach( root.find( selector ).toArray(), function( node ) {
							node.on( event, listener, ctx );
						} );
					}, this );
				},
				createEmojiBlock: function() {
					var output = [];
					output.push( this.createEmojiListBlock() );
					output.push( this.createStatusBar() );

					return '<div class="cke_emoji-inner_panel">' + output.join( '' ) + '</div>';
				},
				createEmojiListBlock: function() {
					var self = this;
					this.listeners.push( {
						selector: '.cke_emoji-outer_emoji_block',
						event: 'scroll',
						listener: ( function() {
							var buffer = CKEDITOR.tools.throttle( 150, self.refreshNavigationStatus, self );
							return buffer.input;
						} )()
					} );

					this.listeners.push( {
						selector: '.cke_emoji-outer_emoji_block',
						event: 'click',
						listener: function( event ) {
							if ( event.data.getTarget().data( 'cke-emoji-name' ) ) {
								this.editor.execCommand( 'insertEmoji', { emojiText: event.data.getTarget().data( 'cke-emoji-symbol' ) } );
							}
						}
					} );

					this.listeners.push( {
						selector: '.cke_emoji-outer_emoji_block',
						event: 'mouseover',
						listener: function( event ) {
							this.updateStatusbar( event.data.getTarget() );
						}
					} );

					this.listeners.push( {
						selector: '.cke_emoji-outer_emoji_block',
						event: 'keyup',
						listener: function() {
							this.updateStatusbar( this.items.getItem( this.blockObject._.focusIndex ) );
						}
					} );

					return '<div class="cke_emoji-outer_emoji_block">' + this.getEmojiSections() + '</div>';
				},
				createStatusBar: function() {
					return '<div class="cke_emoji-status_bar">' +
						'<div class="cke_emoji-status_icon"></div>' +
						'<p class="cke_emoji-status_description"></p><p class="cke_emoji-status_full_name"></p>' +
						'</div>';
				},
				getEmojiSections: function() {
					return arrTools.reduce( this.groups, function( acc, item ) {
						// If group is empty skip it.
						if ( !item.items.length ) {
							return acc;
						} else {
							return acc + this.getEmojiSection( item );
						}
					}, '', this );
				},
				getEmojiSection: function( item ) {
					var groupName = htmlEncode( item.name ),
						sectionName = htmlEncode( item.sectionName ),
						group = this.getEmojiListGroup( item.items );

					return '<section data-cke-emoji-group="' + groupName + '" ><h2 id="' + groupName + '">' + '</h2><ul>' + group + '</ul></section>';
				},
				getEmojiListGroup: function( items ) {
					var emojiTpl = new CKEDITOR.template( '<li class="cke_emoji-item">' +
						'<a draggable="false" data-cke-emoji-full-name="{id}" data-cke-emoji-name="{name}" data-cke-emoji-symbol="{symbol}" data-cke-emoji-group="{group}" ' +
						'data-cke-emoji-keywords="{keywords}" title="{name}" href="#" _cke_focus="1">{symbol}</a>' +
						'</li>' );

					return arrTools.reduce(
						items,
						function( acc, item ) {
							return acc + emojiTpl.output( {
									symbol: htmlEncode( item.symbol ),
									id: htmlEncode( item.id ),
									name: htmlEncode( item.id.replace( /::.*$/, ':' ).replace( /^:|:$/g, '' ).replace( /_/g, ' ' ) ),
									group: htmlEncode( item.group ),
									keywords: htmlEncode( ( item.keywords || [] ).join( ',' ) )
								} );
						},
						'',
						this
					);
				},
				filter: function( evt ) {
					// Apply filters to emoji items in dropdown.
					// Hiding not searched one.
					// Can accept input event or string
					var groups = {},
						query = typeof evt === 'string' ? evt : evt.sender.getValue();

					arrTools.forEach( this.elements.emojiItems.toArray(), function( element ) {
						if ( isNameOrKeywords( query, element.data( 'cke-emoji-name' ), element.data( 'cke-emoji-keywords' ) ) || query === '' ) {
							element.removeClass( 'hidden' );
							element.getParent().removeClass( 'hidden' );
							groups[ element.data( 'cke-emoji-group' ) ] = true;
						} else {
							element.addClass( 'hidden' );
							element.getParent().addClass( 'hidden' );
						}

						function isNameOrKeywords( query, name, keywordsString ) {
							var keywords,
								i;
							if ( name.indexOf( query ) !== -1 ) {
								return true;
							}
							if ( keywordsString ) {
								keywords = keywordsString.split( ',' );
								for ( i = 0; i < keywords.length; i++ ) {
									if ( keywords[ i ].indexOf( query ) !== -1 ) {
										return true;
									}
								}
							}
							return false;
						}
					} );

					arrTools.forEach( this.elements.sectionHeaders.toArray(), function( element ) {
						if ( groups[ element.getId() ] ) {
							element.getParent().removeClass( 'hidden' );
							element.removeClass( 'hidden' );
						} else {
							element.addClass( 'hidden' );
							element.getParent().addClass( 'hidden' );
						}
					} );

					this.refreshNavigationStatus();
				},
				clearSearchInput: function() {
					this.elements.input.setValue( '' );
					this.filter( '' );
				},
				openReset: function() {
					// Resets state of emoji dropdown.
					// Clear filters, reset focus, etc.
					var self = this,
						firstCall;

					return function() {

						if ( !firstCall ) {
							self.filter( '' );
							firstCall = true;
						}

						self.elements.emojiBlock.$.scrollTop = 0;
						self.refreshNavigationStatus();

						// Remove statusbar icons:
						self.clearStatusbar();
					};
				},
				refreshNavigationStatus: function() {
					var containerOffset = this.elements.emojiBlock.getClientRect().top,
						section,
						groupName;

					section = arrTools.filter( this.elements.sections.toArray(), function( element ) {
						var rect = element.getClientRect();
						if ( !rect.height || element.findOne( 'h2' ).hasClass( 'hidden' ) ) {
							return false;
						}
						return rect.height + rect.top > containerOffset;
					} );
					groupName = section.length ? section[ 0 ].data( 'cke-emoji-group' ) : false;

					arrTools.forEach( this.elements.navigationItems.toArray(), function( node ) {
						if ( node.data( 'cke-emoji-group' ) === groupName ) {
							node.addClass( 'active' );
						} else {
							node.removeClass( 'active' );
						}
					} );
				},
				updateStatusbar: function( element ) {
					if ( element.getName() !== 'a' || !element.hasAttribute( 'data-cke-emoji-name' ) ) {
						return;
					}

					this.elements.statusIcon.setText( htmlEncode( element.getText() ) );
					this.elements.statusDescription.setText( htmlEncode( element.data( 'cke-emoji-name' ) ) );
					this.elements.statusName.setText( htmlEncode( element.data( 'cke-emoji-full-name' ) ) );
				},
				clearStatusbar: function() {
					this.elements.statusIcon.setText( '' );
					this.elements.statusDescription.setText( '' );
					this.elements.statusName.setText( '' );
				},
				getItemIndex: function( nodeList, item ) {
					return arrTools.indexOf( nodeList.toArray(), function( element ) {
						return element.equals( item );
					} );
				},
				addEmojiToGroups: function() {
					var groupObj = {};
					arrTools.forEach( this.groups, function( group ) {
						groupObj[ group.name ] = group.items;
					}, this );

					arrTools.forEach( this.emojiList, function( emojiObj ) {
						groupObj[ emojiObj.group ].push( emojiObj );
					}, this );
				}
			}
		} );


	CKEDITOR.plugins.add( 'emoji', {
		requires: 'autocomplete,textmatch,ajax,panelbutton,floatpanel',
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'emojipanel',
		hidpi: true,

		beforeInit: function() {
			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 11 ) {
				return;
			}
			if ( !stylesLoaded ) {
				CKEDITOR.document.appendStyleSheet( this.path + 'skins/default.css' );
				stylesLoaded = true;
			}
		},

		init: function( editor ) {
			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 11 ) {
				return;
			}

			var emojiListUrl = editor.config.emoji_emojiListUrl || 'plugins/emoji/emoji.json',
				arrTools = CKEDITOR.tools.array;


			CKEDITOR.ajax.load( CKEDITOR.getUrl( emojiListUrl ), function( data ) {
				if ( data === null ) {
					return;
				}
				if ( editor._.emoji === undefined ) {
					editor._.emoji = {};
				}

				if ( editor._.emoji.list === undefined ) {
					editor._.emoji.list = JSON.parse( data );
				}

				var emojiList = editor._.emoji.list,
					charactersToStart = editor.config.emoji_minChars === undefined ? 2 : editor.config.emoji_minChars;

				if ( editor.status !== 'ready' ) {
					editor.once( 'instanceReady', initPlugin );
				} else {
					initPlugin();
				}

				// HELPER FUNCTIONS:

				function initPlugin() {
					editor._.emoji.autocomplete = new CKEDITOR.plugins.autocomplete( editor, {
						textTestCallback: getTextTestCallback(),
						dataCallback: dataCallback,
						itemTemplate: '<li data-id="{id}" class="cke_emoji-suggestion_item">{symbol} {id}</li>',
						outputTemplate: '{symbol}'
					} );
				}

				function getTextTestCallback() {
					return function( range ) {
						if ( !range.collapsed ) {
							return null;
						}
						return CKEDITOR.plugins.textMatch.match( range, matchCallback );
					};
				}

				function matchCallback( text, offset ) {
					var left = text.slice( 0, offset ),
						// Emoji should be started with space or newline, but space shouldn't leak to output, hence it is in non captured group (#2195).
						match = left.match( new RegExp( '(?:\\s\|^)(:\\S{' + charactersToStart + '}\\S*)$' ) );

					if ( !match ) {
						return null;
					}

					// In case of space preceding colon we need to return the last index (#2394) of capturing group.
					return { start: left.lastIndexOf( match[ 1 ] ), end: offset };
				}

				function dataCallback( matchInfo, callback ) {
					var emojiName = matchInfo.query.substr( 1 ).toLowerCase(),
						data = arrTools.filter( emojiList, function( item ) {
							// Comparing lowercase strings, because emoji should be case insensitive (#2167).
							return item.id.toLowerCase().indexOf( emojiName ) !== -1;
						} ).sort( function( a, b ) {
							var aStartsWithEmojiName = !a.id.substr( 1 ).indexOf( emojiName ),
								bStartsWithEmojiName = !b.id.substr( 1 ).indexOf( emojiName );

							if ( aStartsWithEmojiName != bStartsWithEmojiName ) {
								return aStartsWithEmojiName ? -1 : 1;
							} else {
								return a.id > b.id ? 1 : -1;
							}
						} );
					callback( data );
				}
			} );

			editor.addCommand( 'insertEmoji', {
				exec: function( editor, data ) {
					editor.insertHtml( data.emojiText );
				}
			} );

			if ( editor.plugins.toolbar ) {
				new EmojiDropdown( editor, this );
			}

		}
	} );
} )();

/**
 * A number that defines how many characters are required to start displaying emoji's autocomplete suggestion box.
 * Delimiter `:`, which activates the emoji suggestion box, is not included in this value.
 *
 * ```js
 * 	editor.emoji_minChars = 0; // Emoji suggestion box appears after typing ':'.
 * ```
 *
 * @since 4.10.0
 * @cfg {Number} [emoji_minChars=2]
 * @member CKEDITOR.config
 */

/**
 * Address of the JSON file containing the emoji list. The file is downloaded through the {@link CKEDITOR.ajax#load} method
 * and the URL address is processed by {@link CKEDITOR#getUrl}.
 * Emoji list has to be an array of objects with the `id` and `symbol` properties. These keys represent the text to match and the
 * UTF symbol for its replacement.
 * An emoji has to start with the `:` (colon) symbol.
 *
 * ```json
 * [
 * 	{
 * 		"id": ":grinning_face:",
 * 		"symbol":"😀"
 * 	},
 * 	{
 * 		"id": ":bug:",
 * 		"symbol":"🐛"
 * 	},
 * 	{
 * 		"id": ":star:",
 * 		"symbol":"⭐"
 * 	}
 * ]
 * ```
 *
 * ```js
 * 	editor.emoji_emojiListUrl = 'https://my.custom.domain/ckeditor/emoji.json';
 * ```
 *
 * @since 4.10.0
 * @cfg {String} [emoji_emojiListUrl='plugins/emoji/emoji.json']
 * @member CKEDITOR.config
 */
