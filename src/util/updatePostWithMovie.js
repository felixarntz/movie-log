/**
 * External dependencies
 */
import { uniqBy } from 'lodash';

/**
 * WordPress dependencies
 */
import { date } from '@wordpress/date';

/**
 * Internal dependencies
 */
import findOrCreateTerm from './findOrCreateTerm';

export default function updatePostWithMovie( data, editPost, genreTaxonomy, meta = {} ) {
	const { imdbID, Released, Title, Genre } = data;

	const uniqueTerms = uniqBy(
		Genre.split( ', ' ).map( ( elem ) => elem.trim() ), 
		( term ) => term.toLowerCase()
	);

	return Promise
		.all( uniqueTerms.map( ( termName ) => {
			return findOrCreateTerm( termName, genreTaxonomy );
		} ) )
		.then( ( newTerms ) => {
			return editPost( {
				title: Title,
				[ genreTaxonomy.rest_base ]: newTerms.map( ( term ) => term.id ),
				meta: {
					...meta,
					imdb_id: imdbID,
					imdb_release_date: date( 'Y-m-d', Released ),
				},
			} );
		} );
}
