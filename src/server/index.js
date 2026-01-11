import express from 'express';
import mustacheExpress from './templates.js';
import { middleware as authMiddleware } from './auth.js';
import state, {getInfoCheck} from './statefs.js';
import { ValidationError, NotFoundError } from '../classes/state.js';
import { startup as websocketStartup } from './websocket.js';

const app = express();
app.auth = authMiddleware;
const port = process.env.PORT
if (!port) throw 'Environment Variable PORT not set';

app.engine('mustache', mustacheExpress);
app.set('view engine', 'mustache');
app.set('views', `./templates`);
app.use(express.json());

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

// Let resources bypass authentication, so service worker can update in the background
app.use(express.static('./resources', {extensions: ['json']}));

app.use((req, res, next) => app.auth(req, res, next));

app.get('/', (req, res) => {
	res.redirect("/todo/");
});

// Endpoint that's purely for authentication purposes (which won't be handled by the service worker)
app.get('/login', (req, res) => {

	// Check the redirect query to avoid open redirect vulnerabilities
	if (!req.query.redirect_path?.startsWith("/")) {
		throw new ValidationError("Invalid redirect_path parameter");
	}
	res.redirect(req.query.redirect_path);
});
state.getListTypes().forEach(listType => {
	const typeSlug = listType.slug;
	app.get(`/${listType.slug}`, catchErrors(async (req, res) => {
		res.render("page", await state.getListsByType(listType.slug));
	}));
	app.get(`/${listType.slug}/:slug`, catchErrors(async (req, res) => {
		res.redirect("/list/"+encodeURI(req.params.slug));
	}));
});
app.get('/list', (req, res) => {
	res.redirect("/todo/");
});
app.get('/list/:slug', catchErrors(async (req, res) => {
	res.render("page", await state.getList(req.params.slug));
}));
app.get('/todo.json', catchErrors(async (req, res) => {
	res.json(await state.getRawData());
}));
app.put('/api/list/:slug', catchErrors(async (req, res) => {
	await state.setList(req.params.slug, req.body, false);
	app.websocket.send({
		method: req.method,
		path: req.url,
		body: req.body,
	})
	res.status(204).send();
}));
app.put('/api/item/:uuid', catchErrors(async (req, res) => {
	await state.setItem(req.params.uuid, req.body, false);
	app.websocket.send({
		method: req.method,
		path: req.url,
		body: req.body,
	})
	res.status(204).send();
}));
app.delete('/api/list/:slug', catchErrors(async (req, res) => {
	await state.deleteList(req.params.slug, true);
	app.websocket.send({
		method: req.method,
		path: req.url,
		body: req.body,
	})
	res.status(204).send();
}));
app.delete('/api/item/:uuid', catchErrors(async (req, res) => {
	await state.deleteItem(req.params.uuid, true);
	app.websocket.send({
		method: req.method,
		path: req.url,
		body: req.body,
	})
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
		res.render("page", {message: error.message, pagetype: "error", name: error.name});
	}
});

const server = app.listen(port, function () {
	console.log('App listening on port ' + port);
});


websocketStartup(server, app);