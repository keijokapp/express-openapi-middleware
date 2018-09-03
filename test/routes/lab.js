const { Router } = require('express');
const { apiOperation } = require('../../index');
const labSchema = require('../lab-schema');
const instanceSubroutes = require('./instance-subroutes');


const routes = module.exports = new Router;


routes.get('/', apiOperation({
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
}), (req, res, next) => {
	res.send([]);
});


routes.post('/:lab', apiOperation({
	tags: [ 'Lab' ],
	summary: 'Update lab',
	parameters: [{
		in: 'path',
		name: "lab",
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
}), (req, res, next) => {
	const lab = Object.assign({}, req.body, {
		_id: req.params.lab,
		_rev: '1-rev'
	});

	res.set('etag', lab._rev);
	res.send(lab);
});


routes.put('/:lab', apiOperation({
	tags: [ 'Lab' ],
	summary: 'Update lab',
	parameters: [{
		in: 'path',
		name: "lab",
		description: 'Lab name',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
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
}), (req, res, next) => {
	const lab = Object.assign({}, req.body, {
		_id: req.params.lab,
		_rev: '1-rev'
	});

	res.set('etag', lab._rev);
	res.send(lab);
});


routes.get('/:lab', apiOperation({
	tags: ['Lab'],
	summary: 'Fetch lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}],
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
						error: 'Not found',
						message: 'Lab does not exist'
					}
				}
			}
		}
	}
}), (req, res, next) => {
	res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
});


routes.post('/:lab/instance/:username', apiOperation({
	tags: ['Instance'],
	summary: 'Start lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Lab E-Tag',
		schema: labSchema.properties._rev
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
		200: {
			description: 'Instance'
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
}), (req, res, next) => {
	res.status(410).send(req.apiOperation.responses[410].content['application/json'].example);
});


routes.use('/:lab/instance/:username', apiOperation({
	tags: ['Instance'],
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}]
}), (req, res, next) => {
	req.instance = {
		lab: {
			_id: req.params.lab
		},
		username: req.params.username
	};

	req.instanceToken = 'koer';
	next();
});


routes.delete('/:lab/instance/:username', apiOperation({
	summary: 'End lab',
	parameters: [{
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
}), (req, res, next) => {
	res.send({
		lab: req.params.lab,
		username: req.params.username,
		etag: req.headers['if-match']
	});
});


routes.use('/:lab/instance/:username', instanceSubroutes);
