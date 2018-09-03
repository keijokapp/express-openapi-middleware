const express = require('express');
const { describe, it } = require('mocha');
const { expect } = require('chai');
const supertest = require('supertest');
const { createPaths } = require('../index');
const labSchema = require('./lab-schema');
const instanceRoutes = require('./routes/instance');
const labRoutes = require('./routes/lab');
const moreRoutes = require('./routes/more-routes');


/**
 * Create test app
 */

const app = express();
app.use(express.json());
const router = new express.Router();
router.use(moreRoutes);
router.use('/lab', labRoutes);
router.use('/instance', instanceRoutes);
app.use(router);
app.use(() => {
	throw new Error('Not found');
});
app.use((e, req, res, next) => {
	if(e.name === 'OpenAPIValidation') {
		res.status(400).send({
			error: 'Bad Request',
			validations: e.validations
		});
	} else {
		throw e;
	}
});

/**
 * Tests
 */


const request = supertest(app);


describe('validation', () => {
	it('should fail with missing required header', async () => {
		const res = await request.put('/lab/mina').expect(400);
		expect(res.body).to.deep.equal({
			error: 'Bad Request',
			validations: [{
				parameter: {
					description: 'Lab E-Tag',
					in: 'header',
					name: 'if-match',
					required: true,
					schema: {
						minLength: 1,
						type: 'string'
					}
				},
				validation: 'missing'
			}]
		});
	});

	it('should fail with bad optional header', async () => {
		const res = await request.delete('/lab/mina/instance/aaa')
			.set('if-match', '')
			.expect(400);
		expect(res.body).to.deep.equal({
			error: 'Bad Request',
			validations: [{
				parameter: {
					description: 'Instance E-Tag',
					in: 'header',
					name: 'if-match',
					schema: {
						minLength: 1,
						type: 'string'
					}
				},
				validation: {
					errors: [{
						argument: 1,
						message: 'does not meet minimum length of 1',
						name: 'minLength',
						property: 'if-match',
						schema: {
							minLength: 1,
							type: 'string'
						},
						stack: 'if-match does not meet minimum length of 1'
					}],
					instance: '',
					propertyPath: 'if-match',
					schema: {
						minLength: 1,
						type: 'string'
					}
				}
			}]
		});
	});

	it('should succeed with missing optional header', async () => {
		const res = await request.delete('/lab/mina/instance/aaaa').expect(200);
		expect(res.body).to.deep.equal({
			lab: 'mina',
			username: 'aaaa'
		});
	});

	it('should fail with bad query parameter', async () => {
		const res = await request.get('/lab/mina/instance/aaaa/machine/blah?ip=koer').expect(400);
		expect(res.body).to.deep.equal({
			error: 'Bad Request',
			validations: [{
				parameter: {
					description: 'Request machine IP-s',
					in: 'query',
					name: 'ip',
					schema: {
						type: 'string',
						enum: ['true', 'false']
					}
				},
				validation: {
					errors: [{
						argument: ['true', 'false'],
						instance: 'koer',
						message: 'is not one of enum values: true,false',
						name: 'enum',
						property: 'ip',
						schema: {
							type: 'string',
							enum: ['true', 'false']
						},
						stack: 'ip is not one of enum values: true,false'
					}],
					instance: 'koer',
					propertyPath: 'ip',
					schema: {
						type: 'string',
						enum: ['true', 'false']
					}
				}
			}]
		});
	});

	it('should succeed with missing optional query parameter and then fail with 409', async () => {
		const res = await request.get('/lab/mina/instance/aaaa/machine/blah').expect(409);
		expect(res.body).to.deep.equal({
			error: 'Conflict',
			message: 'Revision mismatch'
		});
	});

	it('should succeed with query parameter', async () => {
		const res = await request.get('/lab/mina/instance/aaaa/machine/blah?ip=true').expect(200);
		expect(res.body).to.deep.equal({
			ip: 'true'
		});
	});

	it('should fail with missing body', async () => {
		const res = await request.put('/lab/mina').expect(400);
		expect(res.body).to.deep.equal({
			error: 'Bad Request',
			validations: [{
				parameter: {
					description: 'Lab E-Tag',
					in: 'header',
					name: 'if-match',
					required: true,
					schema: {
						minLength: 1,
						type: 'string'
					}
				},
				validation: 'missing'
			}]
		});
	});

	it('should succeed with missing optional body', async () => {
		const res = await request.post('/lab/mina/instance/aaaa').expect(410);
		expect(res.body).to.deep.equal({
			error: 'Gone',
			message: 'Requested lab revision is not available'
		});
	});

	it('should fail with bad optional body', async () => {
		const res = await request.post('/lab/mina/instance/aaa').send({
			lab: ''
		}).expect(400);
		expect(res.body.validations).to.be.an('array');
		expect(res.body.validations.length).to.equal(1);
		expect(res.body).to.deep.equal({
			error: 'Bad Request',
			validations: [{
				parameter: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									lab: labSchema
								},
								additionalProperties: false
							}
						}
					}
				},
				validation: {
					errors: [{
						argument: ['object'],
						message: 'is not of a type(s) object',
						name: 'type',
						property: 'body.lab',
						schema: labSchema,
						'stack': 'body.lab is not of a type(s) object'
					}],
					instance: { 'lab': '' },
					propertyPath: 'body',
					schema: {
						additionalProperties: false,
						properties: {
							lab: labSchema
						},
						type: 'object'
					}
				}
			}]
		});
	});
});


