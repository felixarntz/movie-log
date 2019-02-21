<?php
/**
 * Most Watched Movies widget class
 *
 * @package Felix_Arntz\Movie_Log;
 * @since 1.0.0
 */

namespace Felix_Arntz\Movie_Log;

use WP_Widget;

/**
 * Class representing a widget that lists the most watched movies.
 *
 * @since 1.0.0
 */
class Most_Watched_Movies_Widget extends WP_Widget {

	/**
	 * Sets up a new Most Watched Movies widget instance.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		$widget_ops = array(
			'classname'                   => 'widget_most_watched_movies',
			'description'                 => __( 'Your most watched movies.', 'movie-log' ),
			'customize_selective_refresh' => true,
		);
		parent::__construct( 'most-watched-movies', __( 'Most Watched Movies', 'movie-log' ), $widget_ops );
		$this->alt_option_name = 'widget_most_watched_movies';
	}

	/**
	 * Outputs the content for the current Most Watched Movies widget instance.
	 *
	 * @since 1.0.0
	 *
	 * @param array $args     Display arguments including 'before_title', 'after_title',
	 *                        'before_widget', and 'after_widget'.
	 * @param array $instance Settings for the current Most Watched Movies widget instance.
	 */
	public function widget( $args, $instance ) {
		if ( ! isset( $args['widget_id'] ) ) {
			$args['widget_id'] = $this->id;
		}

		$title = ( ! empty( $instance['title'] ) ) ? $instance['title'] : __( 'Most Watched Movies' );

		/** This filter is documented in wp-includes/widgets/class-wp-widget-pages.php */
		$title = apply_filters( 'widget_title', $title, $instance, $this->id_base );

		$number = ( ! empty( $instance['number'] ) ) ? absint( $instance['number'] ) : 5;
		if ( ! $number ) {
			$number = 5;
		}

		$show_count = isset( $instance['show_count'] ) ? $instance['show_count'] : false;

		$movies = query_most_watched_movies( $number );
		if ( empty( $movies ) ) {
			return;
		}

		?>
		<?php echo $args['before_widget']; ?>
		<?php
		if ( $title ) {
			echo $args['before_title'] . $title . $args['after_title'];
		}
		?>
		<table>
			<thead>
				<tr>
					<th>#</th>
					<th><?php esc_html_e( 'Title', 'movie-log' ); ?></th>
					<?php
					if ( $show_count ) {
						?>
						<th><?php esc_html_e( 'Count', 'movie-log' ); ?></th>
						<?php
					}
					?>
				</tr>
			</thead>
			<tbody>
				<?php
				$counter = 0;
				foreach ( $movies as $movie ) {
					$counter++;
					?>
					<tr>
						<td><small><?php echo esc_html( $counter ); ?></small></td>
						<td><a href="<?php the_permalink( $movie->latest_post_id ); ?>"><?php echo get_the_title( $movie->latest_post_id ); ?></a></td>
						<?php
						if ( $show_count ) {
							?>
							<td><?php echo esc_html( $movie->watch_count ); ?></td>
							<?php
						}
						?>
					</tr>
					<?php
				}
				?>
			</tbody>
		</table>
		<?php
		echo $args['after_widget'];
	}

	/**
	 * Handles updating the settings for the current Most Watched Movies widget instance.
	 *
	 * @since 1.0.0
	 *
	 * @param array $new_instance New settings for this instance as input by the user via
	 *                            WP_Widget::form().
	 * @param array $old_instance Old settings for this instance.
	 * @return array Updated settings to save.
	 */
	public function update( $new_instance, $old_instance ) {
		$instance               = $old_instance;
		$instance['title']      = sanitize_text_field( $new_instance['title'] );
		$instance['number']     = (int) $new_instance['number'];
		$instance['show_count'] = isset( $new_instance['show_count'] ) ? (bool) $new_instance['show_count'] : false;
		return $instance;
	}

	/**
	 * Outputs the settings form for the Most Watched Movies widget.
	 *
	 * @since 1.0.0
	 *
	 * @param array $instance Current settings.
	 */
	public function form( $instance ) {
		$title      = isset( $instance['title'] ) ? esc_attr( $instance['title'] ) : '';
		$number     = isset( $instance['number'] ) ? absint( $instance['number'] ) : 5;
		$show_count = isset( $instance['show_count'] ) ? (bool) $instance['show_count'] : false;
		?>
		<p><label for="<?php echo $this->get_field_id( 'title' ); ?>"><?php _e( 'Title:', 'movie-log' ); ?></label>
		<input class="widefat" id="<?php echo $this->get_field_id( 'title' ); ?>" name="<?php echo $this->get_field_name( 'title' ); ?>" type="text" value="<?php echo $title; ?>" /></p>

		<p><label for="<?php echo $this->get_field_id( 'number' ); ?>"><?php _e( 'Number of movies to show:', 'movie-log' ); ?></label>
		<input class="tiny-text" id="<?php echo $this->get_field_id( 'number' ); ?>" name="<?php echo $this->get_field_name( 'number' ); ?>" type="number" step="1" min="1" max="20" value="<?php echo $number; ?>" size="3" /></p>

		<p><input class="checkbox" type="checkbox"<?php checked( $show_count ); ?> id="<?php echo $this->get_field_id( 'show_count' ); ?>" name="<?php echo $this->get_field_name( 'show_count' ); ?>" />
		<label for="<?php echo $this->get_field_id( 'show_count' ); ?>"><?php _e( 'Display watch count?', 'movie-log' ); ?></label></p>
		<?php
	}
}
