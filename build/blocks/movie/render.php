<?php

// Server-side blocks don't work with metadata (Gutenberg bug).
if ( empty( $attributes['imdbId'] ) && ! empty( $GLOBALS['post'] ) ) {
	$attributes['imdbId'] = get_post_meta( $GLOBALS['post']->ID, 'imdb_id', true );
}
if ( empty( $attributes['imdbReleaseDate'] ) && ! empty( $GLOBALS['post'] ) ) {
	$attributes['imdbReleaseDate'] = get_post_meta( $GLOBALS['post']->ID, 'imdb_release_date', true );
}

if ( empty( $attributes['imdbId'] ) ) {
	echo '<div>' . __( 'Missing IMDB ID.', 'movie-log' ) . '</div>';
	return;
}

$data = Felix_Arntz\Movie_Log\get_movie_data( $attributes['imdbId'] );
if ( ! $data ) {
	echo '<div>' . __( 'Invalid IMDB ID.', 'movie-log' ) . '</div>';
	return;
}

// phpcs:disable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
$poster_url = add_query_arg(
	array(
		'apikey' => MOVIE_LOG_IMDB_API_KEY,
		'i'      => $data->imdbID,
	),
	'https://img.omdbapi.com/'
);
$poster_alt = sprintf(
	/* translators: %s: movie title */
	__( 'Poster for &#8220;%s&#8221;', 'movie-log' ),
	$data->Title
);

$table_data = array(
	array(
		'label' => esc_html__( 'Genre', 'movie-log' ),
		'value' => esc_html( $data->Genre ),
	),
	array(
		'label' => esc_html__( 'Director', 'movie-log' ),
		'value' => esc_html( $data->Director ),
	),
	array(
		'label' => esc_html__( 'Released', 'movie-log' ),
		'value' => esc_html( ! empty( $attributes['imdbReleaseDate'] ) ? date_i18n( get_option( 'date_format' ), strtotime( $attributes['imdbReleaseDate'] ) ) : $data->Year ),
	),
	array(
		'label' => esc_html__( 'Runtime', 'movie-log' ),
		'value' => esc_html( sprintf( __( '%s min.', 'movie-log' ), preg_replace( '/[^0-9]/', '', $data->Runtime ) ) ),
	),
	array(
		'label' => esc_html__( 'Plot', 'movie-log' ),
		'value' => esc_html( $data->Plot ),
	),
);

if ( ! empty( $GLOBALS['post'] ) ) {
	$terms = wp_get_post_terms( $GLOBALS['post']->ID, MOVIE_LOG_GENRE_TAXONOMY );
	if ( ! empty( $terms ) ) {
		$terms = array_map(
			function ( $term ) {
				return '<a href="' . esc_url( get_term_link( $term, MOVIE_LOG_GENRE_TAXONOMY ) ) . '">' . esc_html( $term->name ) . '</a>';
			},
			$terms
		);
		$table_data[0]['value'] = implode( ', ', $terms );
	}
}

?>
<div class="movie-log-entry">
	<div class="movie-log-entry-poster">
		<a href="<?php echo esc_url( 'https://www.imdb.com/title/' . $data->imdbID . '/' ); ?>" target="_blank">
			<img src="<?php echo esc_url( $poster_url ); ?>" alt="<?php echo esc_attr( $poster_alt ); ?>" width="202" height="300">
		</a>
	</div>
	<div class="movie-log-entry-info">
		<table>
			<tbody>
				<?php
				foreach ( $table_data as $dataset ) {
					?>
					<tr>
						<th scope="row"><?php echo $dataset['label']; ?></th>
						<td><?php echo $dataset['value']; ?></td>
					</tr>
					<?php
				}
				?>
			</tbody>
		</table>
	</div>
</div>
<?php
