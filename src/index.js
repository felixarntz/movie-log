import movie from './blocks/movie';

const { registerBlockType } = wp.blocks;

registerBlockType( movie.name, movie.settings );
