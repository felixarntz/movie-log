import { createBlock } from '@wordpress/blocks';
import { select, dispatch } from '@wordpress/data';

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

			// Update post meta since the block requires it.
			const meta =
				select( 'core/editor' ).getEditedPostAttribute( 'meta' );
			dispatch( 'core/editor' ).editPost( {
				meta: {
					...meta,
					imdb_id: matches[ 1 ],
				},
			} );

			// Update or create the actual block.
			const blocks = select( 'core/block-editor' ).getBlocks();
			const clientId = blocks?.find(
				( block ) => block.name === 'movie-log/movie'
			)?.clientId;
			if ( clientId ) {
				const attributes =
					select( 'core/block-editor' ).getBlockAttributes(
						clientId
					) || {};
				dispatch( 'core/block-editor' ).updateBlockAttributes(
					clientId,
					{
						...attributes,
						imdbId: matches[ 1 ],
					}
				);
			} else {
				dispatch( 'core/block-editor' ).insertBlocks( [
					createBlock( 'movie-log/movie', {
						imdbId: matches[ 1 ],
					} ),
				] );
			}
			return true;
		},
		priority: 5,
	} );
}
