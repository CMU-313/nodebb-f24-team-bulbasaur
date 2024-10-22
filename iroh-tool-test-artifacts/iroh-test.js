const Iroh = require('iroh');
let code = `
	const groupsPerPage = 10;

`;

let stage = new Iroh.Stage(code);
let listener = stage.addListener(Iroh.VAR);
// logs variable name and value after creation
listener.on("after", (e) => {
  console.log(e.name, "=>", e.value); 
});

eval(stage.script);