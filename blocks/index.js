import movie from './movie';

const { registerBlockType } = wp.blocks;

registerBlockType( movie.name, movie.settings );
