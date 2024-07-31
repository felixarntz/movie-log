/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import {
	PanelBody,
	Button,
	TextControl,
	Disabled,
	Placeholder,
	Spinner,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { Fragment, useState, useEffect } from '@wordpress/element';
import { date } from '@wordpress/date';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import getMovieData from '../../util/getMovieData';
import metadata from './block.json';
import './style.scss';

const DEFAULT_QUERY = {
	per_page: -1,
	orderby: 'name',
	order: 'asc',
	_fields: 'id,name',
	context: 'view',
};

const EMPTY_ARRAY = [];

function findTerm( terms, name ) {
	return terms.find( ( term ) => {
		return term.name.toLowerCase() === name.toLowerCase();
	} );
}

function hasTerms( postTerms, termIds ) {
	return termIds.every( ( termId ) => postTerms.includes( termId ) );
}

function MovieEdit( { attributes, setAttributes } ) {
	const taxonomySlug = window.movieLogSettings.genreTaxonomy;
	const { imdbId } = attributes;

	const {
		hasCreateAction,
		hasAssignAction,
		taxonomy,
		postTerms,
		availableTerms,
		loadingTerms,
		postTitle,
		postMeta,
	} = useSelect( ( select ) => {
		const { getCurrentPost, getEditedPostAttribute } =
			select( 'core/editor' );
		const { getTaxonomy, getEntityRecords, isResolving } = select( 'core' );
		const _taxonomy = getTaxonomy( taxonomySlug );
		const post = getCurrentPost();

		return {
			hasCreateAction: _taxonomy
				? post._links?.[ 'wp:action-create-' + _taxonomy.rest_base ] ??
				  false
				: false,
			hasAssignAction: _taxonomy
				? post._links?.[ 'wp:action-assign-' + _taxonomy.rest_base ] ??
				  false
				: false,
			taxonomy: _taxonomy,
			postTerms: _taxonomy
				? getEditedPostAttribute( _taxonomy.rest_base )
				: EMPTY_ARRAY,
			availableTerms:
				getEntityRecords( 'taxonomy', taxonomySlug, DEFAULT_QUERY ) ||
				EMPTY_ARRAY,
			loadingTerms: isResolving( 'getEntityRecords', [
				'taxonomy',
				taxonomySlug,
				DEFAULT_QUERY,
			] ),
			postTitle: getEditedPostAttribute( 'title' ),
			postMeta: getEditedPostAttribute( 'meta' ),
		};
	} );

	const [ searchTerm, setSearchTerm ] = useState( undefined );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ movieData, setMovieData ] = useState( undefined );

	const { editPost } = useDispatch( 'core/editor' );
	const { saveEntityRecord } = useDispatch( 'core' );

	const onButtonClick = async () => {
		if ( isLoading || loadingTerms || ! searchTerm ) {
			return;
		}

		const abortController = new global.AbortController();
		const signal = abortController.signal;

		setIsLoading( true );
		try {
			const data = await getMovieData( searchTerm, { signal } );
			setAttributes( {
				imdbId: data.imdbID,
				imdbReleaseDate: date( 'Y-m-d', data.Released ),
			} );
			setMovieData( data );
			setSearchTerm( undefined );
			setIsLoading( false );
		} catch ( error ) {
			setIsLoading( false );
			if ( ! signal.aborted ) {
				throw error;
			}
		}
	};

	// Effect to fetch movie data if needed.
	useEffect( () => {
		if ( ! imdbId ) {
			return;
		}

		if ( imdbId === movieData?.imdbID ) {
			return;
		}

		const abortController = new global.AbortController();
		const signal = abortController.signal;

		( async () => {
			setIsLoading( true );
			try {
				const data = await getMovieData( imdbId, { signal } );
				setMovieData( data );
				setIsLoading( false );
			} catch ( error ) {
				setIsLoading( false );
				if ( ! signal.aborted ) {
					throw error;
				}
			}
		} )();

		return () => {
			abortController.abort();
		};
	}, [ imdbId, movieData ] );

	// Effect to update post information with relevant movie data (after attribute was updated already).
	useEffect( () => {
		if (
			! imdbId ||
			! movieData ||
			! taxonomy ||
			! hasCreateAction ||
			! hasAssignAction ||
			isLoading ||
			loadingTerms
		) {
			return;
		}

		// Bail if movie data is out of sync with current IMDB ID.
		if ( imdbId !== movieData.imdbID ) {
			return;
		}

		const { imdbID, Released, Title, Genre } = movieData;

		// Create update data as needed.
		const editPostData = {};

		// Update meta if IMDB ID is different.
		if ( imdbID !== postMeta?.imdb_id ) {
			editPostData.meta = {
				...postMeta,
				imdb_id: imdbID,
				imdb_release_date: date( 'Y-m-d', Released ),
			};
		}

		// Update title if title is different.
		if ( Title !== postTitle ) {
			editPostData.title = Title;
		}

		// Update terms based on genres if terms are different, while creating new terms as needed.
		const genres = Genre.split( ', ' ).map( ( elem ) => elem.trim() );
		const termsMap = genres.reduce(
			( map, genre ) => {
				const term = findTerm( availableTerms, genre );
				if ( term ) {
					map.termIds = [ ...map.termIds, term.id ];
				} else {
					map.newTermGenres = [ ...map.newTermGenres, genre ];
				}
				return map;
			},
			{ newTermGenres: [], termIds: [] }
		);

		// If there are new terms to create, the rest of the effect has to be async.
		if ( termsMap.newTermGenres.length ) {
			const addTerm = ( term ) => {
				return saveEntityRecord( 'taxonomy', taxonomySlug, term, {
					throwOnError: true,
				} );
			};

			( async () => {
				for ( const newTermGenre of termsMap.newTermGenres ) {
					const newTerm = await addTerm( { name: newTermGenre } );
					termsMap.termIds.push( newTerm.id );
				}

				if ( genres.length !== termsMap.termIds.length ) {
					throw new Error(
						__( 'Failed to create all terms.', 'movie-log' )
					);
				}

				editPostData[ taxonomy.rest_base ] = termsMap.termIds;

				editPost( editPostData );
			} )();
		} else {
			// No new terms, so just update the post with the terms we have.
			if ( ! hasTerms( postTerms, termsMap.termIds ) ) {
				editPostData[ taxonomy.rest_base ] = termsMap.termIds;
			}

			if ( ! Object.keys( editPostData ).length ) {
				return;
			}

			editPost( editPostData );
		}
	}, [
		taxonomySlug,
		saveEntityRecord,
		imdbId,
		movieData,
		taxonomy,
		hasCreateAction,
		hasAssignAction,
		isLoading,
		loadingTerms,
		postTerms,
		availableTerms,
		editPost,
		postTitle,
		postMeta,
	] );

	return (
		<Fragment>
			<InspectorControls>
				<PanelBody title={ __( 'Movie Settings', 'movie-log' ) }>
					<TextControl
						label={ __( 'IMDB ID / Search Term', 'movie-log' ) }
						value={ searchTerm || imdbId }
						onChange={ setSearchTerm }
					/>
					<Button
						onClick={ onButtonClick }
						disabled={ isLoading || loadingTerms }
						variant="secondary"
					>
						{ __( 'Update', 'movie-log' ) }
					</Button>
					{ isLoading && <Spinner /> }
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps() }>
				{ ! imdbId && (
					<Placeholder>
						{ __(
							'Enter a movie title in the sidebar!',
							'movie-log'
						) }
					</Placeholder>
				) }
				{ imdbId && (
					<Disabled>
						<ServerSideRender
							block={ metadata.name }
							attributes={ attributes }
							skipBlockSupportAttributes
						/>
					</Disabled>
				) }
			</div>
		</Fragment>
	);
}

registerBlockType( metadata.name, {
	edit: MovieEdit,
} );
