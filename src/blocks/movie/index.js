/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	PanelBody,
	Button,
	TextControl,
	Disabled,
	ServerSideRender,
	Placeholder,
	Spinner,
} from '@wordpress/components';
import {
	InspectorControls,
} from '@wordpress/editor';
import {
	useSelect,
	useDispatch,
} from '@wordpress/data';
import {
	Fragment,
	useState,
	useEffect,
} from '@wordpress/element';
import { date } from '@wordpress/date';
import { __, _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import getMovieData from '../../util/getMovieData';
import updatePostWithMovie from '../../util/updatePostWithMovie';
import './style.scss';

function MovieEdit( props ) {
	const { attributes, setAttributes } = props;
	const { imdbId } = attributes;

	const post = useSelect( ( select ) => select( 'core/editor' ).getCurrentPost() );
	const postMeta = useSelect( ( select ) => select( 'core/editor' ).getEditedPostAttribute( 'meta' ) );
	const genreTaxonomy = useSelect( ( select ) => select( 'core' ).getTaxonomy( window.movieLogSettings.genreTaxonomy ) );

	const canCreateGenreTerms = genreTaxonomy ? get( post, [ '_links', 'wp:action-create-' + genreTaxonomy.rest_base ], false ) : false;
	const canAssignGenreTerms = genreTaxonomy ? get( post, [ '_links', 'wp:action-assign-' + genreTaxonomy.rest_base ], false ) : false;

	const [ searchTerm, setSearchTerm ] = useState( undefined );
	const [ isLoading, setIsLoading ] = useState( false );

	const { editPost } = useDispatch( 'core/editor' );

	const onButtonClick = async () => {
		if ( isLoading || ! searchTerm ) {
			return;
		}
		setIsLoading( true );
		try {
			const data = await getMovieData( searchTerm );
			setAttributes( {
				imdbId: data.imdbID,
				imdbReleaseDate: date( 'Y-m-d', data.Released ),
			} );
			setSearchTerm( undefined );
			setIsLoading( false );
		} catch ( error ) {
			setIsLoading( false );
			throw error;
		}
	};

	useEffect( () => {
		if ( ! imdbId || ! canCreateGenreTerms || ! canAssignGenreTerms ) {
			return;
		}
		( async () => {
			setIsLoading( true );
			try {
				const data = await getMovieData( imdbId );
				await updatePostWithMovie( data, editPost, genreTaxonomy, postMeta );
				setIsLoading( false );
			} catch ( error ) {
				setIsLoading( false );
				throw error;
			}
		} )();
	}, [ imdbId, canCreateGenreTerms, canAssignGenreTerms ] );

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
						isDefault
						onClick={ onButtonClick }
						disabled={ isLoading }
					>
						{ __( 'Update', 'movie-log' ) }
					</Button>
					{ isLoading && <Spinner /> }
				</PanelBody>
			</InspectorControls>
			{ ! imdbId && <Placeholder>
				{ __( 'Enter a movie title in the sidebar!', 'movie-log' ) }
			</Placeholder> }
			{ imdbId && <Disabled>
				<ServerSideRender
					block={ name }
					attributes={ attributes }
				/>
			</Disabled> }
		</Fragment>
	);
}

const name = 'movie-log/movie';

const settings = {
	title: __( 'Movie', 'movie-log' ),
	description: __( 'Display details about the movie you watched.', 'movie-log' ),
	category: 'widgets',
	icon: 'video-alt',
	keywords: [
		_x( 'movie', 'keyword', 'movie-log' ),
	],
	supports: {
		className: false,
		customClassName: false,
		html: false,
	},
	attributes: {
		imdbId: {
			type: 'string',
			source: 'meta',
			meta: 'imdb_id',
		},
		imdbReleaseDate: {
			type: 'string',
			source: 'meta',
			meta: 'imdb_release_date',
		},
	},
	edit: MovieEdit,
	save: () => {
		return null;
	},
};

export default { name, settings };
