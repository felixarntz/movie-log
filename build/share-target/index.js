(()=>{"use strict";var t={};t.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}();const e=window.wp.blocks,i=window.wp.data;if(t.g.wp.shareTarget&&t.g.wp.shareTarget.registerShareHandler){const r=/^https:\/\/www\.imdb\.com\/title\/(tt[A-Za-z0-9]+)/;t.g.wp.shareTarget.registerShareHandler({handle:async({title:t,link:o,attachment:c})=>{if(c)return!1;let s=o&&o.match(r);if(!s&&(s=t&&t.match(r),!s))return!1;const a=(0,i.select)("core/editor").getEditedPostAttribute("meta");(0,i.dispatch)("core/editor").editPost({meta:{...a,imdb_id:s[1]}});const n=(0,i.select)("core/block-editor").getBlocks(),d=n?.find((t=>"movie-log/movie"===t.name))?.clientId;if(d){const t=(0,i.select)("core/block-editor").getBlockAttributes(d)||{};(0,i.dispatch)("core/block-editor").updateBlockAttributes(d,{...t,imdbId:s[1]})}else(0,i.dispatch)("core/block-editor").insertBlocks([(0,e.createBlock)("movie-log/movie",{imdbId:s[1]})]);return!0},priority:5})}})();