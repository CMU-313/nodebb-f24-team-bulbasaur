'use strict';

const Iroh = require('iroh');

const code = `
	const groupsPerPage = 10;

`;

const stage = new Iroh.Stage(code);
const listener = stage.addListener(Iroh.VAR);
// logs variable name and value after creation
listener.on('after', (e) => {
	console.log(e.name, '=>', e.value);
});

eval(stage.script);
