const { describe, it } = require('mocha');
const { expect } = require('chai');
const express = require('express');
const supertest = require('supertest');
const { createPaths, apiOperation } = require('./index');


/**
 * Create test app
 */

const app = express();
app.use(express.json());

/**
 * Validation test routes
 */

app.use('/nonroute/:something', apiOperation({
	parameters: [{
		in: 'path',
		name: 'something',
		required: true
	}]
}), (req, res, next) => {
	res.send();
});

app.get('/with-path-parameter/:something', apiOperation({
	parameters: [{
		in: 'path',
		name: 'something',
		schema: {
			type: 'string',
			minLength: 3
		}
	}]
}), (req, res) => {
	res.send();
});

app.get('/with-required-header', apiOperation({
	parameters: [{
		in: 'header',
		name: 'x-something',
		required: true,
		schema: {
			type: 'string',
			minLength: 3
		}
	}]
}), (req, res) => {
	res.send();
});

app.get('/with-optional-header', apiOperation({
	parameters: [{
		in: 'header',
		name: 'x-something',
		schema: {
			type: 'string',
			minLength: 3
		}
	}]
}), (req, res) => {
	res.send();
});

app.get('/with-required-query-parameter', apiOperation({
	parameters: [{
		in: 'query',
		name: 'something',
		required: true,
		schema: {
			type: 'string',
			minLength: 3
		}
	}]
}), (req, res) => {
	res.send();
});

app.get('/with-optional-query-parameter', apiOperation({
	parameters: [{
		in: 'query',
		name: 'something',
		schema: {
			type: 'string',
			minLength: 3
		}
	}]
}), (req, res) => {
	res.send();
});

app.put('/with-body', apiOperation({
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						something: { type: 'string', minLength: 3 }
					},
					required: ['something']
				}
			}
		}
	}
}), (req, res) => {
	res.send();
});

/**
 * Nested routes
 */

const nestedRoutes = new express.Router();
nestedRoutes.get('/nested-route/:something_else', apiOperation({
	tags: ['Nested route'],
	summary: 'Nested route',
	parameters: [{
		in: 'path',
		name: 'something_else',
		required: true,
		schema: { type: 'string', minLength: 3 }
	}],
	responses: {
		418: {
			description: 'Dummy response'
		}
	}
}), (req, res, next) => {
	res.send();
});

app.use('/nested-root/:something', apiOperation({
	tags: ['Nested root'],
	summary: 'Nested root',
	parameters: [{
		in: 'path',
		name: 'something',
		required: true,
		schema: { type: 'string', minLength: 3 }
	}],
	responses: {
		410: {
			description: 'Dummy response'
		}
	}
}), nestedRoutes);

/**
 * Special routes
 */

app.get('/.#$-\\$', apiOperation({
	tags: ['Special'],
	summary: 'Route with special characters'
}), (req, res, next) => {
	res.send();
});


/**
 * Chaining operations
 */

app.use('/chained-operation/something/', apiOperation({
	tags: ['Chained operation 0']
}));

app.use('/chained-operation/something', apiOperation({
	tags: ['Chained operation 1']
}));

app.use('/chained-operation/something/something_else', apiOperation({
	tags: ['Chained operation 2']
}));

app.use('/chained-operation/', express.Router()
	.use('/something', apiOperation({
		tags: ['Chained operation 3']
	})));

app.use('/chained-operation/', apiOperation({
	tags: ['Chained operation 4']
}));

app.get('/chained-operation/something', apiOperation({
	description: 'Chained operation'
}));


/**
 * Boilerplate error handlers
 */

app.use((req, res, next) => {
	res.status(404).send();
});

app.use((e, req, res, next) => {
	if(e.name === 'OpenAPIValidation') {
		res.status(400).send(e.validations);
	} else {
		throw e;
	}
});


/**
 * Tests
 */

const request = supertest(app);


