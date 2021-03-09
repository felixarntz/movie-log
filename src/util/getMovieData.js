/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const cache = {};

export default async function getMovieData( search, { signal } = {} ) {
	let endpoint, args;

	if ( isImdbID( search ) ) {
		if ( cache[ search ] ) {
			return cache[ search ];
		}
		endpoint = `/movie-log/v1/imdb-proxy/${ search }`;
		args = {};
	} else {
		endpoint = '/movie-log/v1/imdb-proxy';
		args = { search };
	}

	const data = await apiFetch( {
		path: addQueryArgs( endpoint, args ),
		signal,
	} )

	// If a search query, return the first result.
	if ( ! isImdbID( search ) ) {
		if ( ! data.length ) {
			throw { code: 'movie_not_found' };
		}
		setCache( data[ 0 ] );
		return data[ 0 ];
	}

	// Otherwise, the response IS the movie itself.
	setCache( data );
	return data;
}

function setCache( data ) {
	cache[ data.imdbID ] = data;
}

function isImdbID( search ) {
	return search && !! search.match( /^tt\d+$/ );
}