describe('spec generation', () => {
	it('should generate correct paths object', () => {
		const paths = createPaths(router);
		expect(paths).to.deep.equal({
			'/': {
				get: {
					responses: {
						200: {
							description: 'OK'
						}
					},
					summary: 'Root route',
					tags: ['More routes']
				}
			},
			'/.#$-\\$': {
				get: {
					summary: 'Route with special characters',
					tags: ['More routes']
				}
			},
			'/lab': {
				get: {
					tags: ['Lab'],
					summary: 'List labs',
					responses: {
						200: {
							description: 'List of labs',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: labSchema
									}
								}
							}
						}
					}
				}
			},
			'/lab/{lab}': {
				post: {
					tags: ['Lab'],
					summary: 'Update lab',
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: {
							type: 'string',
							minLength: 1
						}
					}],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: labSchema
							}
						}
					},
					responses: {
						200: {
							headers: {
								etag: {
									description: 'Lab E-Tag',
									schema: labSchema.properties._rev
								}
							},
							content: {
								'application/json': {
									schema: labSchema
								}
							}
						},
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Lab does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': {
									example: {
										error: 'Conflict',
										message: 'Revision mismatch'
									}
								}
							}
						}
					}
				},
				put: {
					tags: ['Lab'],
					summary: 'Update lab',
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'header',
						name: 'if-match',
						description: 'Lab E-Tag',
						required: true,
						schema: {
							type: 'string',
							minLength: 1
						}
					}],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: labSchema
							}
						}
					},
					responses: {
						200: {
							headers: { etag: { description: 'Lab E-Tag', schema: { type: 'string' } } },
							content: {
								'application/json': {
									schema: labSchema
								}
							}
						},
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Lab does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': {
									example: {
										error: 'Conflict',
										message: 'Revision mismatch'
									}
								}
							}
						}
					}
				},
				get: {
					tags: ['Lab'],
					summary: 'Fetch lab',
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
					}],
					responses: {
						200: {
							headers: { etag: { description: 'Lab E-Tag', schema: { type: 'string' } } },
							content: {
								'application/json': {
									schema: labSchema
								}
							}
						},
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not found',
										message: 'Lab does not exist'
									}
								}
							}
						}
					}
				}
			},
			'/lab/{lab}/instance/{username}': {
				post: {
					tags: ['Instance'],
					summary: 'Start lab',
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
					}, {
						in: 'path',
						name: 'username',
						description: 'Username',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'header',
						name: 'if-match',
						description: 'Lab E-Tag',
						schema: { type: 'string' }
					}],
					requestBody: {
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										lab: labSchema
									},
									additionalProperties: false
								}
							}
						}
					},
					responses: {
						200: { description: 'Instance' },
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not found',
										message: 'Lab does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': {
									example: {
										error: 'Conflict',
										message: 'Instance already exists'
									}
								}
							}
						},
						410: {
							content: {
								'application/json': {
									example: {
										error: 'Gone',
										message: 'Requested lab revision is not available'
									}
								}
							}
						},
						412: {
							content: {
								'application/json': {
									example: {
										error: 'Precondition Failed',
										message: 'Requested lab is in invalid state',
										errors: []
									}
								}
							}
						}
					}
				},
				get: {
					tags: ['Instance', 'Instance'],
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'path',
						name: 'username',
						description: 'Username',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'query',
						name: 'ip',
						description: 'Request machine IP-s',
						schema: { type: 'string', enum: ['true', 'false'] }
					}],
					summary: 'Fetch instance',
					responses: {
						200: { description: 'Instance' },
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Instance does not exist'
									}
								}
							}
						}
					}
				},
				delete: {
					tags: ['Instance'],
					summary: 'End lab',
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'path',
						name: 'username',
						description: 'Username',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'header',
						name: 'if-match',
						description: 'Instance E-Tag',
						schema: {
							type: 'string',
							minLength: 1
						}
					}],
					responses: {
						200: {
							description: 'Lab has been ended'
						},
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not found',
										message: 'Instance does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': {
									example: {
										error: 'Conflict',
										message: 'Revision mismatch'
									}
								}
							}
						}
					}
				}
			},
			'/lab/{lab}/instance/{username}/machine/{machine}': {
				get: {
					tags: ['Instance', 'Instance'],
					parameters: [{
						in: 'path',
						name: 'lab',
						description: 'Lab name',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'path',
						name: 'username',
						description: 'Username',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'path',
						name: 'machine',
						description: 'Instance machine ID',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'header',
						name: 'if-match',
						description: 'Instance E-Tag',
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'query',
						name: 'ip',
						description: 'Request machine IP-s',
						schema: { type: 'string', enum: ['true', 'false'] }
					}],
					summary: 'Fetch instance machine',
					responses: {
						200: { description: 'Instance machine' },
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Instance machine does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': { example: { error: 'Conflict', message: 'Revision mismatch' } }
							}
						}
					}
				}
			},
			'/instance/{token}': {
				get: {
					parameters: [{
						in: 'path',
						name: 'token',
						description: 'Public or private token of instance',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'query',
						name: 'ip',
						description: 'Request machine IP-s',
						schema: { type: 'string', enum: ['true', 'false'] }
					}],
					tags: ['Instance'],
					summary: 'Fetch instance',
					responses: {
						200: { description: 'Instance' },
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Instance does not exist'
									}
								}
							}
						}
					}
				}
			},
			'/instance/{token}/machine/{machine}': {
				get: {
					parameters: [{
						in: 'path',
						name: 'token',
						description: 'Public or private token of instance',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'path',
						name: 'machine',
						description: 'Instance machine ID',
						required: true,
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'header',
						name: 'if-match',
						description: 'Instance E-Tag',
						schema: { type: 'string', minLength: 1 }
					}, {
						in: 'query',
						name: 'ip',
						description: 'Request machine IP-s',
						schema: { type: 'string', enum: ['true', 'false'] }
					}],
					tags: ['Instance'],
					summary: 'Fetch instance machine',
					responses: {
						200: { description: 'Instance machine' },
						404: {
							content: {
								'application/json': {
									example: {
										error: 'Not Found',
										message: 'Instance machine does not exist'
									}
								}
							}
						},
						409: {
							content: {
								'application/json': { example: { error: 'Conflict', message: 'Revision mismatch' } }
							}
						}
					}
				}
			}
		});
	});
});
