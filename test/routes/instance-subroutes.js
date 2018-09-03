const { Router } = require('express');
const { apiOperation } = require('../../index');


const routes = module.exports = new Router;


routes.get('/', apiOperation({
	tags: ['Instance'],
	summary: 'Fetch instance',
	parameters: [{
		in: 'query',
		name: 'ip',
		description: 'Request machine IP-s',
		schema: {
			type: 'string',
			enum: [ 'true', 'false' ]
		}
	}],
	responses: {
		200: {
			description: 'Instance'
		},
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
}), (req, res, next) => {
	let instance = req.instance;
	if(!instance) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
	} else {
		res.send(req.instance);
	}
});


routes.get('/machine/:machine', apiOperation({
	tags: ['Instance'],
	summary: 'Fetch instance machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Instance machine ID',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Instance E-Tag',
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'query',
		name: 'ip',
		description: 'Request machine IP-s',
		schema: {
			type: 'string',
			enum: [ 'true', 'false' ]
		}
	}],
	responses: {
		200: {
			description: 'Instance machine'
		},
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
				'application/json': {
					example: {
						error: 'Conflict',
						message: 'Revision mismatch'
					}
				}
			}
		}
	}
}), (req, res, next) => {
	if('ip' in req.query) {
		res.send({
			ip: req.query.ip
		});
	} else {
		res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
	}
});
