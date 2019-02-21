<?php
/**
 * Plugin initialization file
 *
 * @package Felix_Arntz\Movie_Log;
 * @since 1.0.0
 *
 * @wordpress-plugin
 * Plugin Name: Movie Log
 * Plugin URI:  https://movies.felix-arntz.me
 * Description: Log the movies your watch in WordPress, using IMDB.
 * Version:     1.0.0
 * Author:      Felix Arntz
 * Author URI:  https://felix-arntz.me
 * License:     GNU General Public License v2 (or later)
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: movie-log
 * Tags:        movies, logs, gutenberg, blocks
 */

namespace Felix_Arntz\Movie_Log;

if ( ! defined( 'MOVIE_LOG_POST_TYPE' ) ) {
	define( 'MOVIE_LOG_POST_TYPE', 'post' );
}
if ( ! defined( 'MOVIE_LOG_GENRE_TAXONOMY' ) ) {
	define( 'MOVIE_LOG_GENRE_TAXONOMY', 'category' );
}

/**
 * Initializes the block editor by loading the respective assets and registering metadata.
 *
 * @since 1.0.0
 */
function register_blocks() {
	if ( ! function_exists( 'register_block_type' ) ) {
		return;
	}

	if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
		add_action( 'admin_notices', __NAMESPACE__ . '\\missing_api_key_notice' );
		return;
	}

	// Register server-side block types.
	foreach ( glob( plugin_dir_path( __FILE__ ) . 'blocks/*/index.php' ) as $block_type_file ) {
		$block_type = require $block_type_file;

		register_block_type( $block_type['name'], $block_type['settings'] );
	}

	// Register block assets.
	$assets_url = plugin_dir_url( __FILE__ ) . 'build/';

	wp_register_script(
		'movie-log-blocks',
		$assets_url . 'blocks.js',
		array(
			'wp-i18n',
			'wp-api-fetch',
			'wp-compose',
			'wp-url',
			'wp-blocks',
			'wp-data',
			'wp-element',
			'wp-components',
		),
		'1.0.0',
		true
	);
	wp_set_script_translations( 'movie-log-blocks', 'movie-log' );
	$options = array(
		'postType'      => MOVIE_LOG_POST_TYPE,
		'genreTaxonomy' => MOVIE_LOG_GENRE_TAXONOMY,
	);
	wp_add_inline_script( 'movie-log-blocks', 'var movieLogSettings = ' . wp_json_encode( $options ) . ';', 'before' );

	wp_register_style(
		'movie-log-blocks',
		$assets_url . 'blocks.css',
		array(),
		'1.0.0'
	);

	// Enqueue block assets.
	add_action(
		'enqueue_block_editor_assets',
		function() {
			wp_enqueue_script( 'movie-log-blocks' );
			wp_enqueue_style( 'movie-log-blocks' );
		}
	);

	add_action(
		'enqueue_block_assets',
		function() {
			wp_enqueue_style( 'movie-log-blocks' );
		}
	);
}
add_action( 'init', __NAMESPACE__ . '\\register_blocks', 100 );

/**
 * Modifies the block template of the movie log post type.
 *
 * @since 1.0.0
 */
function modify_post_type_block_template() {
	if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
		return;
	}

	$post_type = get_post_type_object( MOVIE_LOG_POST_TYPE );
	if ( ! $post_type ) {
		return;
	}

	$post_type->template      = array(
        array( 'movie-log/movie', array() ),
    );
    $post_type->template_lock = 'all';
}
add_action( 'init', __NAMESPACE__ . '\\modify_post_type_block_template' );

/**
 * Registers metadata for the REST API.
 *
 * @since 1.0.0
 */
function register_metadata() {
	if ( ! function_exists( 'register_post_meta' ) ) {
		return;
	}

	if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
		return;
	}

	register_post_meta(
		MOVIE_LOG_POST_TYPE,
		'imdb_id',
		array(
			'type'         => 'string',
			'description'  => __( 'Associated movie IMDB ID.', 'movie-log' ),
			'single'       => true,
			'show_in_rest' => true,
		)
	);

	register_post_meta(
		MOVIE_LOG_POST_TYPE,
		'imdb_release_date',
		array(
			'type'         => 'string',
			'description'  => __( 'Associated movie release date, in YYYY-mm-dd format.', 'movie-log' ),
			'single'       => true,
			'show_in_rest' => true,
		)
	);
}
add_action( 'init', __NAMESPACE__ . '\\register_metadata' );

/**
 * Registers a proxy endpoint for the IMDB API.
 *
 * @since 1.0.0
 */
