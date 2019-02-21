# Movie Log

Log the movies your watch in WordPress, using IMDB.

* Registers a `movie-log/movie` block type that allows you to search for a movie title or enter an IMDB ID.
* Connects to the [OMDB API](http://omdbapi.com/) to fetch IMDB movie information.
* Registers a widget displaying a list of your most watched movies.
* Ties in with an existing post type and taxonomy (built-in or implemented elsewhere) to essentially make that post type a "Movie Log" post type and that taxonomy a "Genre" taxonomy. By default it uses the `post` post type and the `category` taxonomy, which is suitable if your entire site _is_ the movie log. The post type and taxonomy to highjack are configurable though.

## Disclaimer

This is a heavily custom plugin I built for [my personal movie log](https://movies.felix-arntz.me). I don't intend to support it other than for personal reasons (and of course if you find bugs, I'm more than happy to see issues being opened). Most importantly, use the plugin at your own risk.

## Requirements

* This is a heavily procedural plugin that uses closures, variable inheritance from parent scope, and a namespace, so it requires at least PHP 5.6. I'm not gonna say I'm never going to add more modern features to it, so [you should probably use the latest PHP version available](https://wordpress.org/support/update-php/).
* This requires Gutenberg, so a minimum of WordPress 5.0.

## Setup

* Run `npm install` and `npm run build` after downloading the plugin or pulling the latest version from GitHub.
* Obtain an OMDB API key and set it in a `MOVIE_LOG_IMDB_API_KEY` constant.
* Optional steps:
    * Define a `MOVIE_LOG_POST_TYPE` constant with the post type the plugin should use. For that post type, it will automatically set a block template and tie in with it in various other ways. The default value for the constant is `post`.
    * Define a `MOVIE_LOG_GENRE_TAXONOMY` constant with the taxonomy the plugin should use for genres. The taxonomy provided must be connected to the post type set via `MOVIE_LOG_POST_TYPE`. The default value for the constant is `category`.

## Extra Credit

The Webpack configuration is based on [Zac Gordon's Gutenberg plugin setup](https://github.com/zgordon/advanced-gutenberg-course).
