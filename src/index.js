import { registerBlockType, createBlock } from '@wordpress/blocks';
import { dispatch } from '@wordpress/data';

import movie from './blocks/movie';

registerBlockType( movie.name, movie.settings );

// Register share handler to allow sharing IMDB entity directly to editor.
if ( global.wp.shareTarget && global.wp.shareTarget.registerShareHandler ) {
	const regex = /^https:\/\/www\.imdb\.com\/title\/(tt[A-Za-z0-9]+)/;
	global.wp.shareTarget.registerShareHandler( {
		handle: async ( { title, link, attachment } ) => {
			// Do not handle if a media file was uploaded, as it would not be an IMDB URL share.
			if ( attachment ) {
				return false;
			}

			// Check whether the URL is for an IMDB entity.
			let matches = link && link.match( regex );
			if ( ! matches ) {
				// Some older implementations used the title field to pass URLs, so try that as well.
				matches = title && title.match( regex );
				if ( ! matches ) {
					return false;
				}
			}

			dispatch( 'core/block-editor' ).insertBlocks( [
				createBlock( 'movie-log/movie', {
					imdbId: matches[ 1 ],
				} ),
			] );
			return true;
		},
		priority: 5,
	} );
}