function register_rest_proxy() {
	if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
		return;
	}

	register_rest_route(
		'movie-log/v1',
		'/imdb-proxy',
		array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => function( \WP_REST_Request $request ) {
					if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
						return new \WP_Error( 'missing_api_key', __( 'Missing IMDB API key.', 'movie-log' ), array( 'status' => 500 ) );
					}

					if ( ! isset( $request['search'] ) ) {
						return new \WP_Error( 'missing_search_input', __( 'Missing search input.', 'movie-log' ), array( 'status' => 400 ) );
					}

					$url = add_query_arg(
						array(
							'apikey' => MOVIE_LOG_IMDB_API_KEY,
							't'      => $request['search'],
						),
						'https://www.omdbapi.com/'
					);

					$response = wp_remote_get( $url );
					if ( is_wp_error( $response ) ) {
						return new \WP_Error( 'request_failed', __( 'IMDB request failed.', 'movie-log' ), array( 'status' => 500 ) );
					}

					$response = json_decode( wp_remote_retrieve_body( $response ) );
					if ( ! is_object( $response ) || ! isset( $response->Response ) || ! $response->Response ) {
						return rest_ensure_response( array() );
					}

					unset( $response->Response );

					return rest_ensure_response( array( $response ) );
				},
				'permission_callback' => function() {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'search'   => array(
						'required'          => true,
						'description'       => __( 'Limit results to those matching a string.', 'movie-log' ),
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
			),
		)
	);

	register_rest_route(
		'movie-log/v1',
		'/imdb-proxy/(?P<id>[\w-]+)',
		array(
			'args'   => array(
				'id' => array(
					'description' => __( 'Unique IMDB ID of the movie.', 'movie-log' ),
					'type'        => 'string',
				),
			),
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => function( \WP_REST_Request $request ) {
					if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
						return new \WP_Error( 'missing_api_key', __( 'Missing IMDB API key.', 'movie-log' ), array( 'status' => 500 ) );
					}

					$url = add_query_arg(
						array(
							'apikey' => MOVIE_LOG_IMDB_API_KEY,
							'i'      => $request['id'],
						),
						'https://www.omdbapi.com/'
					);

					$response = wp_remote_get( $url );
					if ( is_wp_error( $response ) ) {
						return new \WP_Error( 'request_failed', __( 'IMDB request failed.', 'movie-log' ), array( 'status' => 500 ) );
					}

					$response = json_decode( wp_remote_retrieve_body( $response ) );
					if ( ! is_object( $response ) || ! isset( $response->Response ) || ! $response->Response ) {
						return new \WP_Error( 'not_found', __( 'No movie found for the given IMDB ID.', 'movie-log' ), array( 'status' => 404 ) );
					}

					unset( $response->Response );

					return rest_ensure_response( $response );
				},
				'permission_callback' => function() {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(),
			),
		)
	);
}
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_proxy' );

/**
 * Registers the Most Watched Movies widget.
 *
 * @since 1.0.0
 */
function register_widget() {
	if ( ! defined( 'MOVIE_LOG_IMDB_API_KEY' ) ) {
		return;
	}

	require_once plugin_dir_path( __FILE__ ) . 'class-most-watched-movies-widget.php';

	\register_widget( Most_Watched_Movies_Widget::class );
}
add_action( 'widgets_init', __NAMESPACE__ . '\\register_widget' );

/**
 * Gets data for the movie identified by the given IMDB ID.
 *
 * @since 1.0.0
 *
 * @param string $imdb_id Unique IMDB ID.
 * @return object|null IMDB data object, or null if not found.
 */
function get_movie_data( $imdb_id ) {
	if ( empty( $imdb_id ) || ! preg_match( '/^tt\d+$/', $imdb_id ) ) {
		return null;
	}

	$data = get_transient( 'movie_log_imdb_' . $imdb_id );
	if ( false === $data ) {
		// Run an internal REST API request.
		$request  = new \WP_REST_Request( 'GET', '/movie-log/v1/imdb-proxy/' . $imdb_id );
		$response = rest_do_request( $request );
		if ( $response->is_error() ) {
			return null;
		}
		$data = rest_get_server()->response_to_data( $response, false );

		set_transient( 'movie_log_imdb_' . $imdb_id, $data, 4 * WEEK_IN_SECONDS );
	}

	return $data;
}

/**
 * Queries most watched movies.
 *
 * @since 1.0.0
 *
 * @param int $number Optional. Maximum number of movies to return. Default 5.
 * @return array List of objects with 'imdb_id', 'latest_post_id', and 'watch_count' keys.
 */
function query_most_watched_movies( $number = 5 ) {
	global $wpdb;

	$movies = get_transient( 'movie_log_most_watched_imdb_ids' );
	if ( false === $movies ) {
		$query = "SELECT meta_value, MAX( post_id ) AS latest_post_id, COUNT( * ) AS watch_count FROM {$wpdb->postmeta} WHERE meta_key = 'imdb_id' GROUP BY meta_value ORDER BY watch_count DESC, latest_post_id DESC LIMIT 20";

		$results = (array) $wpdb->get_results( $query );

		$movies = array();
		foreach ( $results as $result ) {
			$movies[] = (object) array(
				'imdb_id'        => $result->meta_value,
				'latest_post_id' => (int) $result->latest_post_id,
				'watch_count'    => (int) $result->watch_count,
			);
		}

		set_transient( 'movie_log_most_watched_imdb_ids', $movies, 2 * WEEK_IN_SECONDS );
	}

	if ( $number < count( $movies ) ) {
		return array_slice( $movies, 0, $number );
	}

	return $movies;
}

/**
 * Clears the transient for most watched movies on post save.
 *
 * @since 1.0.0
 *
 * @param int      $post_id Post ID.
 * @param \WP_Post $post    Post object.
 */
function clear_most_watched_movies_transient( $post_id, $post ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( wp_is_post_revision( $post ) ) {
		return;
	}

	if ( MOVIE_LOG_POST_TYPE !== $post->post_type ) {
		return;
	}

	delete_transient( 'movie_log_most_watched_imdb_ids' );
}
add_action( 'save_post', __NAMESPACE__ . '\\clear_most_watched_movies_transient', 10, 2 );

/**
 * Shows a notice when the `MOVIE_LOG_IMDB_API_KEY` constant is not defined.
 *
 * @since 1.0.0
 */
function missing_api_key_notice() {
	?>
	<div class="notice notice-error">
		<p>
			<?php
			printf(
				/* translators: %s: constant name */
				esc_html__( 'The constant %s required for the Movie Log plugin is not defined.', 'movie-log' ),
				'<code>MOVIE_LOG_IMDB_API_KEY</code>'
			);
			?>
		</p>
	</div>
	<?php
}
