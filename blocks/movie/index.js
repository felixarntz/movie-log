import './style.scss';

const { Component, Fragment } = wp.element;
const {
	PanelBody,
	Button,
	TextControl,
	Disabled,
	ServerSideRender,
	Placeholder,
	Spinner,
} = wp.components;
const {
	InspectorControls,
} = wp.editor;
const {
	apiFetch,
} = wp;
const {
	addQueryArgs,
} = wp.url;
const {
	withSelect,
	withDispatch,
} = wp.data;
const {
	compose,
} = wp.compose;
const {
	date,
} = wp.date;
const { __, _x } = wp.i18n;
const {
	find,
	get,
	map,
	uniqBy,
} = lodash;

const DEFAULT_QUERY = {
	per_page: -1,
	orderby: 'count',
	order: 'desc',
	_fields: 'id,name',
};
const isSameTermName = ( termA, termB ) => termA.toLowerCase() === termB.toLowerCase();
const unescapeTerm = ( term ) => {
	return {
		...term,
		name: lodash.unescape( term.name ),
	};
};
const unescapeTerms = ( terms ) => {
	return map( terms, unescapeTerm );
};

class MovieEdit extends Component {
	constructor() {
		super( ...arguments );

		this.state = {
			isLoading: false,
			searchTerm: undefined,
		};

		this.reset            = this.reset.bind( this );
		this.isImdbId         = this.isImdbId.bind( this );
		this.onInputChange    = this.onInputChange.bind( this );
		this.onButtonClick    = this.onButtonClick.bind( this );
		this.updateTerms      = this.updateTerms.bind( this );
		this.findOrCreateTerm = this.findOrCreateTerm.bind( this );
	}

	componentDidMount() {
		this.isStillMounted = true;
	}

	componentWillUnmount() {
		this.isStillMounted = false;
	}

	reset() {
		this.setState( {
			isLoading: false,
			searchTerm: undefined,
		} );
	}

	isImdbId( searchTerm ) {
		if ( ( searchTerm || this.state.searchTerm ).match( /^tt\d+$/ ) ) {
			return true;
		}
		return false;
	}

	onInputChange( value ) {
		this.setState( {
			searchTerm: value,
		} );
	}

	onButtonClick() {
		if ( ! this.isStillMounted ) {
			return;
		}

		if ( this.state.isLoading ) {
			return;
		}

		this.setState( {
			isLoading: true,
		} );

		const search   = this.state.searchTerm;
		const endpoint = '/movie-log/v1/imdb-proxy' + ( this.isImdbId( search ) ? `/${ search }` : '' );
		const args     = this.isImdbId( search ) ? {} : { search };

		const fetchRequest = this.currentFetchRequest = apiFetch( {
			path: addQueryArgs( endpoint, args ),
		} )
			.then( ( data ) => {
				if ( ! this.isStillMounted || fetchRequest !== this.currentFetchRequest ) {
					return;
				}

				if ( ! this.isImdbId( search ) ) {
					if ( ! data.length ) {
						this.reset();
						return;
					}
					data = data[0];
				}

				const { setAttributes, setPostTitle, setPostGenreTerms, canCreateGenreTerms, canAssignGenreTerms, genreTaxonomy } = this.props;
				const { imdbID, Released, Title, Genre } = data;

				setAttributes( {
					imdbId: imdbID,
					imdbReleaseDate: date( 'Y-m-d', Released ),
				} );
				setPostTitle( Title );
				if ( canCreateGenreTerms && canAssignGenreTerms ) {
					this.updateTerms(
						Genre.split( ', ' ).map( elem => elem.trim() ),
						genreTaxonomy,
						setPostGenreTerms
					);
				}

				this.reset();
			} )
			.catch( () => {
				if ( ! this.isStillMounted || fetchRequest !== this.currentFetchRequest ) {
					return;
				}

				this.reset();
			} );
	}

	updateTerms( termNames, taxonomy, setTerms ) {
		const uniqueTerms = uniqBy( termNames, ( term ) => term.toLowerCase() );
		const findOrCreateTerm = ( termName ) => {
			return this.findOrCreateTerm( termName, taxonomy );
		};

		Promise
			.all( uniqueTerms.map( findOrCreateTerm ) )
			.then( ( newTerms ) => {
				return setTerms(
					map( newTerms, ( term ) => term.id ),
					taxonomy.rest_base
				);
			} );
	}

	findOrCreateTerm( termName, taxonomy ) {
		const termNameEscaped = lodash.escape( termName );
		// Tries to create a term or fetch it if it already exists.
		return apiFetch( {
			path: `/wp/v2/${ taxonomy.rest_base }`,
			method: 'POST',
			data: { name: termNameEscaped },
		} ).catch( ( error ) => {
			const errorCode = error.code;
			if ( errorCode === 'term_exists' ) {
				// If the terms exist, fetch it instead of creating a new one.
				this.addRequest = apiFetch( {
					path: addQueryArgs( `/wp/v2/${ taxonomy.rest_base }`, { ...DEFAULT_QUERY, search: termNameEscaped } ),
				} ).then( unescapeTerms );
				return this.addRequest.then( ( searchResult ) => {
					return find( searchResult, ( result ) => isSameTermName( result.name, termName ) );
				} );
			}
			return Promise.reject( error );
		} ).then( unescapeTerm );
	}

	render() {
		const { attributes } = this.props;
		const { imdbId } = attributes;

		if ( ! this.state.searchTerm && imdbId ) {
			this.setState( {
				searchTerm: imdbId,
			} );
		}

		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Movie Settings', 'movie-log' ) }>
						<TextControl
							label={ __( 'IMDB ID / Search Term', 'movie-log' ) }
							value={ this.state.searchTerm || imdbId }
							onChange={ this.onInputChange }
						/>
						<Button
							isDefault
							onClick={ this.onButtonClick }
							disabled={ this.state.isLoading }
						>
							{ __( 'Update', 'movie-log' ) }
						</Button>
						{ this.state.isLoading && <Spinner /> }
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
	edit: compose(
		withSelect( ( select ) => {
			const { getCurrentPost } = select( 'core/editor' );
			const { getTaxonomy } = select( 'core' );
			const taxonomy = getTaxonomy( window.movieLogSettings.genreTaxonomy );
			return {
				canCreateGenreTerms: taxonomy ? get( getCurrentPost(), [ '_links', 'wp:action-create-' + taxonomy.rest_base ], false ) : false,
				canAssignGenreTerms: taxonomy ? get( getCurrentPost(), [ '_links', 'wp:action-assign-' + taxonomy.rest_base ], false ) : false,
				genreTaxonomy: taxonomy,
			};
		} ),
		withDispatch( ( dispatch ) => {
			return {
				setPostTitle( title ) {
					dispatch( 'core/editor' ).editPost( { title } );
				},
				setPostGenreTerms( terms, restBase ) {
					dispatch( 'core/editor' ).editPost( { [ restBase ]: terms } );
				},
			};
		} )
	)( MovieEdit ),
	save: () => {
		return null;
	},
};

export default { name, settings };
