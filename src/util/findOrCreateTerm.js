/**
 * External dependencies
 */
import {
	escape,
	unescape,
} from 'lodash';

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export default async function findOrCreateTerm( termName, taxonomy, { signal } = {} ) {
	const termNameEscaped = escape( termName );

	// Tries to create a term or fetch it if it already exists.
	try {
		const newTerm = await apiFetch( {
			path: `/wp/v2/${ taxonomy.rest_base }`,
			method: 'POST',
			data: { name: termNameEscaped },
			signal,
		} );
		return unescapeTerm( newTerm );
	} catch ( error ) {
		if ( error?.code === 'term_exists' ) {
			// If the terms exist, fetch it instead of creating a new one.
			const searchResult = await apiFetch( {
				path: addQueryArgs( `/wp/v2/${ taxonomy.rest_base }`, {
					per_page: -1,
					orderby: 'count',
					order: 'desc',
					_fields: 'id,name',
					search: termNameEscaped,
				} ),
				signal,
			} );
			return searchResult.map( unescapeTerm ).find( ( result ) => result.name.toLowerCase() === termName.toLowerCase() );
		}
		throw error;
	}
}

function unescapeTerm( term ) {
	if ( ! term ) {
		return term;
	}
	return {
		...term,
		name: unescape( term.name ),
	};
};
