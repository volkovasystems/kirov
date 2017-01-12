"use strict";

/*;
	@module-license:
		The MIT License (MIT)
		@mit-license

		Copyright (@c) 2017 Richeve Siodina Bebedor
		@email: richeve.bebedor@gmail.com

		Permission is hereby granted, free of charge, to any person obtaining a copy
		of this software and associated documentation files (the "Software"), to deal
		in the Software without restriction, including without limitation the rights
		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the Software is
		furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all
		copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		SOFTWARE.
	@end-module-license

	@module-configuration:
		{
			"package": "kirov",
			"path": "kirov/kirov.js",
			"file": "kirov.js",
			"module": "kirov",
			"author": "Richeve S. Bebedor",
			"contributors": [
				"John Lenon Maghanoy <johnlenonmaghanoy@gmail.com>"
			],
			"eMail": "richeve.bebedor@gmail.com",
			"repository": "https://github.com/volkovasystems/kirov.git",
			"test": "kirov-test.js",
			"global": true
		}
	@end-module-configuration

	@module-documentation:
		Send a GET request with /library as the base path followed by
			the name and file name of the module.

		The file name must match the stable file name of the bower module.

		A custom pointer can be specified if the path is different.
	@end-module-documentation

	@todo:
		Add support for custom versions.

		Add support for atomic operations.
	@end-todo

	@include:
		{
			"async": "async",
			"called": "called",
			"compression": "compression",
			"express": "express",
			"falze": "falze",
			"fs": "fs",
			"gnaw": "gnaw",
			"harden": "harden",
			"helment": "helmet",
			"lilfy": "lilfy",
			"lire": "lire",
			"methodOverride": "method-override",
			"mime": "mime-types",
			"Olivant": "olivant",
			"path": "path",
			"ssbolt": "ssbolt"
		}
	@end-include
*/

const async = require( "async" );
const called = require( "called" );
const compression = require( "compression" );
const doubt = require( "doubt" );
const express = require( "express" );
const falze = require( "falze" );
const fs = require( "fs" );
const gnaw = require( "gnaw" );
const harden = require( "harden" );
const helmet = require( "helmet" );
const lilfy = require( "lilfy" );
const lire = require( "lire" );
const methodOverride = require( "method-override" );
const mime = require( "mime-types" );
const Olivant = require( "olivant" );
const path = require( "path" );
const ssbolt = require( "ssbolt" );