describe('validation', () => {

	describe('path parameters', () => {

		it('should succeed with good path parameter', async () => {
			const res = await request.get('/with-path-parameter/abcdef').expect(200);
		});

		it('should fail with bad path parameter', async () => {
			const res = await request.get('/with-path-parameter/ab').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'path',
				message: 'should NOT be shorter than 3 characters',
				path: 'something'
			}]);
		});

	});

	describe('headers', () => {

		it('should succeed with good header', async () => {
			const res = await request.get('/with-required-header').set('x-something', 'abcdef').expect(200);
		});

		it('should fail with missing required header', async () => {
			const res = await request.get('/with-required-header').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'required.openapi.validation',
				location: 'headers',
				message: 'should have required property \'x-something\'',
				path: 'x-something'
			}]);
		});

		it('should fail with bad optional header', async () => {
			const res = await request.get('/with-optional-header').set('x-something', '').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'headers',
				message: 'should NOT be shorter than 3 characters',
				path: '[\'x-something\']'
			}]);
		});

		it('should succeed with missing optional header', async () => {
			const res = await request.get('/with-optional-header').expect(200);
		});

	});


	describe('query parameters', () => {

		it('should succeed with good query parameter', async () => {
			const res = await request.get('/with-optional-query-parameter?something=123456').expect(200);
		});

		it('should fail with missing required query parameter', async () => {
			const res = await request.get('/with-required-query-parameter').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'required.openapi.validation',
				location: 'query',
				message: 'should have required property \'something\'',
				path: 'something'
			}]);
		});

		it('should fail with bad optional query parameter', async () => {
			const res = await request.get('/with-optional-query-parameter?something=a').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'query',
				message: 'should NOT be shorter than 3 characters',
				path: 'something'
			}]);
		});

		it('should succeed with missing optional query parameter', async () => {
			const res = await request.get('/with-optional-query-parameter').expect(200);
		});

	});


	describe('body', () => {

		it('should succeed with good body', async () => {
			const res = await request.put('/with-body').send({ something: 'abcdef' }).expect(200);
		});

		it('should fail with bad body', async () => {
			const res = await request.put('/with-body').send({ something: 'a' }).expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'body',
				message: 'should NOT be shorter than 3 characters',
				path: 'something'
			}]);
		});

	});

	describe('nested routes', () => {

		it('should succeed with good parameters', async () => {
			const res = await request.get('/nested-root/abcdef/nested-route/ghijklm').expect(200);
		});

		it('should fail at first middleware', async () => {
			const res = await request.get('/nested-root/ab/nested-route/ghijklm').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'path',
				message: 'should NOT be shorter than 3 characters',
				path: 'something'
			}]);
		});

		it('should fail at second middleware', async () => {
			const res = await request.get('/nested-root/abcdef/nested-route/g').expect(400);
			expect(res.body).to.deep.equal([{
				errorCode: 'minLength.openapi.validation',
				location: 'path',
				message: 'should NOT be shorter than 3 characters',
				path: 'something_else'
			}]);
		});

	});
});


describe('spec generation', () => {

	it('should generate correct paths object', () => {
		const paths = createPaths(app._router);
		expect(paths).to.deep.equal({
			'/with-path-parameter/{something}': {
				get: {
					parameters: [{
						in: 'path',
						name: 'something',
						schema: { type: 'string', minLength: 3 }
					}]
				}
			},
			'/with-required-header': {
				get: {
					parameters: [{
						in: 'header',
						name: 'x-something',
						required: true,
						schema: { type: 'string', minLength: 3 }
					}]
				}
			},
			'/with-optional-header': {
				get: {
					parameters: [{
						in: 'header',
						name: 'x-something',
						schema: { type: 'string', minLength: 3 }
					}]
				}
			},
			'/with-required-query-parameter': {
				get: {
					parameters: [{
						in: 'query',
						name: 'something',
						required: true,
						schema: { type: 'string', minLength: 3 }
					}]
				}
			},
			'/with-optional-query-parameter': {
				get: {
					parameters: [{
						in: 'query',
						name: 'something',
						schema: { type: 'string', minLength: 3 }
					}]
				}
			},
			'/with-body': {
				put: {
					requestBody: {
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										something: { type: 'string', minLength: 3 }
									},
									required: ['something']
								}
							}
						}
					}
				}
			},
			'/nested-root/{something}/nested-route/{something_else}': {
				get: {
					tags: ['Nested root', 'Nested route'],
					summary: 'Nested route',
					parameters: [{
						in: 'path',
						name: 'something',
						required: true,
						schema: { type: 'string', minLength: 3 }
					}, {
						in: 'path',
						name: 'something_else',
						required: true,
						schema: { type: 'string', minLength: 3 }
					}],
					responses: {
						'410': { description: 'Dummy response' },
						'418': { description: 'Dummy response' }
					}
				}
			},
			'/.#$-\\$': {
				get: {
					tags: ['Special'],
					summary: 'Route with special characters'
				}
			},
			'/chained-operation/something': {
				get: {
					description: 'Chained operation',
					tags: ['Chained operation 0', 'Chained operation 1', 'Chained operation 3', 'Chained operation 4']
				}
			}
		});
	});

});
