'use strict';

const db = require('../database');

module.exports = function (Topics) {
	Topics.markAsSolved = async function (tid) {
		db.setObjectField(`topic:${tid}`, 'solved', 1);
	};

	Topics.markAsUnsolve = async function (tid) {
		db.setObjectField(`topic:${tid}`, 'solved', 0);
	};
};