/*;
	@option:
		{
			"middleware:required": "APP",
			"basePath:required": "string",
			"directory:required": "string"
		}
	@end-option
*/
const kirov = function kirov( option ){
	Prompt( "attaching dependency service middleware" );

	let middleware = option.middleware || global.APP || express( );

	let basePath = option.basePath || "/library";
	let directory = option.directory || process.cwd( );

	//: Initialize a new middleware if it is not yet given.
	if( falze( option.middleware ) && !global.APP ){
		Prompt( "creating middleware for dependency service" );

		middleware.use( methodOverride( ) );
		middleware.use( compression( { "level": 9 } ) );
		middleware.use( helmet( ) );

		ssbolt( middleware );
	}

	middleware.use( function serveDependency( request, response, next ){
		//: If this is not a get request pass it to other middleware.
		if( request.method != "GET" ){
			next( );

			return;
		}

		let pathURL = request.originalUrl;

		let pathURLToken = pathURL.split( "/" )
			.filter( function onEachToken( token ){
				return !!token;
			} );

		let mainPath = pathURLToken[ 0 ];

		//: Confirm if we will be proceeding.
		if( !( new RegExp( mainPath + "$" ) ).test( basePath ) ){
			next( );

			return;
		}

		let moduleName = pathURLToken[ 1 ];
		let fileName = pathURLToken[ 2 ];
		if( !moduleName ){
			Issue( "no module name given", pathURL, request.query )
				.silence( )
				.prompt( )
				.send( response );

			return;
		}

		if( !fileName ){
			Issue( "no file given", pathURL, request.query )
				.silence( )
				.prompt( )
				.send( response );

			return;
		}

		let pointer = "";
		if( request.query.pointer ){
			pointer = lilfy.revert( request.query.pointer );
		}
		let version = request.query.version;

		if( falze( pointer ) && moduleName in kirov.module ){
			Prompt( "serving dependency module from cache", moduleName );

			let module = kirov.module[ moduleName ];

			response
				.status( 200 )
				.set( {
					"Content-Type": [
							module.mimeType,
							"charset=utf-8"
						].join( ";" ),

					"Content-Disposition": [
							"attachment",
							"filename=@file".replace( "@file", module.file )
						].join( ";" )
				} )
				.send( new Buffer( module.content ) );

			return;
		}

		async.waterfall( [
			function getBowerModuleList( callback ){
				callback = called( callback );

				gnaw( "bower list --paths --json" )
					( function onExecute( error, result ){
						if( error ){
							Issue( "getting bower module list", error )
								.pass( callback, null );

						}else if( result ){
							try{
								let moduleList = JSON.parse( result );

								callback( null, moduleList );

							}catch( error ){
								Issue( "parsing module list", error )
									.pass( callback, null );
							}

						}else{
							callback( Uncertain( "empty command result" ), null );
						}
					} );
			},

			function findModule( moduleList, callback ){
				callback = called( callback );

				if( moduleName in moduleList ){
					callback( null, moduleList[ moduleName ] );

				}else{
					Prompt( "installing dependency module", moduleName );

					gnaw( "bower install @module --save -p --config.interactive=false"
							.replace( "@module", moduleName ),
						"echo xxx",
						"bower list --paths --json" )
						( function onExecute( error, result ){
							if( result ){
								result = result.split( "xxx" )[ 1 ];
							}

							if( error ){
								callback( Issue( "installing and getting module list" )
									.remind( error ), null );

							}else if( result ){
								try{
									moduleList = JSON.parse( result );

									if( moduleName in moduleList ){
										Prompt( "dependency module", moduleName, "installed" );

										callback( null, moduleList[ moduleName ] );

									}else{
										callback( Issue( "module cannot be installed" ), null );
									}

								}catch( error ){
									callback( Issue( "parsing module list", error ), null );
								}

							}else{
								callback( Uncertain( "empty command result" ), null );
							}
						} );
				}
			},

			function compareFile( modulePath, callback ){
				callback = called( callback );

				let pattern = ( new RegExp( ( fileName + "$" ).replace( /\./g, "\." ) ) );

				if( doubt( modulePath ).ARRAY ){
					modulePath = modulePath
						.filter( function onEachModule( _modulePath ){
							return pattern.test( modulePath );
						} )[ 0 ];
				}

				if( modulePath && pattern.test( modulePath ) ){
					modulePath = path.resolve( directory, modulePath );

					callback( null, modulePath );

				}else if( pointer && !modulePath ){
					if( !( /bower_components/ ).test( pointer ) ){
						modulePath = path.resolve( directory, "bower_components", pointer, fileName );

					}else{
						modulePath = path.resolve( directory, pointer, fileName );
					}

					Prompt( "getting dependency module from specific path", moduleName, modulePath );

					callback( null, modulePath );

				}else{
					callback( Uncertain( "cannot determine module path" ), null );
				}
			},

			function getModule( modulePath, callback ){
				callback = called( callback );

				if( pointer &&
					modulePath in kirov.module )
				{
					callback( null, kirov.module[ modulePath ] );

					return;
				}

				if( !version &&
					!pointer &&
					moduleName in kirov.module )
				{
					callback( null, kirov.module[ moduleName ] );

					return;
				}

				Prompt( "reading dependency module file", moduleName );

				lire( modulePath )
					( function onRead( error, moduleContent ){
						if( error ){
							callback( Issue( "reading module", error, modulePath ), null );

						}else if( moduleContent ){
							Prompt( "dependency module content loaded", moduleName );

							callback( null, {
								"name": moduleName,
								"path": modulePath,
								"content": moduleContent,
								"version": version,
								"pointer": pointer,
								"file": fileName
							} );

						}else{
							callback( Uncertain( "module empty", modulePath ), null );
						}
					} );
			},

			function sendModule( module, callback ){
				callback = called( callback );

				let mimeType = mime.lookup( module.file );

				if( !mimeType ){
					callback( Uncertain( "unknown mime type", module.file ), null );

					return;
				}

				module.mimeType = mimeType;

				let handler = called( function onResponse( ){ callback( null, module ) } );

				response.once( "close", handler );
				response.once( "finish", handler );

				response
					.status( 200 )
					.set( {
						"Content-Type": [
								mimeType,
								"charset=utf-8"
							].join( ";" ),

						"Content-Disposition": [
								"attachment",
								"filename=@file".replace( "@file", module.file )
							].join( ";" )
					} )
					.send( new Buffer( module.content ) );
			}
		],
			function lastly( issue, module ){
				if( issue ){
					issue
						.remind( "failed processing module" )
						.silence( )
						.prompt( )
						.send( response );

				}else{
					//: Cache the module.
					if( pointer ){
						kirov.module[ module.path ] = module;

					}else{
						kirov.module[ module.name ] = module;
					}
				}
			} );
	} );

	Prompt( "dependency service configured" )
		.remind( "load dependency with base path", basePath );

	return middleware;
};

harden( "module", kirov.module || { }, kirov );

module.exports = kirov;
