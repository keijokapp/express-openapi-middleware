const OpenAPIRequestValidator = require('openapi-request-validator').default;


/**
 * OpenAPI request validation error
 */
class OpenAPIValidationError extends Error {
	constructor(errors, status = 400) {
		super();
		this.name = 'OpenAPIValidationError';
		this.message = 'OpenAPIValidationError: Invalid data found';
		this.errors = errors;
		this.status = status;
	}
}


/**
 * Transforms regular expression generated
 * by 'path-to-regexp' to OpenAPI-compatible path
 * @param regexp {RegExp} regular expression to be transformed
 * @param keys {string[]} placeholders generated by 'path-to-regexp'
 * @returns {string} OpenaPI-compatible path
 */
function regexpToPath(regexp, keys = []) {

	// cut off '^'
	regexp = regexp.source.slice(1);

	// unescape some characters
	regexp = regexp.replace(/\\([./])/g, '$1');

	// determine and cut off ending
	if(regexp.endsWith('/?$')) {
		regexp = regexp.slice(0, -3);
	} else if(regexp.endsWith('/?(?=/|$)')) {
		regexp = regexp.slice(0, -9);
	} else {
		throw new Error('Bad input: Cannot determine ending');
	}

//	if(!regexp) {
//		return '/';
//	}

	let scanIndex = 0;
	let captureIndex = 0;
	const components = [];

	while(scanIndex < regexp.length) {
		if(regexp.startsWith('/(?:([^/]+?))', scanIndex)) {
			scanIndex += 13;
			if(!(captureIndex in keys)) {
				throw new Error('Bad input: Unexpected capture group at position ' + scanIndex);
			}
			// TODO: optional and repeated parameters
			components.push('/{' + keys[captureIndex++].name + '}');
		} else if(regexp.startsWith('/', scanIndex)) {
			let nextSlash = regexp.indexOf('/', scanIndex + 1);
			if(nextSlash === -1) {
				components.push(regexp.slice(scanIndex));
				break;
			} else {
				components.push(regexp.slice(scanIndex, nextSlash));
				scanIndex = nextSlash;
			}
		} else {
			throw new Error('Bad input: Unexpected character "' + regexp[scanIndex] + '" at position ' + scanIndex);
		}
	}

	return components.join('');
}


/**
 * Creates middleware representing
 * OpenAPI operation
 * @param operation {object} OpenAPI operation object
 * @returns {function} Middleware function
 */
function apiOperation(operation) {

	const op = {
		parameters: operation.parameters !== undefined ? operation.parameters : [],
		requestBody: operation.requestBody
	};

	const validator = new OpenAPIRequestValidator(op);

	const middleware = function(req, res, next) {

		req.apiOperation = operation;

		const error = validator.validateRequest(req);

		if(error) {
			next(new OpenAPIValidationError(error.errors, error.status));
		} else {
			next();
		}

	};
	middleware.apiOperation = operation;

	return middleware;
}


/**
 * Merges two operation objects
 * @param spec {object}
 * @param moreSpec {object}
 * @returns {object}
 */
function mergeOperationObjects(spec, moreSpec) {
	const mergedSpec = Object.assign({}, spec, moreSpec);

	if('tags' in moreSpec) {
		mergedSpec.tags = 'tags' in spec
			? spec.tags.concat(moreSpec.tags)
			: moreSpec.tags;
	}

	if('parameters' in moreSpec) {
		mergedSpec.parameters = 'parameters' in spec
			? spec.parameters.concat(moreSpec.parameters)
			: moreSpec.parameters;
	}

	if('responses' in moreSpec) {
		mergedSpec.responses = Object.assign({}, spec.responses, moreSpec.responses);
	}

	return mergedSpec;
}


/**
 * Traverses through all layers in router
 * @param router {Router} Express-compatible router
 * @param out {object?} paths object to be filled with API operation objects
 * @param routePrefix {string?} route prefix of scanned router without trailing slash
 * @param apiOperations {object?} map of "path" to "list of active middlewares" on this path
 * @return {object} paths object
 */
function createPaths(router, out = {}, routePrefix = '', apiOperations = {}) {
	for(const layer of router.stack) {
		let path;
		try {
			path = routePrefix + regexpToPath(layer.regexp, layer.keys);
		} catch(e) {
			// ignored silently
			continue;
		}

		if(layer.route) {

			let operation = {};

			for(const i in apiOperations) {
				if(path === i || path.startsWith(i + '/')) {
					for(const m of apiOperations[i]) {
						operation = mergeOperationObjects(operation, m.apiOperation);
					}
				}
			}

			for(const routeLayer of layer.route.stack) {
				if('apiOperation' in routeLayer.handle) {
					if(!(path in out)) {
						out[path] = {};
					}

					if(!(routeLayer.method in out[path])) {
						out[path][routeLayer.method] = mergeOperationObjects(operation, routeLayer.handle.apiOperation);
					}
				}
			}

		} else if(layer.name === 'router') {
			createPaths(layer.handle, out, path, apiOperations);
		} else {
			if('apiOperation' in layer.handle) {
				if(!(path in apiOperations)) {
					apiOperations[path] = [];
				}

				apiOperations[path].push(layer.handle);
			}
		}
	}

	return out;
}


module.exports = {
	apiOperation,
	createPaths,
	OpenAPIValidationError
};
