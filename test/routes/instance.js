const { Router } = require('express');
const { apiOperation } = require('../../index');
const instanceSubroutes = require( './instance-subroutes');


const routes = module.exports = new Router;


routes.use('/:token', apiOperation({
	parameters: [{
		in: 'path',
		name: 'token',
		description: 'Public or private token of instance',
		required: true,
		schema: {
			'type': 'string',
			'minLength': 1
		}
	}]
}), (req, res, next) => {
	req.instance = {
		_id: 'instance/e3b0c44298fc1c149afbf4c8996fb92427ae:b934ca495991b7852b',
		privateToken: req.params.token
	};
	req.instanceToken = req.params.token;
});


routes.use('/:token', instanceSubroutes);
