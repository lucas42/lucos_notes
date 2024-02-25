import express from 'express';
import mustacheExpress from 'mustache-express';
import { middleware as authMiddleware } from './auth.js';
import state, {getInfoCheck} from './statefs.js';
import { ValidationError, NotFoundError } from '../classes/state.js';

const app = express();
app.auth = authMiddleware;
const port = process.env.PORT || 8004;

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', `./templates`);

// Avoid authentication for _info, so call before invoking auth middleware
app.get('/_info', catchErrors(async (req, res) => {
	res.json({
		system: 'lucos_notes',
		checks: {
			"data-file": await getInfoCheck(),
		},
		metrics: {},
		ci: {
			circle: "gh/lucas42/lucos_notes",
		},
		start_url: '/todo/',
		icon: '/icon.png',
		network_only: false,
		title: "Todo List",
		show_on_homepage: true,
	});
}));


app.use((req, res, next) => app.auth(req, res, next));
app.use(express.json());
app.use(express.static('./resources', {extensions: ['json']}));


app.get('/', (req, res) => {
	res.redirect("/todo/");
});
app.get('/todo', catchErrors(async (req, res) => {
	res.render("index", await state.getLists());
}));
app.get('/todo/:slug', catchErrors(async (req, res) => {
	res.render("list", await state.getList(req.params.slug));
}));
app.get('/todo.json', catchErrors(async (req, res) => {
	res.json(await state.getRawData());
}));
app.put('/api/list/:slug', catchErrors(async (req, res) => {
	await state.setList(req.params.slug, req.body);
	res.status(204).send();
}));
app.put('/api/item/:uuid', catchErrors(async (req, res) => {
	await state.setItem(req.params.uuid, req.body);
	res.status(204).send();
}));
app.delete('/api/list/:slug', catchErrors(async (req, res) => {
	await state.deleteList(req.params.slug, true);
	res.status(204).send();
}));
app.delete('/api/item/:uuid', catchErrors(async (req, res) => {
	await state.deleteItem(req.params.uuid, true);
	res.status(204).send();
}));

app.use('/templates', express.static('./templates', {extensions: ['mustache']}));


// Wrapper for controllor async functions which catches errors and sends them on to express' error handling
function catchErrors(controllerFunc) {
	return ((req, res, next) => {
		controllerFunc(req, res).catch(error => next(error));
	});
}

// Error Handler
app.use((error, req, res, next) => {

	// Set the status based on the type of error
	if (error instanceof ValidationError) {
		res.status(400);
	} else if(error instanceof NotFoundError) {
		res.status(404);
	} else {
		res.status(500);
		console.error(error.stack);
	}

	// For paths of machine-readable endpoints, return JSON
	if (req.path.startsWith("/api") || req.path == '/_info') {
		res.json({errorMessage: error.message});
	} else {
		res.render("error", {message: error.message});
	}
});

app.listen(port, function () {
	console.log('App listening on port ' + port);
});