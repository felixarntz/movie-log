<?php
/**
 * Plugin initialization file
 *
 * @package Felix_Arntz\Movie_Log;
 * @since 1.0.0
 */

namespace Felix_Arntz\Movie_Log;

return array(
	'name'     => 'movie-log/movie',
	'settings' => array(
		'attributes'      => array(
			'imdbId'          => array(
				'type' => 'string',
			),
			'imdbReleaseDate' => array(
				'type' => 'string',
			),
		),
		'render_callback' => function( $attributes ) {
			// Server-side blocks don't work with metadata (Gutenberg bug).
			if ( empty( $attributes['imdbId'] ) && ! empty( $GLOBALS['post'] ) ) {
				$attributes['imdbId'] = get_post_meta( $GLOBALS['post']->ID, 'imdb_id', true );
			}
			if ( empty( $attributes['imdbReleaseDate'] ) && ! empty( $GLOBALS['post'] ) ) {
				$attributes['imdbReleaseDate'] = get_post_meta( $GLOBALS['post']->ID, 'imdb_release_date', true );
			}

			if ( empty( $attributes['imdbId'] ) ) {
				return '<div>' . __( 'Missing IMDB ID.', 'movie-log' ) . '</div>';
			}

			$data = get_movie_data( $attributes['imdbId'] );
			if ( ! $data ) {
				return '<div>' . __( 'Invalid IMDB ID.', 'movie-log' ) . '</div>';
			}

			$poster_url = add_query_arg(
				array(
					'apikey' => MOVIE_LOG_IMDB_API_KEY,
					'i'      => $data->imdbID,
				),
				'https://img.omdbapi.com/'
			);

			$table_data = array(
				array(
					'label' => __( 'Genre', 'movie-log' ),
					'value' => $data->Genre,
				),
				array(
					'label' => __( 'Director', 'movie-log' ),
					'value' => $data->Director,
				),
				array(
					'label' => __( 'Released', 'movie-log' ),
					'value' => ! empty( $attributes['imdbReleaseDate'] ) ? date_i18n( get_option( 'date_format' ), strtotime( $attributes['imdbReleaseDate'] ) ) : $data->Year,
				),
				array(
					'label' => __( 'Runtime', 'movie-log' ),
					'value' => sprintf( __( '%s min.', 'movie-log' ), preg_replace( '/[^0-9]/', '', $data->Runtime ) ),
				),
				array(
					'label' => __( 'Plot', 'movie-log' ),
					'value' => $data->Plot,
				),
			);

			if ( ! empty( $GLOBALS['post'] ) ) {
				$terms = wp_get_post_terms( $GLOBALS['post']->ID, MOVIE_LOG_GENRE_TAXONOMY );
				if ( ! empty( $terms ) ) {
					$terms = array_map(
						function( $term ) {
							return '<a href="' . esc_url( get_term_link( $term, MOVIE_LOG_GENRE_TAXONOMY ) ) . '">' . esc_html( $term->name ) . '</a>';
						},
						$terms
					);
					$table_data[0]['value'] = implode( ', ', $terms );
				}
			}

			$output = '<div class="movie-log-entry">';
			$output .= '<div class="movie-log-entry-poster">';
			$output .= '<a href="' . esc_url( 'https://www.imdb.com/title/' . $data->imdbID . '/' ) . '" target="_blank">';
			/* translators: %s: movie title */
			$output .= '<img src="' . esc_url( $poster_url ) . '" alt="' . esc_attr( sprintf( __( 'Poster for &#8220;%s&#8221;', 'movie-log' ), $data->Title ) ) . '" width="202" height="300">';
			$output .= '</a>';
			$output .= '</div>';
			$output .= '<div class="movie-log-entry-info">';
			$output .= '<table>';
			$output .= '<tbody>';
			foreach ( $table_data as $dataset ) {
				$output .= '<tr>';
				$output .= '<th scope="row">' . $dataset['label'] . '</th>';
				$output .= '<td>' . $dataset['value'] . '</td>';
				$output .= '</tr>';
			}
			$output .= '</tbody>';
			$output .= '</table>';
			$output .= '</div>';
			$output .= '</div>';

			return $output;
		},
	),
);
