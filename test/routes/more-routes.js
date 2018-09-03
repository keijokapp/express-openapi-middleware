const { Router } = require('express');
const { apiOperation } = require('../../index');


const router = module.exports = new Router();

router.get('/', apiOperation({
	tags: [ 'More routes' ],
	summary: 'Root route',
	responses: {
		200: {
			description: 'OK'
		}
	}
}), (req, res, next) => {
	res.send();
});


router.get('/.#$-\\$', apiOperation({
	tags: [ 'More routes' ],
	summary: 'Route with special characters'
	//responses: {}
}), (req, res, next) => {
	res.send();
});
